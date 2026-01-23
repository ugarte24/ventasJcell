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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Package,
  MoreHorizontal, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Search,
  Loader,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Pedido } from '@/types';
import { pedidosService } from '@/services/pedidos.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPedidos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [tipoUsuarioFilter, setTipoUsuarioFilter] = useState<string>('todos');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showEntregadoDialog, setShowEntregadoDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [pedidoToAction, setPedidoToAction] = useState<string | null>(null);

  // Solo administradores pueden acceder
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      toast.error('No tienes permisos para acceder a esta página');
    }
  }, [user]);

  // Obtener todos los pedidos
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-admin', estadoFilter, tipoUsuarioFilter],
    queryFn: async () => {
      return await pedidosService.getAll();
    },
    enabled: user?.rol === 'admin',
  });

  // Mutación para marcar como entregado
  const marcarEntregadoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await pedidosService.update(id, { estado: 'entregado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['preregistros'] });
      toast.success('Pedido marcado como entregado. Los preregistros han sido actualizados.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al marcar el pedido como entregado');
    },
  });

  // Mutación para cancelar pedido
  const cancelarPedidoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await pedidosService.update(id, { estado: 'cancelado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-admin'] });
      toast.success('Pedido cancelado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar el pedido');
    },
  });

  const filteredPedidos = useMemo(() => {
    let filtered = pedidos;
    
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(p => p.estado === estadoFilter);
    }
    
    if (tipoUsuarioFilter !== 'todos') {
      filtered = filtered.filter(p => p.tipo_usuario === tipoUsuarioFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [pedidos, estadoFilter, tipoUsuarioFilter, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPedidos = filteredPedidos.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter, tipoUsuarioFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredPedidos.length, currentPage, totalPages]);

  const handleOpenDetailsDialog = async (pedido: Pedido) => {
    const pedidoCompleto = await pedidosService.getById(pedido.id);
    setSelectedPedido(pedidoCompleto);
    setShowDetailsDialog(true);
  };

  const handleMarcarEntregado = (id: string) => {
    setPedidoToAction(id);
    setShowEntregadoDialog(true);
  };

  const handleConfirmarEntregado = () => {
    if (pedidoToAction) {
      marcarEntregadoMutation.mutate(pedidoToAction);
      setShowEntregadoDialog(false);
      setPedidoToAction(null);
    }
  };

  const handleCancelarPedido = (id: string) => {
    setPedidoToAction(id);
    setShowCancelarDialog(true);
  };

  const handleConfirmarCancelar = () => {
    if (pedidoToAction) {
      cancelarPedidoMutation.mutate(pedidoToAction);
      setShowCancelarDialog(false);
      setPedidoToAction(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="border-warning text-warning"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="border-primary text-primary"><Send className="h-3 w-3 mr-1" /> Enviado</Badge>;
      case 'entregado':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Entregado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

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
            <h1 className="font-display text-3xl font-bold">Gestión de Pedidos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona todos los pedidos de minoristas y mayoristas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {pedidos.filter(p => p.estado === 'pendiente').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviados</CardTitle>
              <Send className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {pedidos.filter(p => p.estado === 'enviado').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregados</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {pedidos.filter(p => p.estado === 'entregado').length}
              </div>
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
                  placeholder="Buscar por usuario, ID o observaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoUsuarioFilter} onValueChange={setTipoUsuarioFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo Usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="minorista">Minorista</SelectItem>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedPedidos.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay pedidos registrados</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPedidos.map((pedido) => (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {pedido.usuario?.nombre || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {pedido.tipo_usuario}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(pedido.fecha_pedido), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            {pedido.detalles?.length || 0} producto(s)
                          </TableCell>
                          <TableCell>
                            {getEstadoBadge(pedido.estado)}
                          </TableCell>
                          <TableCell>
                            {pedido.fecha_entrega 
                              ? format(new Date(pedido.fecha_entrega), 'dd/MM/yyyy', { locale: es })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDetailsDialog(pedido)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                {(pedido.estado === 'enviado' || pedido.estado === 'pendiente') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleMarcarEntregado(pedido.id)}
                                      disabled={marcarEntregadoMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Marcar como Entregado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleCancelarPedido(pedido.id)}
                                      className="text-destructive"
                                      disabled={cancelarPedidoMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancelar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Usuario</Label>
                  <p className="font-medium">{selectedPedido.usuario?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium capitalize">{selectedPedido.tipo_usuario}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha de Pedido</Label>
                  <p className="font-medium">
                    {format(new Date(selectedPedido.fecha_pedido), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    {getEstadoBadge(selectedPedido.estado)}
                  </div>
                </div>
                {selectedPedido.fecha_entrega && (
                  <div>
                    <Label className="text-muted-foreground">Fecha de Entrega</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPedido.fecha_entrega), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                )}
              </div>
              {selectedPedido.observaciones && (
                <div>
                  <Label className="text-muted-foreground">Observaciones</Label>
                  <p className="font-medium mt-1">{selectedPedido.observaciones}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Productos</Label>
                <div className="mt-2 space-y-2">
                  {selectedPedido.detalles && selectedPedido.detalles.length > 0 ? (
                    selectedPedido.detalles.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{detalle.producto?.nombre || 'N/A'}</span>
                        <Badge variant="outline">{detalle.cantidad} unidades</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay productos</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Cerrar</Button>
            {selectedPedido && (selectedPedido.estado === 'enviado' || selectedPedido.estado === 'pendiente') && (
              <Button 
                onClick={() => {
                  handleMarcarEntregado(selectedPedido.id);
                  setShowDetailsDialog(false);
                }}
                disabled={marcarEntregadoMutation.isPending}
              >
                {marcarEntregadoMutation.isPending ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Entregado
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para marcar como entregado */}
      <AlertDialog open={showEntregadoDialog} onOpenChange={setShowEntregadoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como Entregado?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas marcar este pedido como entregado? Esto actualizará los preregistros del usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPedidoToAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarEntregado}
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={marcarEntregadoMutation.isPending}
            >
              {marcarEntregadoMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Aceptar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación para cancelar pedido */}
      <AlertDialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPedidoToAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarCancelar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelarPedidoMutation.isPending}
            >
              {cancelarPedidoMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Cancelación'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

