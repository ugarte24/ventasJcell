import { useState, useEffect, useMemo } from 'react';
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
  Package,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { arqueosMayoristasService } from '@/services/arqueos-mayoristas.service';
import { ventasMayoristasService } from '@/services/ventas-mayoristas.service';
import { getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/services/products.service';
import { Product } from '@/types';

// Esquemas de validación
const crearArqueoSchema = z.object({
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fechaFin: z.string().min(1, 'La fecha de fin es requerida'),
});

const cerrarArqueoSchema = z.object({
  efectivoRecibido: z.number().min(0, 'El efectivo recibido debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});

type CrearArqueoForm = z.infer<typeof crearArqueoSchema>;
type CerrarArqueoForm = z.infer<typeof cerrarArqueoSchema>;

export default function ArqueosMayoristas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCrearDialog, setShowCrearDialog] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<string | null>(null);
  const [productos, setProductos] = useState<Product[]>([]);

  const crearForm = useForm<CrearArqueoForm>({
    resolver: zodResolver(crearArqueoSchema),
    defaultValues: {
      fechaInicio: getLocalDateISO(),
      fechaFin: getLocalDateISO(),
    },
  });

  const cerrarForm = useForm<CerrarArqueoForm>({
    resolver: zodResolver(cerrarArqueoSchema),
    defaultValues: {
      efectivoRecibido: 0,
      observaciones: '',
    },
  });

  // Cargar productos
  useEffect(() => {
    const loadProductos = async () => {
      try {
        const prods = await productsService.getAll();
        setProductos(prods);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    loadProductos();
  }, []);

  // Obtener arqueo abierto
  const { data: arqueoAbierto, isLoading: loadingArqueoAbierto } = useQuery({
    queryKey: ['arqueo-mayorista-abierto', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'mayorista') return null;
      return await arqueosMayoristasService.getArqueoAbierto(user.id);
    },
    enabled: !!user && user.rol === 'mayorista',
  });

  // Obtener último arqueo cerrado (para saldos arrastrados)
  const { data: ultimoArqueoCerrado } = useQuery({
    queryKey: ['ultimo-arqueo-mayorista-cerrado', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'mayorista') return null;
      return await arqueosMayoristasService.getUltimoArqueoCerrado(user.id);
    },
    enabled: !!user && user.rol === 'mayorista',
  });

  // Obtener ventas del período si hay arqueo abierto
  const { data: ventasDelPeriodo = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas-mayorista-periodo', user?.id, arqueoAbierto?.fecha_inicio, arqueoAbierto?.fecha_fin],
    queryFn: async () => {
      if (!user || user.rol !== 'mayorista' || !arqueoAbierto) return [];
      return await ventasMayoristasService.getVentasDelPeriodo(
        user.id,
        arqueoAbierto.fecha_inicio,
        arqueoAbierto.fecha_fin
      );
    },
    enabled: !!user && user.rol === 'mayorista' && !!arqueoAbierto,
  });

  // Calcular total de ventas del período
  const totalVentasDelPeriodo = useMemo(() => {
    return ventasDelPeriodo.reduce((sum, venta) => sum + (venta.cantidad_vendida * venta.precio_por_mayor), 0);
  }, [ventasDelPeriodo]);

  // Obtener historial de arqueos
  const { data: arqueos = [], isLoading: loadingArqueos } = useQuery({
    queryKey: ['arqueos-mayorista', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'mayorista') return [];
      return await arqueosMayoristasService.getAll({ id_mayorista: user.id });
    },
    enabled: !!user && user.rol === 'mayorista',
  });

  // Crear arqueo
  const createArqueoMutation = useMutation({
    mutationFn: async (data: CrearArqueoForm) => {
      if (!user || user.rol !== 'mayorista') throw new Error('No autorizado');
      
      const hora = getLocalTimeISO();
      
      // Calcular saldos restantes desde el último arqueo cerrado o desde preregistros
      const saldosRestantes: Array<{ id_producto: string; cantidad_restante: number }> = [];
      
      // Si hay último arqueo cerrado, usar sus saldos restantes
      if (ultimoArqueoCerrado && ultimoArqueoCerrado.saldos_restantes.length > 0) {
        saldosRestantes.push(...ultimoArqueoCerrado.saldos_restantes);
      } else {
        // Si no hay arqueo anterior, obtener desde preregistros
        const { preregistrosService } = await import('@/services/preregistros.service');
        const preregistros = await preregistrosService.getPreregistrosMayorista(user.id, data.fechaInicio);
        
        preregistros.forEach(preregistro => {
          saldosRestantes.push({
            id_producto: preregistro.id_producto,
            cantidad_restante: preregistro.cantidad,
          });
        });
      }
      
      // Sumar aumentos del período
      const aumentosDelPeriodo = await ventasMayoristasService.getAumentosDelPeriodo(
        user.id,
        data.fechaInicio,
        data.fechaFin
      );
      
      const aumentosPorProducto = new Map<string, number>();
      aumentosDelPeriodo.forEach(aumento => {
        const actual = aumentosPorProducto.get(aumento.id_producto) || 0;
        aumentosPorProducto.set(aumento.id_producto, actual + aumento.cantidad_aumento);
      });
      
      // Actualizar saldos restantes con aumentos
      saldosRestantes.forEach(saldo => {
        const aumento = aumentosPorProducto.get(saldo.id_producto) || 0;
        saldo.cantidad_restante += aumento;
      });
      
      // Agregar productos nuevos que solo tienen aumentos
      aumentosPorProducto.forEach((aumento, idProducto) => {
        if (!saldosRestantes.find(s => s.id_producto === idProducto)) {
          saldosRestantes.push({ id_producto: idProducto, cantidad_restante: aumento });
        }
      });
      
      // Restar ventas del período
      const ventasPorProducto = new Map<string, number>();
      ventasDelPeriodo.forEach(venta => {
        const actual = ventasPorProducto.get(venta.id_producto) || 0;
        ventasPorProducto.set(venta.id_producto, actual + venta.cantidad_vendida);
      });
      
      ventasPorProducto.forEach((vendida, idProducto) => {
        const saldo = saldosRestantes.find(s => s.id_producto === idProducto);
        if (saldo) {
          saldo.cantidad_restante = Math.max(0, saldo.cantidad_restante - vendida);
        }
      });
      
      // Filtrar saldos en 0
      const saldosFinales = saldosRestantes.filter(s => s.cantidad_restante > 0);
      
      return await arqueosMayoristasService.create({
        id_mayorista: user.id,
        fecha_inicio: data.fechaInicio,
        fecha_fin: data.fechaFin,
        hora_apertura: hora,
        ventas_del_periodo: totalVentasDelPeriodo,
        saldos_restantes: saldosFinales,
        efectivo_recibido: 0,
        estado: 'abierto',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arqueo-mayorista-abierto'] });
      queryClient.invalidateQueries({ queryKey: ['arqueos-mayorista'] });
      queryClient.invalidateQueries({ queryKey: ['ultimo-arqueo-mayorista-cerrado'] });
      setShowCrearDialog(false);
      crearForm.reset();
      toast.success('Arqueo creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear arqueo');
    },
  });

  // Cerrar arqueo
  const cerrarArqueoMutation = useMutation({
    mutationFn: async (data: CerrarArqueoForm) => {
      if (!arqueoSeleccionado) throw new Error('No hay arqueo seleccionado');
      return await arqueosMayoristasService.cerrar(arqueoSeleccionado, data.efectivoRecibido);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arqueo-mayorista-abierto'] });
      queryClient.invalidateQueries({ queryKey: ['arqueos-mayorista'] });
      queryClient.invalidateQueries({ queryKey: ['ultimo-arqueo-mayorista-cerrado'] });
      setShowCerrarDialog(false);
      setArqueoSeleccionado(null);
      cerrarForm.reset();
      toast.success('Arqueo cerrado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cerrar arqueo');
    },
  });

  const handleCrearArqueo = () => {
    crearForm.reset({
      fechaInicio: getLocalDateISO(),
      fechaFin: getLocalDateISO(),
    });
    setShowCrearDialog(true);
  };

  const handleCerrarArqueo = (arqueoId: string) => {
    setArqueoSeleccionado(arqueoId);
    const arqueo = arqueos.find(a => a.id === arqueoId);
    if (arqueo) {
      cerrarForm.reset({
        efectivoRecibido: arqueo.ventas_del_periodo,
        observaciones: '',
      });
    }
    setShowCerrarDialog(true);
  };

  const onSubmitCrear = (data: CrearArqueoForm) => {
    if (new Date(data.fechaInicio) > new Date(data.fechaFin)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }
    createArqueoMutation.mutate(data);
  };

  const onSubmitCerrar = (data: CerrarArqueoForm) => {
    cerrarArqueoMutation.mutate(data);
  };

  // Verificar autorización
  if (!user || user.rol !== 'mayorista') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Solo mayoristas pueden acceder a esta página</p>
        </div>
      </DashboardLayout>
    );
  }

  const diferencia = arqueoAbierto 
    ? (cerrarForm.watch('efectivoRecibido') || 0) - arqueoAbierto.ventas_del_periodo
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Arqueos</h1>
          {!arqueoAbierto && (
            <Button onClick={handleCrearArqueo}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Arqueo
            </Button>
          )}
        </div>

        {/* Arqueo Abierto */}
        {loadingArqueoAbierto ? (
          <Skeleton className="h-64" />
        ) : arqueoAbierto ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Arqueo del {arqueoAbierto.fecha_inicio} al {arqueoAbierto.fecha_fin}
                </CardTitle>
                <Badge variant={arqueoAbierto.estado === 'abierto' ? 'default' : 'secondary'}>
                  {arqueoAbierto.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Ventas del Período</span>
                  </div>
                  <p className="text-2xl font-bold">Bs. {arqueoAbierto.ventas_del_periodo.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Hora Apertura</span>
                  </div>
                  <p className="text-2xl font-bold">{arqueoAbierto.hora_apertura || 'N/A'}</p>
                </div>
                {arqueoAbierto.estado === 'cerrado' && (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Hora Cierre</span>
                    </div>
                    <p className="text-2xl font-bold">{arqueoAbierto.hora_cierre || 'N/A'}</p>
                  </div>
                )}
              </div>

              {arqueoAbierto.saldos_restantes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Saldos Restantes (para arrastrar)</h3>
                  <div className="space-y-2">
                    {arqueoAbierto.saldos_restantes.map((saldo, index) => {
                      const producto = productos.find(p => p.id === saldo.id_producto);
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{producto?.nombre || 'Producto desconocido'}</span>
                          <Badge variant="outline">{saldo.cantidad_restante}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {arqueoAbierto.estado === 'abierto' && (
                <Button
                  onClick={() => handleCerrarArqueo(arqueoAbierto.id)}
                  className="w-full"
                >
                  Cerrar Arqueo
                </Button>
              )}

              {arqueoAbierto.estado === 'cerrado' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Efectivo Recibido</span>
                    </div>
                    <p className="text-2xl font-bold">Bs. {arqueoAbierto.efectivo_recibido.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${arqueoAbierto.diferencia >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {arqueoAbierto.diferencia >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">Diferencia</span>
                    </div>
                    <p className={`text-2xl font-bold ${arqueoAbierto.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {arqueoAbierto.diferencia >= 0 ? '+' : ''}Bs. {arqueoAbierto.diferencia.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No hay arqueo abierto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Crea un nuevo arqueo para registrar las ventas del período.
              </p>
              <Button
                onClick={handleCrearArqueo}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Arqueo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historial de Arqueos */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Arqueos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArqueos ? (
              <Skeleton className="h-64" />
            ) : arqueos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay arqueos registrados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Efectivo Recibido</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arqueos.map((arqueo) => (
                    <TableRow key={arqueo.id}>
                      <TableCell>
                        {arqueo.fecha_inicio} - {arqueo.fecha_fin}
                      </TableCell>
                      <TableCell>Bs. {arqueo.ventas_del_periodo.toFixed(2)}</TableCell>
                      <TableCell>
                        {arqueo.estado === 'cerrado' ? `Bs. ${arqueo.efectivo_recibido.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {arqueo.estado === 'cerrado' ? (
                          <span className={arqueo.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {arqueo.diferencia >= 0 ? '+' : ''}Bs. {arqueo.diferencia.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={arqueo.estado === 'abierto' ? 'default' : 'secondary'}>
                          {arqueo.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {arqueo.estado === 'abierto' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCerrarArqueo(arqueo.id)}
                          >
                            Cerrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog para crear arqueo */}
        <Dialog open={showCrearDialog} onOpenChange={setShowCrearDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Arqueo</DialogTitle>
              <DialogDescription>
                Define el período para el nuevo arqueo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={crearForm.handleSubmit(onSubmitCrear)} className="space-y-4">
              <div>
                <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  {...crearForm.register('fechaInicio')}
                />
                {crearForm.formState.errors.fechaInicio && (
                  <p className="text-sm text-destructive mt-1">
                    {crearForm.formState.errors.fechaInicio.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha de Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  {...crearForm.register('fechaFin')}
                />
                {crearForm.formState.errors.fechaFin && (
                  <p className="text-sm text-destructive mt-1">
                    {crearForm.formState.errors.fechaFin.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCrearDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createArqueoMutation.isPending}>
                  {createArqueoMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Arqueo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para cerrar arqueo */}
        <Dialog open={showCerrarDialog} onOpenChange={setShowCerrarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerrar Arqueo</DialogTitle>
              <DialogDescription>
                Ingresa el efectivo recibido para cerrar el arqueo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={cerrarForm.handleSubmit(onSubmitCerrar)} className="space-y-4">
              <div>
                <Label htmlFor="efectivoRecibido">Efectivo Recibido (Bs.)</Label>
                <Input
                  id="efectivoRecibido"
                  type="number"
                  step="0.01"
                  min="0"
                  {...cerrarForm.register('efectivoRecibido', { valueAsNumber: true })}
                />
                {cerrarForm.formState.errors.efectivoRecibido && (
                  <p className="text-sm text-destructive mt-1">
                    {cerrarForm.formState.errors.efectivoRecibido.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                <Textarea
                  id="observaciones"
                  {...cerrarForm.register('observaciones')}
                  rows={3}
                />
              </div>
              {arqueoAbierto && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Diferencia:</span>
                    <span className={`font-bold text-lg ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diferencia >= 0 ? '+' : ''}Bs. {Math.abs(diferencia).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCerrarDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={cerrarArqueoMutation.isPending}>
                  {cerrarArqueoMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Cerrando...
                    </>
                  ) : (
                    'Cerrar Arqueo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
