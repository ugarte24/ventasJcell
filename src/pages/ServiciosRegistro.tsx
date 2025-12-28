import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit
} from 'lucide-react';
import { useServicios } from '@/hooks/useServicios';
import { 
  useRegistrosServicios,
  useRegistroServicioPorFecha,
  useCreateRegistroServicio,
  useUpdateRegistroServicio,
  useMovimientosServicios,
  useCreateMovimientoServicio,
  useUpdateMovimientoServicio
} from '@/hooks/useServicios';
import { useAuth } from '@/contexts';
import { Servicio, RegistroServicio, MovimientoServicio } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { toast } from 'sonner';

// Esquemas de validación
const registroSchema = z.object({
  saldo_inicial: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number({
      required_error: 'El saldo inicial es requerido',
      invalid_type_error: 'El saldo inicial debe ser un número válido',
    }).min(0, 'El saldo inicial no puede ser negativo')
  ),
  saldo_final: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number({
      required_error: 'El saldo final es requerido',
      invalid_type_error: 'El saldo final debe ser un número válido',
    }).min(0, 'El saldo final no puede ser negativo')
  ),
  monto_aumentado: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number({
      required_error: 'El monto aumentado es requerido',
      invalid_type_error: 'El monto aumentado debe ser un número válido',
    }).min(0, 'El monto aumentado no puede ser negativo')
  ).optional(),
  observacion: z.string().optional(),
});

const aumentarSaldoSchema = z.object({
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  observacion: z.string().optional(),
});

type RegistroForm = z.infer<typeof registroSchema>;
type AumentarSaldoForm = z.infer<typeof aumentarSaldoSchema>;

