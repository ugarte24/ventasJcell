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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search
} from 'lucide-react';
import { useServicios } from '@/hooks/useServicios';
import { 
  useRegistrosServicios,
  useMovimientosServicios
} from '@/hooks/useServicios';
import { Skeleton } from '@/components/ui/skeleton';
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
import { getLocalDateISO } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ServiciosHistorial() {
  const fechaHoy = getLocalDateISO();
  const fechaHace30Dias = new Date();
  fechaHace30Dias.setDate(fechaHace30Dias.getDate() - 30);
  const fechaInicioDefault = fechaHace30Dias.toISOString().split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(fechaInicioDefault);
  const [fechaHasta, setFechaHasta] = useState(fechaHoy);
  const [idServicioFilter, setIdServicioFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'movimientos' | 'registros'>('movimientos');
  const [currentPageMovimientos, setCurrentPageMovimientos] = useState(1);
  const [currentPageRegistros, setCurrentPageRegistros] = useState(1);
  const itemsPerPage = 20;

  const { data: servicios } = useServicios();
  const { data: movimientos, isLoading: loadingMovimientos } = useMovimientosServicios({
    id_servicio: idServicioFilter !== 'todos' ? idServicioFilter : undefined,
    fechaDesde,
    fechaHasta,
  });
  const { data: registros, isLoading: loadingRegistros } = useRegistrosServicios({
    id_servicio: idServicioFilter !== 'todos' ? idServicioFilter : undefined,
    fechaDesde,
    fechaHasta,
  });


  // Crear mapa de servicios para búsqueda rápida
  const serviciosMap = useMemo(() => {
    const map = new Map<string, string>();
    servicios?.forEach(serv => {
      map.set(serv.id, serv.nombre);
    });
    return map;
  }, [servicios]);


  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  // Paginación para movimientos
  const totalPagesMovimientos = Math.ceil((movimientos?.length || 0) / itemsPerPage);
  const startIndexMovimientos = (currentPageMovimientos - 1) * itemsPerPage;
  const endIndexMovimientos = startIndexMovimientos + itemsPerPage;
  const paginatedMovimientos = movimientos?.slice(startIndexMovimientos, endIndexMovimientos) || [];

  // Paginación para registros
  const totalPagesRegistros = Math.ceil((registros?.length || 0) / itemsPerPage);
  const startIndexRegistros = (currentPageRegistros - 1) * itemsPerPage;
  const endIndexRegistros = startIndexRegistros + itemsPerPage;
  const paginatedRegistros = registros?.slice(startIndexRegistros, endIndexRegistros) || [];

  // Resetear páginas cuando cambien los datos
  useEffect(() => {
    if (currentPageMovimientos > totalPagesMovimientos && totalPagesMovimientos > 0) {
      setCurrentPageMovimientos(1);
    }
  }, [movimientos?.length, currentPageMovimientos, totalPagesMovimientos]);

  useEffect(() => {
    if (currentPageRegistros > totalPagesRegistros && totalPagesRegistros > 0) {
      setCurrentPageRegistros(1);
    }
  }, [registros?.length, currentPageRegistros, totalPagesRegistros]);

  return (
    <DashboardLayout title="Historial de Servicios">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Historial de Servicios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consulta movimientos y registros históricos de servicios
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha-desde">Fecha Desde</Label>
                <DatePicker
                  id="fecha-desde"
                  value={fechaDesde}
                  onChange={setFechaDesde}
                  max={fechaHasta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
                <DatePicker
                  id="fecha-hasta"
                  value={fechaHasta}
                  onChange={setFechaHasta}
                  min={fechaDesde}
                  max={fechaHoy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servicio-filter">Servicio</Label>
                <Select value={idServicioFilter} onValueChange={setIdServicioFilter}>
                  <SelectTrigger id="servicio-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {servicios?.map((servicio) => (
                      <SelectItem key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFechaDesde(fechaInicioDefault);
                    setFechaHasta(fechaHoy);
                    setIdServicioFilter('todos');
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'movimientos' | 'registros')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="movimientos">
              Movimientos
            </TabsTrigger>
            <TabsTrigger value="registros">
              Registros Diarios
            </TabsTrigger>
          </TabsList>

          {/* Tab Movimientos */}
          <TabsContent value="movimientos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Movimientos de Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMovimientos ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !movimientos || movimientos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No hay movimientos en el rango de fechas seleccionado
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Saldo Anterior</TableHead>
                          <TableHead className="text-right">Saldo Nuevo</TableHead>
                          <TableHead>Observación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovimientos.map((movimiento) => (
                          <TableRow key={movimiento.id}>
                            <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                            <TableCell>{formatTime(movimiento.hora)}</TableCell>
                            <TableCell className="font-medium">
                              {serviciosMap.get(movimiento.id_servicio) || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={movimiento.tipo === 'aumento' ? 'default' : 'secondary'}>
                                {movimiento.tipo === 'aumento' ? (
                                  <>
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Aumento
                                  </>
                                ) : (
                                  'Ajuste'
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              +Bs. {movimiento.monto.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              Bs. {movimiento.saldo_anterior.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              Bs. {movimiento.saldo_nuevo.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {movimiento.observacion || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {movimientos && movimientos.length > itemsPerPage && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => {
                              if (currentPageMovimientos > 1) setCurrentPageMovimientos(currentPageMovimientos - 1);
                            }}
                            className={currentPageMovimientos === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPagesMovimientos }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPagesMovimientos ||
                            (page >= currentPageMovimientos - 1 && page <= currentPageMovimientos + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPageMovimientos(page)}
                                  isActive={currentPageMovimientos === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (page === currentPageMovimientos - 2 || page === currentPageMovimientos + 2) {
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
                              if (currentPageMovimientos < totalPagesMovimientos) setCurrentPageMovimientos(currentPageMovimientos + 1);
                            }}
                            className={currentPageMovimientos === totalPagesMovimientos ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Registros */}
          <TabsContent value="registros" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registros Diarios</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRegistros ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !registros || registros.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No hay registros en el rango de fechas seleccionado
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead className="text-right">Saldo Inicial</TableHead>
                          <TableHead className="text-right">Aumentado</TableHead>
                          <TableHead className="text-right">Saldo Final</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Observación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRegistros.map((registro) => (
                          <TableRow key={registro.id}>
                            <TableCell>{formatDate(registro.fecha)}</TableCell>
                            <TableCell className="font-medium">
                              {serviciosMap.get(registro.id_servicio) || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold">
                                Bs. {registro.saldo_inicial.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {registro.monto_aumentado > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  +Bs. {registro.monto_aumentado.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Bs. 0.00</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold">
                                Bs. {registro.saldo_final.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={registro.total >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {registro.total >= 0 ? '+' : ''}
                                Bs. {registro.total.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {registro.observacion || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {registros && registros.length > itemsPerPage && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => {
                              if (currentPageRegistros > 1) setCurrentPageRegistros(currentPageRegistros - 1);
                            }}
                            className={currentPageRegistros === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPagesRegistros }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPagesRegistros ||
                            (page >= currentPageRegistros - 1 && page <= currentPageRegistros + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPageRegistros(page)}
                                  isActive={currentPageRegistros === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (page === currentPageRegistros - 2 || page === currentPageRegistros + 2) {
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
                              if (currentPageRegistros < totalPagesRegistros) setCurrentPageRegistros(currentPageRegistros + 1);
                            }}
                            className={currentPageRegistros === totalPagesRegistros ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </DashboardLayout>
  );
}

