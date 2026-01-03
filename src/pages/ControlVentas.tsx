import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Sale, User } from '@/types';
import { salesService } from '@/services/sales.service';
import { usersService } from '@/services/users.service';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ControlVentas() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
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
        const dateA = new Date(a.created_at || a.fecha).getTime();
        const dateB = new Date(b.created_at || b.fecha).getTime();
        return dateB - dateA;
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
                              {format(new Date(sale.fecha), 'dd/MM/yyyy', { locale: es })}
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
                    {format(new Date(selectedSale.fecha), 'dd/MM/yyyy', { locale: es })}
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
