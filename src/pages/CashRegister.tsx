import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet,
  Plus, 
  X,
  Loader,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  useOpenRegister,
  useCashRegisters,
  useTodayCashSales,
  useTodayTotalSales,
  useOpenCashRegister,
  useCloseCashRegister,
  useUpdateCashRegister,
  useTodaySalesByMethod,
  useTodayCreditReceipts,
  useTodayServicesTotal
} from '@/hooks/useCashRegister';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed date-fns format import - using direct date string formatting to avoid timezone issues

// Esquemas de validación
const openRegisterSchema = z.object({
  montoInicial: z.number().min(0, 'El monto inicial debe ser mayor o igual a 0'),
});

const closeRegisterSchema = z.object({
  efectivoReal: z.number().min(0, 'El efectivo real debe ser mayor o igual a 0'),
  observacion: z.string().optional(),
});

const editRegisterSchema = z.object({
  montoInicial: z.number().min(0, 'El monto inicial debe ser mayor o igual a 0'),
  efectivoReal: z.union([
    z.number().min(0, 'El efectivo real debe ser mayor o igual a 0'),
    z.null()
  ]),
  observacion: z.string().optional(),
  horaApertura: z.string().optional(),
  horaCierre: z.string().optional().nullable(),
});

type OpenRegisterForm = z.infer<typeof openRegisterSchema>;
type CloseRegisterForm = z.infer<typeof closeRegisterSchema>;
type EditRegisterForm = z.infer<typeof editRegisterSchema>;

