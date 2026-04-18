import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Package, CalendarDays, Receipt, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts';
import { Skeleton } from '@/components/ui/skeleton';
import { ventasMayoristasService } from '@/services/ventas-mayoristas.service';
import { getLocalDateISO } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { VentaMayorista } from '@/types';
import { cn } from '@/lib/utils';

function lineaImporteVentaMayorista(v: VentaMayorista) {
  return v.cantidad_vendida * v.precio_por_mayor;
}

function referenciaVentaMayorista(observaciones?: string | null): string | null {
  if (!observaciones) return null;
  const m = observaciones.match(/Venta\s*#([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

function parseFechaLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fechaLocalToISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export default function ArqueosMayoristas() {
  const { user } = useAuth();

  const fechaHoy = getLocalDateISO();
  const [fechaConsultaVentas, setFechaConsultaVentas] = useState(() => getLocalDateISO());
  const esHoyVentas = fechaConsultaVentas === fechaHoy;
  const fechaSeleccionadaVentasDate = useMemo(
    () => parseFechaLocalISO(fechaConsultaVentas),
    [fechaConsultaVentas]
  );
  const [calendarMonthVentas, setCalendarMonthVentas] = useState(() =>
    parseFechaLocalISO(fechaConsultaVentas)
  );

  useEffect(() => {
    setCalendarMonthVentas(parseFechaLocalISO(fechaConsultaVentas));
  }, [fechaConsultaVentas]);

  const handleCalendarVentasSelect = useCallback(
    (d: Date | undefined) => {
      if (!d) return;
      const picked = fechaLocalToISO(d);
      if (picked > fechaHoy) return;
      setFechaConsultaVentas(picked);
    },
    [fechaHoy]
  );

  const {
    data: ventasPorFecha = [],
    isLoading: loadingVentasPorFecha,
    refetch: refetchVentasPorFecha,
    isFetching: fetchingVentasPorFecha,
  } = useQuery({
    queryKey: ['ventas-mayorista-dia', user?.id, fechaConsultaVentas],
    queryFn: async () => {
      if (!user || user.rol !== 'mayorista') return [];
      return await ventasMayoristasService.getVentasDelDia(user.id, fechaConsultaVentas);
    },
    enabled: !!user && user.rol === 'mayorista',
  });

  const ventasPorFechaOrdenadas = useMemo(() => {
    return [...ventasPorFecha].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [ventasPorFecha]);

  const totalVendidoPorFecha = useMemo(() => {
    return ventasPorFecha.reduce((sum, v) => sum + lineaImporteVentaMayorista(v), 0);
  }, [ventasPorFecha]);

  const lineasSoloVentaPorFecha = useMemo(
    () => ventasPorFecha.filter((v) => v.cantidad_vendida > 0).length,
    [ventasPorFecha]
  );

  if (!user || user.rol !== 'mayorista') {
    return (
      <DashboardLayout title="Ventas del día (Mayorista)">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Solo mayoristas pueden acceder a esta página</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ventas del día (Mayorista)">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-display tracking-tight">Ventas del día (Mayorista)</h1>
          <p className="text-muted-foreground">
            Consultá movimientos por día con el calendario: ventas desde <strong>Nueva venta</strong> y aumentos por
            pedidos entregados.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 xl:items-start">
          <Card className="shrink-0 w-full max-w-[340px] mx-auto xl:mx-0 xl:sticky xl:top-4 animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Calendario
              </CardTitle>
              <CardDescription className="text-xs">
                Elegí un día para ver sus movimientos. No podés elegir fechas futuras.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0 pb-4">
              <Calendar
                mode="single"
                month={calendarMonthVentas}
                onMonthChange={setCalendarMonthVentas}
                selected={fechaSeleccionadaVentasDate}
                onSelect={handleCalendarVentasSelect}
                disabled={(date) => fechaLocalToISO(date) > fechaHoy}
                className="rounded-md border"
              />
              <div className="flex flex-wrap gap-2 justify-center w-full mt-4 px-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={esHoyVentas}
                  onClick={() => setFechaConsultaVentas(fechaHoy)}
                >
                  Ir a hoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => refetchVentasPorFecha()}
                  disabled={fetchingVentasPorFecha}
                >
                  <RefreshCw className={cn('h-4 w-4', fetchingVentasPorFecha && 'animate-spin')} />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1 min-w-0 space-y-6">
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <Receipt className="h-5 w-5" />
                    Detalle {esHoyVentas ? 'de hoy' : `del ${fechaConsultaVentas}`}
                  </CardTitle>
                  <CardDescription>
                    Fecha: <span className="font-medium text-foreground">{fechaConsultaVentas}</span>
                    {esHoyVentas ? ' (hoy)' : ''}. Precio por mayor; cada fila es venta y/o aumento del día.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                    <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Total vendido (líneas de venta)
                    </div>
                    <p className="text-2xl font-bold text-primary tabular-nums">
                      {loadingVentasPorFecha ? '…' : `Bs. ${totalVendidoPorFecha.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                    <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Líneas con venta
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      {loadingVentasPorFecha ? '…' : lineasSoloVentaPorFecha}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                    <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Registros totales
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      {loadingVentasPorFecha ? '…' : ventasPorFecha.length}
                    </p>
                  </div>
                </div>

                {loadingVentasPorFecha ? (
                  <Skeleton className="h-48 w-full" />
                ) : ventasPorFechaOrdenadas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground rounded-lg border border-dashed">
                    No hay movimientos en esta fecha. Las ventas finalizadas en <strong>Nueva venta</strong> y los
                    aumentos por pedidos quedan registrados por día.
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Hora</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Vendida</TableHead>
                          <TableHead className="text-right">Aumento</TableHead>
                          <TableHead className="text-right">P. por mayor</TableHead>
                          <TableHead className="text-right">Importe venta</TableHead>
                          <TableHead className="hidden md:table-cell">Referencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventasPorFechaOrdenadas.map((v) => {
                          const refVenta = referenciaVentaMayorista(v.observaciones);
                          const importeVenta = lineaImporteVentaMayorista(v);
                          return (
                            <TableRow key={v.id}>
                              <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                                {v.hora?.slice(0, 8) || '—'}
                              </TableCell>
                              <TableCell className="font-medium">
                                {v.producto?.nombre || 'Producto'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{v.cantidad_vendida}</TableCell>
                              <TableCell className="text-right tabular-nums">{v.cantidad_aumento}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                Bs. {Number(v.precio_por_mayor).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">
                                Bs. {importeVenta.toFixed(2)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-[200px]">
                                {refVenta ? (
                                  <Badge variant="secondary" className="font-mono text-xs truncate max-w-full">
                                    Venta …{refVenta.slice(-8)}
                                  </Badge>
                                ) : v.id_pedido ? (
                                  <Badge variant="outline">Pedido</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
