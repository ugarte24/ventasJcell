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
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { arqueosMinoristasService } from '@/services/arqueos-minoristas.service';
import { ventasMinoristasService } from '@/services/ventas-minoristas.service';
import { getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/services/products.service';
import { Product } from '@/types';

// Esquemas de validación
const cerrarArqueoSchema = z.object({
  efectivoRecibido: z.number().min(0, 'El efectivo recibido debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});

type CerrarArqueoForm = z.infer<typeof cerrarArqueoSchema>;

export default function ArqueosMinoristas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<string | null>(null);
  const [productos, setProductos] = useState<Product[]>([]);

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

  // Obtener arqueo abierto del día
  const { data: arqueoAbierto, isLoading: loadingArqueoAbierto } = useQuery({
    queryKey: ['arqueo-minorista-abierto', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return null;
      return await arqueosMinoristasService.getArqueoAbiertoDelDia(user.id);
    },
    enabled: !!user && user.rol === 'minorista',
  });

  // Obtener ventas del día
  const { data: ventasDelDia = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas-minorista-dia', user?.id, getLocalDateISO()],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return [];
      return await ventasMinoristasService.getVentasDelDia(user.id);
    },
    enabled: !!user && user.rol === 'minorista',
  });

  // Calcular total de ventas del día
  const totalVentasDelDia = useMemo(() => {
    return ventasDelDia.reduce((sum, venta) => sum + (venta.cantidad_vendida * venta.precio_unitario), 0);
  }, [ventasDelDia]);

  // Obtener historial de arqueos
  const { data: arqueos = [], isLoading: loadingArqueos } = useQuery({
    queryKey: ['arqueos-minorista', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return [];
      return await arqueosMinoristasService.getAll({ id_minorista: user.id });
    },
    enabled: !!user && user.rol === 'minorista',
  });

  // Crear arqueo
  const createArqueoMutation = useMutation({
    mutationFn: async () => {
      if (!user || user.rol !== 'minorista') throw new Error('No autorizado');
      
      const fecha = getLocalDateISO();
      const hora = getLocalTimeISO();
      
      // Calcular saldos restantes desde las ventas del día
      // Agrupar por producto y calcular cantidad restante
      const saldosRestantes: Array<{ id_producto: string; cantidad_restante: number }> = [];
      const ventasPorProducto = new Map<string, { vendida: number; aumento: number; cantidadInicial: number }>();
      
      // Obtener preregistros para saber la cantidad inicial
      const { preregistrosService } = await import('@/services/preregistros.service');
      const preregistros = await preregistrosService.getPreregistrosMinorista(user.id);
      
      preregistros.forEach(preregistro => {
        ventasPorProducto.set(preregistro.id_producto, {
          vendida: 0,
          aumento: 0,
          cantidadInicial: preregistro.cantidad,
        });
      });
      
      // Sumar ventas y aumentos del día
      ventasDelDia.forEach(venta => {
        const actual = ventasPorProducto.get(venta.id_producto) || { vendida: 0, aumento: 0, cantidadInicial: 0 };
        ventasPorProducto.set(venta.id_producto, {
          vendida: actual.vendida + venta.cantidad_vendida,
          aumento: actual.aumento + venta.cantidad_aumento,
          cantidadInicial: actual.cantidadInicial,
        });
      });
      
      // Calcular saldos restantes
      ventasPorProducto.forEach((data, idProducto) => {
        const cantidadRestante = data.cantidadInicial + data.aumento - data.vendida;
        if (cantidadRestante > 0) {
          saldosRestantes.push({ id_producto: idProducto, cantidad_restante: cantidadRestante });
        }
      });
      
      return await arqueosMinoristasService.create({
        id_minorista: user.id,
        fecha: fecha,
        hora_apertura: hora,
        ventas_del_periodo: totalVentasDelDia,
        saldos_restantes: saldosRestantes,
        efectivo_recibido: 0,
        estado: 'abierto',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arqueo-minorista-abierto'] });
      queryClient.invalidateQueries({ queryKey: ['arqueos-minorista'] });
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
      return await arqueosMinoristasService.cerrar(arqueoSeleccionado, data.efectivoRecibido);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arqueo-minorista-abierto'] });
      queryClient.invalidateQueries({ queryKey: ['arqueos-minorista'] });
      setShowCerrarDialog(false);
      setArqueoSeleccionado(null);
      cerrarForm.reset();
      toast.success('Arqueo cerrado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cerrar arqueo');
    },
  });

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

  const onSubmitCerrar = (data: CerrarArqueoForm) => {
    cerrarArqueoMutation.mutate(data);
  };

  // Verificar autorización
  if (!user || user.rol !== 'minorista') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Solo minoristas pueden acceder a esta página</p>
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
          <h1 className="text-3xl font-bold">Arqueos Diarios</h1>
        </div>

        {/* Arqueo Abierto del Día */}
        {loadingArqueoAbierto ? (
          <Skeleton className="h-64" />
        ) : arqueoAbierto ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Arqueo del Día - {arqueoAbierto.fecha}
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
                    <span className="text-sm font-medium text-muted-foreground">Ventas del Día</span>
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
                  <h3 className="font-semibold mb-2">Saldos Restantes</h3>
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
              <Button
                onClick={() => createArqueoMutation.mutate()}
                disabled={createArqueoMutation.isPending}
                className="w-full"
              >
                {createArqueoMutation.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Arqueo del Día
                  </>
                )}
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
                    <TableHead>Fecha</TableHead>
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
                      <TableCell>{arqueo.fecha}</TableCell>
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

        {/* Dialog para cerrar arqueo */}
        <Dialog open={showCerrarDialog} onOpenChange={setShowCerrarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerrar Arqueo</DialogTitle>
              <DialogDescription>
                Ingresa el efectivo recibido para cerrar el arqueo del día.
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
