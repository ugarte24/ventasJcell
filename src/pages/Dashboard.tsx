import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/contexts';
import { DollarSign, ShoppingBag, TrendingUp, Package, Clock, AlertTriangle, Bell, BellOff, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTodaySales, useSales } from '@/hooks/useSales';
import { useLowStockProducts } from '@/hooks/useProducts';
import { useServicios } from '@/hooks/useServicios';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/useNotifications';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: salesToday = [], isLoading: loadingSales } = useTodaySales();
  const { data: allSales = [] } = useSales(); // Para mostrar últimas ventas si no hay ventas hoy
  const { data: productosStockBajo = [], isLoading: loadingStock } = useLowStockProducts();
  // Solo cargar servicios si el usuario no es minorista ni mayorista
  const shouldLoadServicios = user?.rol !== 'minorista' && user?.rol !== 'mayorista';
  const { data: servicios = [], isLoading: loadingServicios } = useServicios(false, {
    enabled: shouldLoadServicios,
  });
  const { requestPermission, hasPermission, isSupported, isEnabled, enable, disable } = useNotifications();
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Verificar estado de notificaciones
  useEffect(() => {
    if (isSupported()) {
      const enabled = isEnabled();
      setNotificationEnabled(enabled);
    }
  }, [isSupported, isEnabled]);

  // Toggle de notificaciones (activar/desactivar)
  const handleToggleNotifications = async () => {
    if (!isSupported()) {
      toast.error('Las notificaciones no están soportadas en este navegador');
      return;
    }

    if (notificationEnabled) {
      // Desactivar notificaciones
      disable();
      setNotificationEnabled(false);
      toast.success('Notificaciones desactivadas');
    } else {
      // Activar notificaciones - primero verificar permisos
      if (!hasPermission()) {
        const permission = await requestPermission();
        if (permission === 'granted') {
          enable();
          setNotificationEnabled(true);
          toast.success('Notificaciones activadas');
        } else if (permission === 'denied') {
          toast.error('Permisos de notificaciones denegados. Por favor, habilítalos en la configuración del navegador.');
        }
      } else {
        // Ya tiene permisos, solo habilitar
        enable();
        setNotificationEnabled(true);
        toast.success('Notificaciones activadas');
      }
    }
  };

  const totalVentasHoy = salesToday.reduce((sum, sale) => sum + sale.total, 0);
  const numeroVentas = salesToday.length;
  const ticketPromedio = numeroVentas > 0 ? totalVentasHoy / numeroVentas : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <DashboardLayout title="Panel de Control">
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="animate-slide-up flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {getGreeting()}, {user?.nombre.split(' ')[0]}
            </h2>
            <p className="text-muted-foreground">
              Aquí tienes el resumen de hoy
            </p>
          </div>
          {/* Botón de notificaciones desactivado - Solo se usan toasts */}
          {/* {user?.rol === 'admin' && isSupported() && (
            <Button
              variant={notificationEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleNotifications}
              className="gap-2"
            >
              {notificationEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notificaciones ON</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Notificaciones OFF</span>
                </>
              )}
            </Button>
          )} */}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {loadingSales ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard
                title="Ventas del Día"
                value={`Bs. ${totalVentasHoy.toFixed(2)}`}
                icon={DollarSign}
                variant="primary"
                layout="horizontal-title"
              />
              <StatCard
                title="Número de Ventas"
                value={numeroVentas}
                subtitle="transacciones hoy"
                icon={ShoppingBag}
                layout="horizontal-title"
              />
              <StatCard
                title="Promedio de Ventas"
                value={`Bs. ${ticketPromedio.toFixed(2)}`}
                icon={TrendingUp}
                variant="success"
                layout="horizontal-title"
              />
              <StatCard
                title="Stock Bajo"
                value={loadingStock ? '...' : productosStockBajo.length}
                subtitle="productos por reponer"
                icon={Package}
                variant={productosStockBajo.length > 0 ? 'warning' : 'default'}
                layout="horizontal-title"
              />
            </>
          )}
        </div>

        {/* Quick Actions + Recent Sales */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button 
                className="h-12 justify-start gap-3" 
                onClick={() => navigate('/ventas/nueva')}
              >
                <ShoppingBag className="h-5 w-5" />
                Nueva Venta
              </Button>
              {user?.rol === 'admin' && (
                <>
                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-3"
                    onClick={() => navigate('/productos')}
                  >
                    <Package className="h-5 w-5" />
                    Ver Productos
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-3"
                    onClick={() => navigate('/reportes')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    Ver Reportes
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Últimas Ventas</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/ventas')}>
                Ver todas
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : salesToday.length === 0 ? (
                allSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay ventas registradas
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">No hay ventas hoy. Mostrando últimas ventas:</p>
                    {allSales.slice(0, 5).map((sale: any) => {
                      const detalles = sale.detalle_venta || [];
                      const primerDetalle = detalles[0];
                      const producto = primerDetalle?.productos;
                      
                      return (
                        <div 
                          key={sale.id} 
                          className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {producto?.nombre || 'Producto no disponible'}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {sale.fecha} {sale.hora}
                                {detalles.length > 1 && (
                                  <span className="ml-1">
                                    (+{detalles.length - 1} más)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">Bs. {sale.total.toFixed(2)}</p>
                            <Badge variant="outline" className="capitalize">
                              {sale.metodo_pago}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {salesToday.slice(0, 5).map((sale: any) => {
                    const detalles = sale.detalle_venta || [];
                    const primerDetalle = detalles[0];
                    const producto = primerDetalle?.productos;
                    
                    return (
                      <div 
                        key={sale.id} 
                        className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {producto?.nombre || 'Producto no disponible'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {sale.fecha} {sale.hora}
                              {detalles.length > 1 && (
                                <span className="ml-1">
                                  (+{detalles.length - 1} más)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">Bs. {sale.total.toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize">
                            {sale.metodo_pago}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Servicios - Solo visible para admin y vendedor */}
        {servicios && servicios.length > 0 && user?.rol !== 'minorista' && user?.rol !== 'mayorista' && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Wrench className="h-5 w-5" />
                Servicios
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/servicios')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {loadingServicios ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {servicios.slice(0, 6).map((servicio) => (
                    <div 
                      key={servicio.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{servicio.nombre}</p>
                        {servicio.descripcion && (
                          <p className="text-sm text-muted-foreground truncate">{servicio.descripcion}</p>
                        )}
                      </div>
                      <div className="ml-4 text-right flex-shrink-0">
                        <Badge variant={servicio.estado === 'activo' ? 'default' : 'secondary'}>
                          {servicio.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low Stock Alert */}
        {user?.rol === 'admin' && !loadingStock && productosStockBajo.length > 0 && (
          <Card className="border-warning/30 bg-warning/5 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-warning">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {productosStockBajo.map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{product.nombre}</p>
                      <p className="text-sm text-muted-foreground">Código: {product.codigo}</p>
                    </div>
                    <Badge variant="destructive">
                      {product.stock_actual} unid.
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
