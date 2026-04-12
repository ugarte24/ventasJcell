import { useMemo, useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, DollarSign, Package, RefreshCw, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts';
import { Skeleton } from '@/components/ui/skeleton';
import { ventasMinoristasService } from '@/services/ventas-minoristas.service';
import { getLocalDateISO } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { VentaMinorista } from '@/types';
import { cn } from '@/lib/utils';

function lineaSubtotal(v: VentaMinorista) {
  return v.cantidad_vendida * v.precio_unitario;
}

/** Intenta obtener id de venta desde observaciones tipo "… Venta #uuid" */
function referenciaVenta(observaciones?: string | null): string | null {
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
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ArqueosMinoristas() {
  const { user } = useAuth();
  const fechaHoy = getLocalDateISO();
  const [fechaConsulta, setFechaConsulta] = useState(() => getLocalDateISO());
  const esHoy = fechaConsulta === fechaHoy;

  const fechaSeleccionadaDate = useMemo(() => parseFechaLocalISO(fechaConsulta), [fechaConsulta]);
  const [calendarMonth, setCalendarMonth] = useState(() => parseFechaLocalISO(fechaConsulta));

  useEffect(() => {
    setCalendarMonth(parseFechaLocalISO(fechaConsulta));
  }, [fechaConsulta]);

  const handleCalendarSelect = useCallback(
    (d: Date | undefined) => {
      if (!d) return;
      const picked = fechaLocalToISO(d);
      if (picked > fechaHoy) return;
      setFechaConsulta(picked);
    },
    [fechaHoy]
  );

  const {
    data: ventasDelDia = [],
    isLoading: loadingVentas,
    refetch: refetchVentas,
    isFetching: fetchingVentas,
  } = useQuery({
    queryKey: ['ventas-minorista-dia', user?.id, fechaConsulta],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return [];
      return await ventasMinoristasService.getVentasDelDia(user.id, fechaConsulta);
    },
    enabled: !!user && user.rol === 'minorista',
  });

  const ventasOrdenadas = useMemo(() => {
    return [...ventasDelDia].sort((a, b) => {
      const ta = (a.hora || '').localeCompare(b.hora || '');
      return ta;
    });
  }, [ventasDelDia]);

  const totalVentasDelDia = useMemo(() => {
    return ventasDelDia.reduce((sum, venta) => sum + lineaSubtotal(venta), 0);
  }, [ventasDelDia]);

  const lineasSoloVenta = useMemo(
    () => ventasDelDia.filter((v) => v.cantidad_vendida > 0).length,
    [ventasDelDia]
  );

  if (!user || user.rol !== 'minorista') {
    return (
      <DashboardLayout title="Ventas del día">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Solo minoristas pueden acceder a esta página</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ventas del día">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-display tracking-tight">Ventas del día</h1>
          <p className="text-muted-foreground">
            Consultá movimientos por fecha con el calendario. Se registran al finalizar en{' '}
            <strong>Nueva venta</strong> o por aumentos de pedidos.
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
                Tocá un día para ver sus movimientos. No podés elegir fechas futuras.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0 pb-4">
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={fechaSeleccionadaDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => fechaLocalToISO(date) > fechaHoy}
                className="rounded-md border"
              />
              <div className="flex flex-wrap gap-2 justify-center w-full mt-4 px-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={esHoy}
                  onClick={() => setFechaConsulta(fechaHoy)}
                >
                  Ir a hoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => refetchVentas()}
                  disabled={fetchingVentas}
                >
                  <RefreshCw className={cn('h-4 w-4', fetchingVentas && 'animate-spin')} />
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
                Detalle {esHoy ? 'de hoy' : `del ${fechaConsulta}`}
              </CardTitle>
              <CardDescription>
                Fecha seleccionada: <span className="font-medium text-foreground">{fechaConsulta}</span>
                {esHoy ? ' (hoy)' : ''}. Cada fila es un registro (venta o aumento).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Total vendido
                </div>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {loadingVentas ? '…' : `Bs. ${totalVentasDelDia.toFixed(2)}`}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Líneas con venta
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {loadingVentas ? '…' : lineasSoloVenta}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/80 border border-border/60">
                <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Registros totales
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {loadingVentas ? '…' : ventasDelDia.length}
                </p>
              </div>
            </div>

            {loadingVentas ? (
              <Skeleton className="h-48 w-full" />
            ) : ventasOrdenadas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground rounded-lg border border-dashed">
                No hay movimientos en esta fecha. Las ventas finalizadas en <strong>Nueva venta</strong> quedan
                registradas por día.
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
                      <TableHead className="text-right">P. unit.</TableHead>
                      <TableHead className="text-right">Importe venta</TableHead>
                      <TableHead className="hidden md:table-cell">Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasOrdenadas.map((v) => {
                      const refVenta = referenciaVenta(v.observaciones);
                      const importeVenta = lineaSubtotal(v);
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
                          <TableCell className="text-right tabular-nums">Bs. {v.precio_unitario.toFixed(2)}</TableCell>
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
