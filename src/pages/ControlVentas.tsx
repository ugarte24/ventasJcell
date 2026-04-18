import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search, 
  DollarSign,
  Eye,
  Loader,
  Users,
  ShoppingCart,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Sale, User } from '@/types';
import { salesService } from '@/services/sales.service';
import { usersService } from '@/services/users.service';
import { usuarioControlDiarioService, UsuarioControlDiario } from '@/services/usuario-control-diario.service';
import { minoristaRevisionVentaService } from '@/services/minorista-revision-venta.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDateISO, formatDateOnlyLocal, parseDateOnlyLocal } from '@/lib/utils';

export default function ControlVentas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaControlDia, setFechaControlDia] = useState(() => getLocalDateISO());
  const [filasControl, setFilasControl] = useState<
    Record<
      string,
      {
        pedidos_habilitado: boolean;
        efectivo_entregado: string;
        /** Solo minorista: editar preregistro en Nueva venta (persistido en usuarios). */
        edicion_nueva_venta?: boolean;
      }
    >
  >({});
  const [rolFilter, setRolFilter] = useState<'mayorista' | 'minorista' | 'todos'>('todos');
  const [selectedUsuario, setSelectedUsuario] = useState<string>('todos');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Solo administradores pueden acceder
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      toast.error('No tienes permisos para acceder a esta página');
    }
  }, [user]);

  // Obtener usuarios mayoristas y minoristas
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios-mayoristas-minoristas'],
    queryFn: async () => {
      const allUsers = await usersService.getAll();
      return allUsers.filter(u => u.rol === 'mayorista' || u.rol === 'minorista');
    },
    enabled: user?.rol === 'admin',
  });

  // Obtener ventas
  const { data: allSales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['ventas-control', rolFilter, selectedUsuario],
    queryFn: async () => {
      // Obtener IDs de usuarios según el filtro de rol
      let userIds: string[] = [];
      
      if (rolFilter === 'todos') {
        userIds = usuarios.map(u => u.id);
      } else {
        userIds = usuarios.filter(u => u.rol === rolFilter).map(u => u.id);
      }
      
      if (selectedUsuario !== 'todos') {
        userIds = [selectedUsuario];
      }

      if (userIds.length === 0) {
        return [];
      }

      // Obtener todas las ventas de estos usuarios
      const sales: Sale[] = [];
      for (const userId of userIds) {
        try {
          const userSales = await salesService.getAll({ id_vendedor: userId });
          sales.push(...userSales);
        } catch (error) {
          console.error(`Error obteniendo ventas para usuario ${userId}:`, error);
        }
      }
      
      return sales.sort((a, b) => {
        const t = (s: Sale) =>
          s.created_at
            ? new Date(s.created_at).getTime()
            : parseDateOnlyLocal(String(s.fecha)).getTime();
        return t(b) - t(a);
      });
    },
    enabled: user?.rol === 'admin' && usuarios.length > 0,
  });

  // Filtrar ventas por término de búsqueda
  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const usuario = usuarios.find(u => u.id === sale.id_vendedor);
      const nombreMatch = usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = sale.id.toLowerCase().includes(searchTerm.toLowerCase());
      return nombreMatch || idMatch;
    });
  }, [allSales, usuarios, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rolFilter, selectedUsuario]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredSales.length, currentPage, totalPages]);

  const handleOpenDetailsDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailsDialog(true);
  };

  // Estadísticas
  const stats = useMemo(() => {
    const totalVentas = filteredSales.length;
    const totalMonto = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0);
    const mayoristasCount = new Set(filteredSales.map(s => s.id_vendedor).filter(id => {
      const u = usuarios.find(us => us.id === id);
      return u?.rol === 'mayorista';
    })).size;
    const minoristasCount = new Set(filteredSales.map(s => s.id_vendedor).filter(id => {
      const u = usuarios.find(us => us.id === id);
      return u?.rol === 'minorista';
    })).size;

    return { totalVentas, totalMonto, mayoristasCount, minoristasCount };
  }, [filteredSales, usuarios]);

  // Usuarios filtrados para el dropdown
  const usuariosFiltrados = useMemo(() => {
    if (rolFilter === 'todos') {
      return usuarios;
    }
    return usuarios.filter(u => u.rol === rolFilter);
  }, [usuarios, rolFilter]);

  const {
    data: controlesDia = [],
    isLoading: loadingControlesDia,
    isError: errorControlesDia,
    error: errorControlesQuery,
  } = useQuery({
    queryKey: ['usuario-control-diario', fechaControlDia],
    queryFn: () => usuarioControlDiarioService.listByFecha(fechaControlDia),
    enabled: user?.rol === 'admin',
    retry: false,
  });

  const controlesMap = useMemo(() => {
    const m = new Map<string, UsuarioControlDiario>();
    controlesDia.forEach((c) => m.set(c.id_usuario, c));
    return m;
  }, [controlesDia]);

  const { data: efectivoEsperadoPorUsuario = {}, isLoading: loadingEfectivoEsperado } = useQuery({
    queryKey: ['efectivo-esperado-dia', fechaControlDia, usuarios.map((u) => u.id).sort().join(',')],
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all(
        usuarios.map(async (u) => {
          out[u.id] = await salesService.getTotalEfectivoVendedorEnFecha(u.id, fechaControlDia);
        })
      );
      return out;
    },
    enabled: user?.rol === 'admin' && usuarios.length > 0,
  });

  useEffect(() => {
    const next: Record<
      string,
      {
        pedidos_habilitado: boolean;
        efectivo_entregado: string;
        edicion_nueva_venta?: boolean;
      }
    > = {};
    for (const u of usuarios) {
      const c = controlesMap.get(u.id);
      next[u.id] = {
        pedidos_habilitado: c?.pedidos_habilitado ?? false,
        efectivo_entregado: c != null ? String(c.efectivo_entregado) : '',
        edicion_nueva_venta:
          u.rol === 'minorista' ? u.edicion_preregistro_nueva_venta_permitida === true : undefined,
      };
    }
    setFilasControl(next);
  }, [usuarios, fechaControlDia, controlesMap]);

  const guardarControlMutation = useMutation({
    mutationFn: async (payload: {
      usuario: User;
      fecha: string;
      pedidos_habilitado: boolean;
      efectivo_entregado: number;
      edicion_nueva_venta?: boolean;
    }) => {
      const { usuario: u, fecha, pedidos_habilitado, efectivo_entregado, edicion_nueva_venta } = payload;

      // Pedidos y efectivo primero: no deben quedar bloqueados si falla la anulación de venta
      // al habilitar "Editar Nueva venta" (p. ej. inventario / triggers).
      await usuarioControlDiarioService.upsert({
        id_usuario: u.id,
        fecha,
        pedidos_habilitado,
        efectivo_entregado,
      });

      if (u.rol === 'minorista' && typeof edicion_nueva_venta === 'boolean' && user?.id) {
        const antes = u.edicion_preregistro_nueva_venta_permitida === true;
        const despues = edicion_nueva_venta;
        if (despues !== antes) {
          if (despues && !antes) {
            await minoristaRevisionVentaService.anularUltimaVentaNuevaVentaAlHabilitarEdicion(u.id, user.id);
          }
          await usersService.update(u.id, { edicion_preregistro_nueva_venta_permitida: despues });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario-control-diario'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-gate'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-mayoristas-minoristas'] });
      toast.success('Control guardado');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  });

  if (user?.rol !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Control de Usuarios Mayoristas y Minoristas</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y monitorea las ventas de mayoristas y minoristas
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/pagos-mayoristas">Pagos pendientes mayoristas</Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVentas}</div>
              <p className="text-xs text-muted-foreground">Ventas registradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Bs. {stats.totalMonto.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mayoristas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mayoristasCount}</div>
              <p className="text-xs text-muted-foreground">Con ventas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minoristas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.minoristasCount}</div>
              <p className="text-xs text-muted-foreground">Con ventas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de usuario o ID de venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={rolFilter} onValueChange={(value: 'mayorista' | 'minorista' | 'todos') => {
                setRolFilter(value);
                setSelectedUsuario('todos'); // Reset usuario cuando cambia el rol
              }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                  <SelectItem value="minorista">Minorista</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los usuarios</SelectItem>
                  {usuariosFiltrados.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Control diario: pedidos (solo la fecha elegida) y efectivo entregado vs faltante */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Control del día — mayoristas y minoristas</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              La habilitación de pedidos aplica únicamente para la fecha seleccionada. Al día siguiente debe
              volver a activarse si corresponde.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Uso</AlertTitle>
              <AlertDescription>
                Tras finalizar la venta desde Nueva venta, el usuario no puede solicitar pedidos hasta que aquí
                actives &quot;Pedidos&quot; para ese día. Para minoristas, &quot;Editar Nueva venta&quot; permite
                volver a editar el preregistro (misma regla que en Usuarios). Registra el efectivo físico
                entregado; el faltante es la diferencia respecto al total vendido en efectivo registrado en el
                sistema para esa fecha.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha-control-dia">Fecha</Label>
                <DatePicker
                  id="fecha-control-dia"
                  value={fechaControlDia}
                  onChange={setFechaControlDia}
                  placeholder="dd/mm/aaaa"
                  className="w-[200px]"
                />
              </div>
            </div>
            {errorControlesDia && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No se pudo cargar el control del día</AlertTitle>
                <AlertDescription>
                  {errorControlesQuery instanceof Error
                    ? errorControlesQuery.message
                    : 'Error desconocido'}
                </AlertDescription>
              </Alert>
            )}
            {loadingControlesDia || loadingEfectivoEsperado ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-center min-w-[120px]">Pedidos (solo esta fecha)</TableHead>
                      <TableHead className="text-center min-w-[130px]">Editar Nueva venta</TableHead>
                      <TableHead className="text-right">Efectivo esperado (Bs.)</TableHead>
                      <TableHead className="min-w-[140px]">Efectivo entregado (Bs.)</TableHead>
                      <TableHead className="text-right">Faltante (Bs.)</TableHead>
                      <TableHead className="text-right w-[100px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => {
                      const fila = filasControl[u.id];
                      const esperado = efectivoEsperadoPorUsuario[u.id] ?? 0;
                      const entregadoNum = parseFloat((fila?.efectivo_entregado || '').replace(',', '.')) || 0;
                      const faltante = Math.max(0, esperado - entregadoNum);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {u.rol === 'mayorista' ? 'Mayorista' : 'Minorista'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={fila?.pedidos_habilitado ?? false}
                              onCheckedChange={(v) =>
                                setFilasControl((prev) => ({
                                  ...prev,
                                  [u.id]: {
                                    pedidos_habilitado: v,
                                    efectivo_entregado: prev[u.id]?.efectivo_entregado ?? '',
                                    edicion_nueva_venta: prev[u.id]?.edicion_nueva_venta,
                                  },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {u.rol === 'minorista' ? (
                              <Switch
                                checked={fila?.edicion_nueva_venta ?? false}
                                onCheckedChange={(v) =>
                                  setFilasControl((prev) => ({
                                    ...prev,
                                    [u.id]: {
                                      pedidos_habilitado: prev[u.id]?.pedidos_habilitado ?? false,
                                      efectivo_entregado: prev[u.id]?.efectivo_entregado ?? '',
                                      edicion_nueva_venta: v,
                                    },
                                  }))
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm" title="Solo aplica a minoristas">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            Bs. {esperado.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full min-w-[120px]"
                              value={fila?.efectivo_entregado ?? ''}
                              onChange={(e) =>
                                setFilasControl((prev) => ({
                                  ...prev,
                                  [u.id]: {
                                    pedidos_habilitado: prev[u.id]?.pedidos_habilitado ?? false,
                                    efectivo_entregado: e.target.value,
                                    edicion_nueva_venta: prev[u.id]?.edicion_nueva_venta,
                                  },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums font-medium ${
                              faltante > 0.009 ? 'text-destructive' : 'text-muted-foreground'
                            }`}
                          >
                            {faltante > 0.009 ? `Bs. ${faltante.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={guardarControlMutation.isPending}
                              onClick={() => {
                                const f = filasControl[u.id];
                                if (!f) return;
                                guardarControlMutation.mutate({
                                  usuario: u,
                                  fecha: fechaControlDia,
                                  pedidos_habilitado: f.pedidos_habilitado,
                                  efectivo_entregado: parseFloat((f.efectivo_entregado || '0').replace(',', '.')) || 0,
                                  edicion_nueva_venta:
                                    u.rol === 'minorista' ? (f.edicion_nueva_venta ?? false) : undefined,
                                });
                              }}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Guardar
                            </Button>
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

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales || loadingUsuarios ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedSales.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay ventas registradas</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Método Pago</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSales.map((sale) => {
                        const usuario = usuarios.find(u => u.id === sale.id_vendedor);
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {usuario?.nombre || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {usuario?.rol === 'mayorista' ? 'Mayorista' : 
                                 usuario?.rol === 'minorista' ? 'Minorista' : 
                                 usuario?.rol || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDateOnlyLocal(sale.fecha)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              Bs. {parseFloat(sale.total || '0').toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {sale.metodo_pago || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sale.estado === 'completada' ? (
                                <Badge className="bg-success text-success-foreground">Completada</Badge>
                              ) : (
                                <Badge variant="destructive">Anulada</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDetailsDialog(sale)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
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
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalles Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Venta</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Usuario</Label>
                  <p className="font-medium">
                    {usuarios.find(u => u.id === selectedSale.id_vendedor)?.nombre || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rol</Label>
                  <p className="font-medium capitalize">
                    {usuarios.find(u => u.id === selectedSale.id_vendedor)?.rol || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="font-medium">
                    {formatDateOnlyLocal(selectedSale.fecha)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <p className="font-medium">Bs. {parseFloat(selectedSale.total || '0').toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Método de Pago</Label>
                  <p className="font-medium capitalize">{selectedSale.metodo_pago || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    {selectedSale.estado === 'completada' ? (
                      <Badge className="bg-success text-success-foreground">Completada</Badge>
                    ) : (
                      <Badge variant="destructive">Anulada</Badge>
                    )}
                  </div>
                </div>
              </div>
              {selectedSale.detalle_venta && selectedSale.detalle_venta.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Productos</Label>
                  <div className="space-y-2">
                    {selectedSale.detalle_venta.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">
                          {item.productos?.nombre || 'Producto'} x {item.cantidad}
                        </span>
                        <span className="text-sm font-medium">
                          Bs. {parseFloat(item.subtotal || '0').toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