export default function ServiciosRegistro() {
  const { user } = useAuth();
  const fechaHoy = getLocalDateISO();
  
  const [fecha, setFecha] = useState(fechaHoy);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [showRegistroDialog, setShowRegistroDialog] = useState(false);
  const [showAumentarDialog, setShowAumentarDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [editingMovimiento, setEditingMovimiento] = useState<string | null>(null);
  const [editMontoValue, setEditMontoValue] = useState<string>('');

  const { data: servicios, isLoading: loadingServicios } = useServicios();
  const { data: registros, isLoading: loadingRegistros } = useRegistrosServicios({
    fechaDesde: fecha,
    fechaHasta: fecha,
  });

  // Obtener movimientos del día para calcular monto aumentado
  const { data: movimientos, refetch: refetchMovimientos, isLoading: loadingMovimientos } = useMovimientosServicios({
    fechaDesde: fecha,
    fechaHasta: fecha,
  });

  const createRegistro = useCreateRegistroServicio();
  const updateRegistro = useUpdateRegistroServicio();
  const createMovimiento = useCreateMovimientoServicio();
  const updateMovimiento = useUpdateMovimientoServicio();

  const registroForm = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      saldo_inicial: 0,
      saldo_final: 0,
      observacion: '',
    },
  });

  const aumentarSaldoForm = useForm<AumentarSaldoForm>({
    resolver: zodResolver(aumentarSaldoSchema),
    defaultValues: {
      monto: 0,
      observacion: '',
    },
  });

  // Crear mapa de registros por servicio (para la fecha seleccionada)
  const registrosPorServicio = useMemo(() => {
    const map = new Map<string, RegistroServicio>();
    registros?.forEach(reg => {
      if (reg.fecha === fecha) {
        map.set(reg.id_servicio, reg);
      }
    });
    return map;
  }, [registros, fecha]);

  // Crear mapa de último saldo final por servicio (del último registro antes de la fecha seleccionada)
  const ultimoSaldoPorServicio = useMemo(() => {
    const map = new Map<string, number>();
    if (!registros) return map;
    
    // Agrupar registros por servicio y encontrar el más reciente antes de la fecha seleccionada
    const registrosPorServicio = new Map<string, RegistroServicio[]>();
    registros.forEach(reg => {
      if (!registrosPorServicio.has(reg.id_servicio)) {
        registrosPorServicio.set(reg.id_servicio, []);
      }
      registrosPorServicio.get(reg.id_servicio)!.push(reg);
    });
    
    // Para cada servicio, encontrar el registro más reciente antes de la fecha seleccionada
    registrosPorServicio.forEach((regs, idServicio) => {
      const registrosAntes = regs.filter(r => r.fecha < fecha);
      if (registrosAntes.length > 0) {
        const masReciente = registrosAntes.reduce((prev, curr) => 
          curr.fecha > prev.fecha ? curr : prev
        );
        map.set(idServicio, masReciente.saldo_final);
      }
    });
    
    return map;
  }, [registros, fecha]);

  // Crear mapa de movimientos por servicio (solo aumentos del día seleccionado)
  const movimientosPorServicio = useMemo(() => {
    const map = new Map<string, number>();
    movimientos?.forEach(mov => {
      // Solo contar movimientos de tipo 'aumento' y de la fecha seleccionada
      if (mov.tipo === 'aumento' && mov.fecha === fecha) {
        const actual = map.get(mov.id_servicio) || 0;
        map.set(mov.id_servicio, actual + mov.monto);
      }
    });
    return map;
  }, [movimientos, fecha]);

  // Paginación
  const totalPages = Math.ceil((servicios?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = servicios?.slice(startIndex, endIndex) || [];

  // Resetear página cuando cambien los servicios
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [servicios?.length, currentPage, totalPages]);

  const handleOpenRegistroDialog = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    
    // Buscar si ya existe un registro para esta fecha
    const registroExistente = registrosPorServicio.get(servicio.id);
    const montoAumentadoCalculado = movimientosPorServicio.get(servicio.id) || 0;
    
    if (registroExistente) {
      // Si existe, cargar los valores para editar
      // Usar la suma de todos los aumentos del día en lugar del valor del registro
      registroForm.reset({
        saldo_inicial: registroExistente.saldo_inicial,
        saldo_final: registroExistente.saldo_final,
        monto_aumentado: montoAumentadoCalculado, // Usar la suma de todos los aumentos
        observacion: registroExistente.observacion || '',
      });
    } else {
      // Si no existe, usar el último saldo final del servicio (o 0 si no hay registros anteriores)
      const ultimoSaldo = ultimoSaldoPorServicio.get(servicio.id) || 0;
      registroForm.reset({
        saldo_inicial: ultimoSaldo,
        saldo_final: ultimoSaldo,
        monto_aumentado: montoAumentadoCalculado,
        observacion: '',
      });
    }
    
    setShowRegistroDialog(true);
  };

  const handleSaveRegistro = async (data: RegistroForm) => {
    if (!selectedServicio || !user) return;

    try {
      const registroExistente = registrosPorServicio.get(selectedServicio.id);
      // Siempre usar la suma de todos los aumentos del día
      const montoAumentado = movimientosPorServicio.get(selectedServicio.id) || 0;

      if (registroExistente) {
        // Actualizar registro existente
        await updateRegistro.mutateAsync({
          id: registroExistente.id,
          updates: {
            saldo_inicial: data.saldo_inicial,
            saldo_final: data.saldo_final,
            monto_aumentado: montoAumentado,
            observacion: data.observacion || undefined,
          },
        });
      } else {
        // Crear nuevo registro
        await createRegistro.mutateAsync({
          id_servicio: selectedServicio.id,
          fecha: fecha,
          saldo_inicial: data.saldo_inicial,
          saldo_final: data.saldo_final,
          monto_aumentado: montoAumentado,
          id_usuario: user.id,
          observacion: data.observacion || undefined,
        });
      }

      setShowRegistroDialog(false);
      setSelectedServicio(null);
      registroForm.reset();
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };


  const handleAumentarSaldo = async (data: AumentarSaldoForm) => {
    if (!selectedServicio || !user) return;

    try {
      const horaActual = getLocalTimeISO();

      await createMovimiento.mutateAsync({
        id_servicio: selectedServicio.id,
        tipo: 'aumento',
        monto: data.monto,
        fecha: fecha, // Usar la fecha seleccionada en lugar de la fecha actual
        hora: horaActual,
        id_usuario: user.id,
        observacion: data.observacion || undefined,
      });

      // Esperar un momento para que el hook complete su invalidación
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forzar refetch de movimientos para actualizar la tabla inmediatamente
      await refetchMovimientos();

      setShowAumentarDialog(false);
      setSelectedServicio(null);
      aumentarSaldoForm.reset();
      setEditingMovimiento(null);
      setEditMontoValue('');
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  const handleOpenAumentarDialog = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    aumentarSaldoForm.reset({
      monto: 0,
      observacion: '',
    });
    setEditingMovimiento(null);
    setEditMontoValue('');
    setShowAumentarDialog(true);
  };

  // Filtrar movimientos del día para el servicio seleccionado
  const movimientosDelDia: MovimientoServicio[] = useMemo(() => {
    if (!selectedServicio || !movimientos || movimientos.length === 0) return [];
    return movimientos
      .filter(mov => mov.id_servicio === selectedServicio.id && mov.fecha === fecha && mov.tipo === 'aumento')
      .sort((a, b) => {
        // Ordenar por hora (más reciente primero)
        const horaA = a.hora.split(':').map(Number);
        const horaB = b.hora.split(':').map(Number);
        const tiempoA = horaA[0] * 60 + horaA[1];
        const tiempoB = horaB[0] * 60 + horaB[1];
        return tiempoB - tiempoA;
      });
  }, [movimientos, selectedServicio, fecha]);

  const handleEditMovimiento = (movimientoId: string, montoActual: number) => {
    setEditingMovimiento(movimientoId);
    setEditMontoValue(montoActual.toString());
  };

  const handleSaveEditMovimiento = async (movimientoId: string) => {
    const nuevoMonto = parseFloat(editMontoValue);
    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (!movimientoId) {
      toast.error('ID de movimiento no válido');
      return;
    }

    try {
      await updateMovimiento.mutateAsync({
        id: movimientoId,
        updates: { monto: nuevoMonto },
      });
      // El mensaje de éxito se muestra en el hook useUpdateMovimientoServicio
      // Cerrar el modo de edición inmediatamente después de guardar
      setEditingMovimiento(null);
      setEditMontoValue('');
      // Forzar refetch de movimientos para actualizar la tabla
      await refetchMovimientos();
      // Cerrar el diálogo de Aumentar Saldo
      setShowAumentarDialog(false);
      setSelectedServicio(null);
      aumentarSaldoForm.reset();
    } catch (error: any) {
      // Mostrar error más específico
      const errorMessage = error?.message || 'Error al actualizar el movimiento';
      if (errorMessage.includes('no encontrado') || errorMessage.includes('not found')) {
        toast.error('No se encontró el movimiento. Por favor, recarga la página e intenta nuevamente.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleCancelEditMovimiento = () => {
    setEditingMovimiento(null);
    setEditMontoValue('');
  };


  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout title="Registro de Servicios">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Registro Diario de Servicios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registra el saldo inicial y final de cada servicio por día
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-registro">Fecha</Label>
              <DatePicker
                id="fecha-registro"
                value={fecha}
                onChange={setFecha}
                max={fechaHoy}
              />
            </div>
          </div>
        </div>

        {/* Tabla de Servicios */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios - {formatDate(fecha)}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServicios || loadingRegistros ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !servicios || servicios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay servicios registrados
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Saldo Inicial</TableHead>
                      <TableHead className="text-right">Aumentado</TableHead>
                      <TableHead className="text-right">Saldo Final</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedServicios.map((servicio) => {
                      const registro = registrosPorServicio.get(servicio.id);
                      const montoAumentado = movimientosPorServicio.get(servicio.id) || 0;
                      const tieneRegistro = !!registro;

                      return (
                        <TableRow key={servicio.id}>
                          <TableCell className="font-medium">{servicio.nombre}</TableCell>
                          <TableCell className="text-right">
                            {registro ? (
                              <span className="font-semibold">
                                Bs. {registro.saldo_inicial.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              // Siempre usar el monto calculado desde los movimientos para mostrar el valor más actualizado
                              // El registro puede tener un monto_aumentado desactualizado si se acaba de crear un movimiento
                              const montoAumentadoMostrar = montoAumentado;
                              return montoAumentadoMostrar > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  +Bs. {montoAumentadoMostrar.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Bs. 0.00</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {registro ? (
                              <span className="font-semibold">
                                Bs. {registro.saldo_final.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {registro ? (
                              (() => {
                                // Calcular Total dinámicamente: saldo_inicial + monto_aumentado - saldo_final
                                // Siempre usar el monto calculado desde los movimientos para mostrar el valor más actualizado
                                const totalCalculado = registro.saldo_inicial + montoAumentado - registro.saldo_final;
                                return (
                                  <span className={totalCalculado >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {totalCalculado >= 0 ? '+' : ''}
                                    Bs. {totalCalculado.toFixed(2)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tieneRegistro ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Registrado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenAumentarDialog(servicio)}>
                                  <TrendingUp className="mr-2 h-4 w-4" />
                                  Aumentar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenRegistroDialog(servicio)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {tieneRegistro ? 'Editar' : 'Registrar'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {servicios && servicios.length > itemsPerPage && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => {
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Registrar/Editar */}
      <Dialog open={showRegistroDialog} onOpenChange={setShowRegistroDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {registrosPorServicio.get(selectedServicio?.id || '') ? 'Editar Registro' : 'Registrar Servicio'}
            </DialogTitle>
            <DialogDescription>
              {selectedServicio?.nombre} - {formatDate(fecha)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={registroForm.handleSubmit(handleSaveRegistro)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saldo_inicial">Saldo Inicial (Bs.) *</Label>
              <Input
                id="saldo_inicial"
                type="number"
                step="0.01"
                min="0"
                {...registroForm.register('saldo_inicial', { valueAsNumber: true })}
              />
              {registroForm.formState.errors.saldo_inicial && (
                <p className="text-sm text-destructive">
                  {registroForm.formState.errors.saldo_inicial.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto_aumentado">Aumentado (Bs.)</Label>
              <Input
                id="monto_aumentado"
                type="number"
                step="0.01"
                min="0"
                readOnly
                tabIndex={-1}
                onFocus={(e) => e.target.blur()}
                onClick={(e) => e.target.blur()}
                {...registroForm.register('monto_aumentado', { valueAsNumber: true })}
                className="bg-muted cursor-not-allowed focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                value={selectedServicio ? (movimientosPorServicio.get(selectedServicio.id) || 0) : 0}
              />
              {selectedServicio && (
                <p className="text-xs text-muted-foreground">
                  Suma de todos los aumentos del día: +Bs. {(movimientosPorServicio.get(selectedServicio.id) || 0).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="saldo_final">Saldo Final (Bs.) *</Label>
              <Input
                id="saldo_final"
                type="number"
                step="0.01"
                min="0"
                {...registroForm.register('saldo_final', { valueAsNumber: true })}
              />
              {registroForm.formState.errors.saldo_final && (
                <p className="text-sm text-destructive">
                  {registroForm.formState.errors.saldo_final.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion-registro">Observación</Label>
              <Textarea
                id="observacion-registro"
                {...registroForm.register('observacion')}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Resumen del día</p>
              <div className="space-y-1">
                {selectedServicio && (
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-semibold">
                      {(() => {
                        const saldoInicial = registroForm.watch('saldo_inicial');
                        const saldoFinal = registroForm.watch('saldo_final');
                        // Siempre usar la suma de todos los aumentos del día
                        const montoAumentado = movimientosPorServicio.get(selectedServicio.id) || 0;
                        const transaccionado = saldoInicial + montoAumentado - saldoFinal;
                        return (
                          <span className={transaccionado >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {transaccionado >= 0 ? '+' : ''}Bs. {transaccionado.toFixed(2)}
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRegistroDialog(false);
                  setSelectedServicio(null);
                  registroForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createRegistro.isPending || updateRegistro.isPending}
              >
                {(createRegistro.isPending || updateRegistro.isPending) && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Aumentar Saldo */}
      <Dialog open={showAumentarDialog} onOpenChange={setShowAumentarDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>Aumentar Saldo</DialogTitle>
            <DialogDescription>
              Aumentar saldo para: <strong>{selectedServicio?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={aumentarSaldoForm.handleSubmit(handleAumentarSaldo)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-6 pb-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="monto">Monto a Aumentar (Bs.) *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...aumentarSaldoForm.register('monto', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {aumentarSaldoForm.formState.errors.monto && (
                  <p className="text-sm text-destructive">
                    {aumentarSaldoForm.formState.errors.monto.message}
                  </p>
                )}
              </div>

              {/* Historial de Aumentos del Día */}
              {movimientosDelDia && movimientosDelDia.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Historial de Aumentos ({formatDate(fecha)})</Label>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Hora</TableHead>
                            <TableHead className="text-right w-[140px]">Monto</TableHead>
                            <TableHead className="min-w-[120px]">Observación</TableHead>
                            <TableHead className="text-center w-[80px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimientosDelDia.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell className="text-sm py-2">{mov.hora}</TableCell>
                              <TableCell className="text-right py-2">
                                {editingMovimiento === mov.id ? (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={editMontoValue}
                                      onChange={(e) => setEditMontoValue(e.target.value)}
                                      className="w-24 h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleSaveEditMovimiento(mov.id)}
                                      disabled={updateMovimiento.isPending}
                                      className="h-8 w-8 p-0 shrink-0"
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEditMovimiento}
                                      className="h-8 w-8 p-0 shrink-0"
                                    >
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-green-600 text-sm">
                                    +Bs. {mov.monto.toFixed(2)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground py-2 max-w-[200px] truncate">
                                {mov.observacion || '-'}
                              </TableCell>
                              <TableCell className="text-center py-2">
                                {editingMovimiento !== mov.id && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditMovimiento(mov.id, mov.monto)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="observacion-aumentar">Observación</Label>
                <Textarea
                  id="observacion-aumentar"
                  {...aumentarSaldoForm.register('observacion')}
                  placeholder="Ej: Recarga de Bs. 1000"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAumentarDialog(false);
                  setSelectedServicio(null);
                  aumentarSaldoForm.reset();
                  setEditingMovimiento(null);
                  setEditMontoValue('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovimiento.isPending}>
                {createMovimiento.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Aumentar Saldo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