export default function CashRegister() {
  const { user } = useAuth();
  const { data: openRegister, isLoading: loadingOpen } = useOpenRegister();
  const { data: registers = [], isLoading: loadingRegisters } = useCashRegisters();
  const { data: todayCashSales = 0 } = useTodayCashSales();
  const { data: todayTotalSales = 0 } = useTodayTotalSales();
  const { data: salesByMethod = { efectivo: 0, qr: 0, transferencia: 0, credito: 0 }, isLoading: loadingByMethod } = useTodaySalesByMethod();
  const { data: creditReceipts = 0, isLoading: loadingCreditReceipts } = useTodayCreditReceipts();
  const { data: servicesTotal = 0, isLoading: loadingServicesTotal } = useTodayServicesTotal();
  const totalVentasHoy = (salesByMethod?.efectivo || 0) + (salesByMethod?.qr || 0) + (salesByMethod?.transferencia || 0) + (creditReceipts || 0) + (servicesTotal || 0);
  
  const openRegisterMutation = useOpenCashRegister();
  const closeRegisterMutation = useCloseCashRegister();
  const updateRegisterMutation = useUpdateCashRegister();

  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<typeof registers[0] | null>(null);
  const [closingRegisterFromHistory, setClosingRegisterFromHistory] = useState<typeof registers[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const openForm = useForm<OpenRegisterForm>({
    resolver: zodResolver(openRegisterSchema),
    defaultValues: {
      montoInicial: 0,
    },
  });

  const closeForm = useForm<CloseRegisterForm>({
    resolver: zodResolver(closeRegisterSchema),
    defaultValues: {
      efectivoReal: 0,
      observacion: '',
    },
  });

  const editForm = useForm<EditRegisterForm>({
    resolver: zodResolver(editRegisterSchema),
    defaultValues: {
      montoInicial: 0,
      efectivoReal: null,
      observacion: '',
      horaApertura: '',
      horaCierre: null,
    },
  });

  const handleOpenRegister = async (data: OpenRegisterForm) => {
    if (!user || user.rol !== 'admin') {
      toast.error('Solo los administradores pueden abrir caja');
      return;
    }

    try {
      await openRegisterMutation.mutateAsync({
        montoInicial: data.montoInicial,
        idAdministrador: user.id,
      });
      toast.success('Caja abierta exitosamente');
      setIsOpenDialogOpen(false);
      openForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al abrir caja');
    }
  };

  const handleCloseRegister = async (data: CloseRegisterForm) => {
    // Usar el arqueo del historial si se está cerrando desde ahí, sino usar el arqueo abierto actual
    const registerToClose = closingRegisterFromHistory || openRegister;
    
    if (!registerToClose) return;
    if (!user || user.rol !== 'admin') {
      toast.error('Solo los administradores pueden cerrar caja');
      return;
    }

    try {
      await closeRegisterMutation.mutateAsync({
        id: registerToClose.id,
        efectivoReal: data.efectivoReal,
        observacion: data.observacion || undefined,
      });
      toast.success('Caja cerrada exitosamente');
      setIsCloseDialogOpen(false);
      setClosingRegisterFromHistory(null);
      closeForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al cerrar caja');
    }
  };

  const handleCloseRegisterFromHistory = (register: typeof registers[0]) => {
    setClosingRegisterFromHistory(register);
    // Si el arqueo es del día actual y está abierto, usar el total dinámico
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isOpenToday = register.estado === 'abierto' && register.fecha === today;
    const totalVentasToUse = isOpenToday ? totalVentasHoy : register.total_ventas;
    const totalEsperado = register.monto_inicial + totalVentasToUse;
    closeForm.reset({
      efectivoReal: totalEsperado,
      observacion: '',
    });
    setIsCloseDialogOpen(true);
  };

  const totalEsperado = openRegister 
    ? openRegister.monto_inicial + totalVentasHoy 
    : 0;

  const diferencia = openRegister && openRegister.efectivo_real !== null
    ? openRegister.diferencia
    : 0;

  // Paginación para historial de arqueos
  const totalPages = Math.ceil(registers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRegisters = registers.slice(startIndex, endIndex);

  // Resetear página cuando cambien los registros
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [registers.length, currentPage, totalPages]);

  const handleEditRegister = (register: typeof registers[0]) => {
    setEditingRegister(register);
    editForm.reset({
      montoInicial: register.monto_inicial,
      efectivoReal: register.efectivo_real ?? null,
      observacion: register.observacion || '',
      horaApertura: register.hora_apertura,
      horaCierre: register.hora_cierre || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRegister = async (data: EditRegisterForm) => {
    if (!editingRegister) return;
    if (!user || user.rol !== 'admin') {
      toast.error('Solo los administradores pueden editar arqueos');
      return;
    }

    try {
      await updateRegisterMutation.mutateAsync({
        id: editingRegister.id,
        updates: {
          monto_inicial: data.montoInicial,
          efectivo_real: data.efectivoReal,
          observacion: data.observacion || null,
          hora_apertura: data.horaApertura,
          hora_cierre: data.horaCierre,
        },
      });
      toast.success('Arqueo actualizado exitosamente');
      setIsEditDialogOpen(false);
      setEditingRegister(null);
      editForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar arqueo');
    }
  };

  return (
    <DashboardLayout title="Arqueo de Caja">
      <div className="space-y-4 sm:space-y-6">
        {/* Estado Actual de Caja */}
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Estado de Caja
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {openRegister 
                  ? `Caja abierta desde las ${openRegister.hora_apertura}` 
                  : 'Caja cerrada'}
              </p>
            </div>
            {user?.rol === 'admin' && (
              <div className="flex gap-2">
                {!openRegister ? (
                  <Button 
                    onClick={() => setIsOpenDialogOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Abrir Caja</span>
                    <span className="sm:hidden">Abrir</span>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      closeForm.reset({
                        efectivoReal: totalEsperado,
                        observacion: '',
                      });
                      setIsCloseDialogOpen(true);
                    }}
                    variant="destructive"
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Cerrar Caja</span>
                    <span className="sm:hidden">Cerrar</span>
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingOpen ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : openRegister ? (
              <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Monto Inicial</p>
                        <p className="font-display text-xl sm:text-2xl font-bold">Bs. {openRegister.monto_inicial.toFixed(2)}</p>
                      </div>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Ventas</p>
                        <p className="font-display text-xl sm:text-2xl font-bold">Bs. {totalVentasHoy.toFixed(2)}</p>
                      </div>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Efectivo Esperado</p>
                        <p className="font-display text-xl sm:text-2xl font-bold">Bs. {totalEsperado.toFixed(2)}</p>
                      </div>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={diferencia >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}>
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Diferencia</p>
                        <p className={`font-display text-xl sm:text-2xl font-bold ${diferencia >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {diferencia >= 0 ? '+' : '-'}Bs. {Math.abs(diferencia).toFixed(2)}
                        </p>
                      </div>
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center shrink-0 ${diferencia >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {diferencia >= 0 ? (
                          <TrendingUp className={`h-5 w-5 sm:h-6 sm:w-6 ${diferencia >= 0 ? 'text-success' : 'text-destructive'}`} />
                        ) : (
                          <TrendingDown className={`h-5 w-5 sm:h-6 sm:w-6 ${diferencia >= 0 ? 'text-success' : 'text-destructive'}`} />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Ventas por método */}
              <Card className="mt-4">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Ventas por método (hoy)</p>
                      <p className="font-display text-lg sm:text-xl font-semibold">Desglose del día</p>
                    </div>
                  </div>
                  {loadingByMethod || loadingCreditReceipts || loadingServicesTotal ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Efectivo</p>
                        <p className="text-lg font-semibold">Bs. {salesByMethod.efectivo.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">QR</p>
                        <p className="text-lg font-semibold">Bs. {salesByMethod.qr.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Transferencia</p>
                        <p className="text-lg font-semibold">Bs. {salesByMethod.transferencia.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Crédito (ingresos)</p>
                        <p className="text-lg font-semibold">Bs. {creditReceipts.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Servicios</p>
                        <p className={`text-lg font-semibold ${servicesTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {servicesTotal >= 0 ? '+' : ''}Bs. {servicesTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay caja abierta</p>
                {user?.rol === 'admin' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Haz clic en "Abrir Caja" para comenzar
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Arqueos */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Historial de Arqueos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRegisters ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : registers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay arqueos registrados
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <div className="min-w-[500px]">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora Apertura</TableHead>
                      <TableHead>Hora Cierre</TableHead>
                      <TableHead>Monto Inicial</TableHead>
                      <TableHead>Total Ventas</TableHead>
                      <TableHead>Efectivo Real</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                      {user?.rol === 'admin' && <TableHead>Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRegisters.map((register) => {
                      // Si el arqueo está abierto y es del día actual, calcular dinámicamente el total
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const isOpenToday = register.estado === 'abierto' && register.fecha === today;
                      const totalVentasDisplay = isOpenToday ? totalVentasHoy : register.total_ventas;
                      const totalEsperadoReg = register.monto_inicial + totalVentasDisplay;
                      return (
                        <TableRow key={register.id}>
                          <TableCell className="font-medium">
                            {(() => {
                              // Formatear fecha directamente desde YYYY-MM-DD sin conversión a Date
                              // para evitar problemas de zona horaria
                              const [year, month, day] = register.fecha.split('-');
                              return `${day}/${month}/${year}`;
                            })()}
                          </TableCell>
                          <TableCell>{register.hora_apertura}</TableCell>
                          <TableCell>{register.hora_cierre || '-'}</TableCell>
                          <TableCell>Bs. {register.monto_inicial.toFixed(2)}</TableCell>
                          <TableCell>Bs. {totalVentasDisplay.toFixed(2)}</TableCell>
                          <TableCell>
                            {register.efectivo_real !== null 
                              ? `Bs. ${register.efectivo_real.toFixed(2)}` 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {register.efectivo_real !== null ? (
                              <span className={register.diferencia >= 0 ? 'text-success' : 'text-destructive'}>
                                {register.diferencia >= 0 ? '+' : '-'}Bs. {Math.abs(register.diferencia).toFixed(2)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={register.estado === 'abierto' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {register.estado === 'abierto' ? (
                                <><Clock className="mr-1 h-3 w-3" /> Abierto</>
                              ) : (
                                <><CheckCircle className="mr-1 h-3 w-3" /> Cerrado</>
                              )}
                            </Badge>
                          </TableCell>
                          {user?.rol === 'admin' && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {register.estado === 'abierto' && (
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleCloseRegisterFromHistory(register)}
                                    title="Cerrar caja"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditRegister(register)}
                                  title="Editar arqueo"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
            {registers.length > itemsPerPage && (
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

        {/* Open Register Dialog */}
        <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Abrir Caja</DialogTitle>
              <DialogDescription>
                Ingresa el monto inicial de la caja para comenzar el día
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={openForm.handleSubmit(handleOpenRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="montoInicial">Monto Inicial (Bs.) *</Label>
                <Input
                  id="montoInicial"
                  type="number"
                  step="0.01"
                  min="0"
                  {...openForm.register('montoInicial', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {openForm.formState.errors.montoInicial && (
                  <p className="text-sm text-destructive">
                    {openForm.formState.errors.montoInicial.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpenDialogOpen(false);
                    openForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={openRegisterMutation.isPending}>
                  {openRegisterMutation.isPending && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Abrir Caja
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Close Register Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={(open) => {
          setIsCloseDialogOpen(open);
          if (!open) {
            setClosingRegisterFromHistory(null);
            closeForm.reset();
          }
        }}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cerrar Caja</DialogTitle>
              <DialogDescription>
                {closingRegisterFromHistory 
                  ? (() => {
                      const [year, month, day] = closingRegisterFromHistory.fecha.split('-');
                      return `Cerrando caja del ${day}/${month}/${year}. Ingresa el efectivo real encontrado y calcula la diferencia.`;
                    })()
                  : 'Ingresa el efectivo real encontrado en caja y calcula la diferencia'}
              </DialogDescription>
            </DialogHeader>
            {(closingRegisterFromHistory || openRegister) && (() => {
              const registerToShow = closingRegisterFromHistory || openRegister;
              // Si el arqueo es del día actual y está abierto, usar el total dinámico
              const now = new Date();
              const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const isOpenToday = registerToShow && registerToShow.estado === 'abierto' && registerToShow.fecha === today;
              const totalVentasShow = isOpenToday ? totalVentasHoy : (registerToShow?.total_ventas || 0);
              const totalEsperadoShow = registerToShow ? registerToShow.monto_inicial + totalVentasShow : 0;
              return (
                <div className="space-y-4 mb-4 p-4 bg-muted/50 rounded-lg">
                  {closingRegisterFromHistory && (() => {
                      const [year, month, day] = closingRegisterFromHistory.fecha.split('-');
                      return (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Fecha:</span>
                          <span className="font-medium">{`${day}/${month}/${year}`}</span>
                        </div>
                      );
                    })()}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monto Inicial:</span>
                    <span className="font-medium">Bs. {registerToShow.monto_inicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Ventas:</span>
                    <span className="font-medium">Bs. {totalVentasShow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Efectivo Esperado:</span>
                    <span className="font-bold">Bs. {totalEsperadoShow.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
            <form onSubmit={closeForm.handleSubmit(handleCloseRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="efectivoReal">Efectivo Real (Bs.) *</Label>
                <Input
                  id="efectivoReal"
                  type="number"
                  step="0.01"
                  min="0"
                  {...closeForm.register('efectivoReal', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {closeForm.formState.errors.efectivoReal && (
                  <p className="text-sm text-destructive">
                    {closeForm.formState.errors.efectivoReal.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacion">Observación</Label>
                <Textarea
                  id="observacion"
                  {...closeForm.register('observacion')}
                  placeholder="Observaciones sobre el arqueo (opcional)"
                  rows={3}
                />
              </div>
              {closeForm.watch('efectivoReal') !== undefined && (closingRegisterFromHistory || openRegister) && (() => {
                const registerToCalc = closingRegisterFromHistory || openRegister;
                // Si el arqueo es del día actual y está abierto, usar el total dinámico
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isOpenTodayCalc = registerToCalc && registerToCalc.estado === 'abierto' && registerToCalc.fecha === today;
                const totalVentasCalc = isOpenTodayCalc ? totalVentasHoy : (registerToCalc?.total_ventas || 0);
                const totalEsperadoCalc = registerToCalc ? registerToCalc.monto_inicial + totalVentasCalc : 0;
                return (
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Diferencia:</span>
                      <span className={`font-bold text-lg ${
                        (closeForm.watch('efectivoReal') - totalEsperadoCalc) >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {(closeForm.watch('efectivoReal') - totalEsperadoCalc) >= 0 ? '+' : '-'}
                        Bs. {Math.abs(closeForm.watch('efectivoReal') - totalEsperadoCalc).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCloseDialogOpen(false);
                    setClosingRegisterFromHistory(null);
                    closeForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={closeRegisterMutation.isPending}>
                  {closeRegisterMutation.isPending && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cerrar Caja
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Register Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Arqueo</DialogTitle>
              <DialogDescription>
                Modifica los datos del arqueo de caja
              </DialogDescription>
            </DialogHeader>
            {editingRegister && (() => {
                const [year, month, day] = editingRegister.fecha.split('-');
                // Si el arqueo es del día actual y está abierto, usar el total dinámico
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isOpenTodayEdit = editingRegister.estado === 'abierto' && editingRegister.fecha === today;
                const totalVentasEdit = isOpenTodayEdit ? totalVentasHoy : editingRegister.total_ventas;
                return (
                  <div className="space-y-4 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fecha:</span>
                      <span className="font-medium">{`${day}/${month}/${year}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Ventas:</span>
                      <span className="font-medium">Bs. {totalVentasEdit.toFixed(2)}</span>
                    </div>
                    {editingRegister.efectivo_real !== null && (
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium">Total Esperado:</span>
                        <span className="font-bold">Bs. {(editingRegister.monto_inicial + totalVentasEdit).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            <form onSubmit={editForm.handleSubmit(handleUpdateRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="montoInicial">Monto Inicial (Bs.) *</Label>
                <Input
                  id="montoInicial"
                  type="number"
                  step="0.01"
                  min="0"
                  {...editForm.register('montoInicial', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {editForm.formState.errors.montoInicial && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.montoInicial.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaApertura">Hora Apertura (HH:mm)</Label>
                <Input
                  id="horaApertura"
                  type="text"
                  {...editForm.register('horaApertura')}
                  placeholder="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="efectivoReal">Efectivo Real (Bs.)</Label>
                <Input
                  id="efectivoReal"
                  type="number"
                  step="0.01"
                  min="0"
                  {...editForm.register('efectivoReal', { 
                    valueAsNumber: true,
                    setValueAs: (v) => v === '' ? null : Number(v)
                  })}
                  placeholder="0.00"
                />
                {editForm.formState.errors.efectivoReal && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.efectivoReal.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaCierre">Hora Cierre (HH:mm)</Label>
                <Input
                  id="horaCierre"
                  type="text"
                  {...editForm.register('horaCierre')}
                  placeholder="18:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacionEdit">Observación</Label>
                <Textarea
                  id="observacionEdit"
                  {...editForm.register('observacion')}
                  placeholder="Observaciones sobre el arqueo (opcional)"
                  rows={3}
                />
              </div>
              {editingRegister && editForm.watch('efectivoReal') !== null && editForm.watch('efectivoReal') !== undefined && (() => {
                // Si el arqueo es del día actual y está abierto, usar el total dinámico
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isOpenTodayEditCalc = editingRegister.estado === 'abierto' && editingRegister.fecha === today;
                const totalVentasEditCalc = isOpenTodayEditCalc ? totalVentasHoy : editingRegister.total_ventas;
                const diferenciaEdit = (editForm.watch('efectivoReal') ?? 0) - (editForm.watch('montoInicial') + totalVentasEditCalc);
                return (
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Diferencia:</span>
                      <span className={`font-bold text-lg ${
                        diferenciaEdit >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {diferenciaEdit >= 0 ? '+' : '-'}
                        Bs. {Math.abs(diferenciaEdit).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRegister(null);
                    editForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRegisterMutation.isPending}>
                  {updateRegisterMutation.isPending && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

