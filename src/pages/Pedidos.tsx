import { useState, useEffect, useMemo } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Plus, 
  Package,
  MoreHorizontal, 
  Edit,
  Eye,
  Trash2,
  Send,
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronsUpDown
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Pedido, DetallePedido, PreregistroMinorista, PreregistroMayorista } from '@/types';
import { pedidosService } from '@/services/pedidos.service';
import { preregistrosService } from '@/services/preregistros.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { getLocalDateISO } from '@/lib/utils';

export default function Pedidos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [cantidadProducto, setCantidadProducto] = useState<string>('1');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [detallesPedido, setDetallesPedido] = useState<Array<{ id_producto: string; cantidad: number; nombre: string }>>([]);
  const [observaciones, setObservaciones] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState<string | null>(null);
  const itemsPerPage = 20;

  // Obtener preregistros según el rol
  const { data: preregistros = [], isLoading: loadingPreregistros } = useQuery({
    queryKey: ['preregistros', user?.rol, user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (user.rol === 'minorista') {
        return await preregistrosService.getPreregistrosMinorista(user.id);
      } else if (user.rol === 'mayorista') {
        const fecha = getLocalDateISO();
        return await preregistrosService.getPreregistrosMayorista(user.id, fecha);
      }
      return [];
    },
    enabled: !!user && (user.rol === 'minorista' || user.rol === 'mayorista'),
  });

  // Obtener productos de preregistros (solo productos que tienen preregistro)
  const productosDisponibles = useMemo(() => {
    // Filtrar solo productos que tienen preregistro activo
    return preregistros
      .filter(p => p.producto && p.cantidad > 0)
      .map(p => ({
        id: p.producto!.id,
        nombre: p.producto!.nombre,
        codigo: p.producto!.codigo || '',
        cantidad_preregistrada: p.cantidad,
        aumento_actual: p.aumento || 0,
      }))
      .filter((p, index, self) => 
        // Eliminar duplicados por ID de producto
        index === self.findIndex(pr => pr.id === p.id)
      );
  }, [preregistros]);

  const productosFiltrados = productosDisponibles.filter(p =>
    p.nombre.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Obtener pedidos
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos', user?.id, estadoFilter],
    queryFn: async () => {
      if (!user) return [];
      const estado = estadoFilter === 'todos' ? undefined : estadoFilter;
      return await pedidosService.getAll(user.id);
    },
    enabled: !!user && (user?.rol === 'minorista' || user?.rol === 'mayorista'),
  });

  // Filtrar por estado
  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidos;
    
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(p => p.estado === estadoFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [pedidos, estadoFilter, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(pedidosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPedidos = pedidosFiltrados.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [pedidosFiltrados.length, currentPage, totalPages]);

  // Mutación para crear pedido
  const createPedidoMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');
      if (detallesPedido.length === 0) throw new Error('Debes agregar al menos un producto');
      
      return await pedidosService.create(
        user.id,
        user.rol as 'minorista' | 'mayorista',
        detallesPedido.map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad })),
        observaciones.trim() || undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido creado exitosamente');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el pedido');
    },
  });

  // Mutación para actualizar pedido
  const updatePedidoMutation = useMutation({
    mutationFn: async ({ id, detalles, observaciones }: { id: string; detalles: Array<{ id_producto: string; cantidad: number }>; observaciones?: string }) => {
      // Primero eliminar todos los detalles existentes
      const pedido = await pedidosService.getById(id);
      if (pedido?.detalles) {
        for (const detalle of pedido.detalles) {
          await pedidosService.deleteDetalle(detalle.id);
        }
      }
      
      // Crear nuevos detalles
      for (const detalle of detalles) {
        await pedidosService.addDetalle(id, detalle.id_producto, detalle.cantidad);
      }
      
      // Actualizar observaciones si se proporcionaron
      if (observaciones !== undefined) {
        await pedidosService.update(id, { observaciones });
      }
      
      return await pedidosService.getById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido actualizado exitosamente');
      setShowEditDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el pedido');
    },
  });

  // Mutación para enviar pedido
  const enviarPedidoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await pedidosService.update(id, { estado: 'enviado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido enviado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al enviar el pedido');
    },
  });

  // Mutación para eliminar pedido
  const deletePedidoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await pedidosService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar el pedido');
    },
  });

  const resetForm = () => {
    setDetallesPedido([]);
    setSelectedProduct('');
    setCantidadProducto('1');
    setProductSearchTerm('');
    setObservaciones('');
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEditDialog = async (pedido: Pedido) => {
    setSelectedPedido(pedido);
    const pedidoCompleto = await pedidosService.getById(pedido.id);
    if (pedidoCompleto) {
      setDetallesPedido(
        pedidoCompleto.detalles?.map(d => ({
          id_producto: d.id_producto,
          cantidad: d.cantidad,
          nombre: d.producto?.nombre || 'N/A',
        })) || []
      );
      setObservaciones(pedidoCompleto.observaciones || '');
    }
    setShowEditDialog(true);
  };

  const handleOpenDetailsDialog = async (pedido: Pedido) => {
    const pedidoCompleto = await pedidosService.getById(pedido.id);
    setSelectedPedido(pedidoCompleto);
    setShowDetailsDialog(true);
  };

  const handleAddProducto = () => {
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    const cantidad = parseInt(cantidadProducto);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    const producto = productosDisponibles.find(p => p.id === selectedProduct);
    if (!producto) {
      toast.error('Producto no encontrado');
      return;
    }

    // Verificar si ya existe en los detalles
    const existe = detallesPedido.find(d => d.id_producto === selectedProduct);
    if (existe) {
      // Actualizar cantidad
      setDetallesPedido(prev =>
        prev.map(d =>
          d.id_producto === selectedProduct
            ? { ...d, cantidad: cantidad }
            : d
        )
      );
    } else {
      // Agregar nuevo
      setDetallesPedido(prev => [
        ...prev,
        {
          id_producto: selectedProduct,
          cantidad,
          nombre: producto.nombre,
        },
      ]);
    }

    setSelectedProduct('');
    setCantidadProducto('1');
    setProductSearchTerm('');
    setProductSearchOpen(false);
  };

  const handleRemoveProducto = (idProducto: string) => {
    setDetallesPedido(prev => prev.filter(d => d.id_producto !== idProducto));
  };

  const handleCreatePedido = () => {
    if (detallesPedido.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }
    createPedidoMutation.mutate();
  };

  const handleUpdatePedido = () => {
    if (!selectedPedido) return;
    if (detallesPedido.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }
    
    updatePedidoMutation.mutate({
      id: selectedPedido.id,
      detalles: detallesPedido.map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad })),
      observaciones: observaciones.trim() || undefined,
    });
  };

  const handleEnviarPedido = (id: string) => {
    enviarPedidoMutation.mutate(id);
  };

  const handleDeletePedido = (id: string) => {
    setPedidoToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmarEliminar = () => {
    if (pedidoToDelete) {
      deletePedidoMutation.mutate(pedidoToDelete);
      setShowDeleteDialog(false);
      setPedidoToDelete(null);
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

  // Verificación de permisos: si no hay usuario o no es minorista/mayorista, mostrar mensaje
  if (!user || (user.rol !== 'minorista' && user.rol !== 'mayorista')) {
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
            <h1 className="font-display text-3xl font-bold">Historial de Pedidos</h1>
            <p className="text-muted-foreground mt-1">
              Visualiza y gestiona todos tus pedidos de productos basados en tus preregistros
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Button>
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
                  placeholder="Buscar por ID o observaciones..."
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
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pedidos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Visualiza todos tus pedidos, su estado y detalles
            </p>
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
                        <TableHead>ID</TableHead>
                        <TableHead>Fecha Pedido</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Total Unidades</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPedidos.map((pedido) => {
                        const totalUnidades = pedido.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
                        return (
                          <TableRow key={pedido.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">
                              {pedido.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {(() => {
                                    // Formatear fecha directamente desde YYYY-MM-DD sin conversión a Date
                                    // para evitar problemas de zona horaria
                                    if (pedido.fecha_pedido) {
                                      const fechaStr = pedido.fecha_pedido.split('T')[0];
                                      const [year, month, day] = fechaStr.split('-');
                                      return `${day}/${month}/${year}`;
                                    }
                                    return '-';
                                  })()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(pedido.created_at), 'HH:mm', { locale: es })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{pedido.detalles?.length || 0} producto(s)</span>
                                {pedido.detalles && pedido.detalles.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {pedido.detalles.slice(0, 2).map(d => d.producto?.nombre).filter(Boolean).join(', ')}
                                    {pedido.detalles.length > 2 && '...'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">{totalUnidades} unidades</Badge>
                            </TableCell>
                            <TableCell>
                              {getEstadoBadge(pedido.estado)}
                            </TableCell>
                            <TableCell>
                              {pedido.fecha_entrega 
                                ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {(() => {
                                        // Formatear fecha directamente desde YYYY-MM-DD sin conversión a Date
                                        const fechaStr = pedido.fecha_entrega.split('T')[0];
                                        const [year, month, day] = fechaStr.split('-');
                                        return `${day}/${month}/${year}`;
                                      })()}
                                    </span>
                                    <span className="text-xs text-success">✓ Entregado</span>
                                  </div>
                                )
                                : <span className="text-muted-foreground">-</span>
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
                                    Ver Detalles Completos
                                  </DropdownMenuItem>
                                  {pedido.estado === 'pendiente' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleOpenEditDialog(pedido)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleEnviarPedido(pedido.id)}
                                        disabled={enviarPedidoMutation.isPending}
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeletePedido(pedido.id)}
                                        className="text-destructive"
                                        disabled={deletePedidoMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {pedido.estado === 'enviado' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                        Esperando entrega del administrador
                                      </div>
                                    </>
                                  )}
                                  {pedido.estado === 'entregado' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <div className="px-2 py-1.5 text-xs text-success">
                                        ✓ Productos agregados a preregistros
                                      </div>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
          setSelectedPedido(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Editar Pedido' : 'Nuevo Pedido'}</DialogTitle>
            <DialogDescription>
              {showEditDialog 
                ? 'Modifica los productos y observaciones de tu pedido'
                : 'Crea un nuevo pedido basado en tus preregistros'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Agregar Producto */}
            <div className="space-y-2">
              <Label>Agregar Producto</Label>
              <div className="flex gap-2">
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between"
                    >
                      {selectedProduct
                        ? productosDisponibles.find(p => p.id === selectedProduct)?.nombre
                        : 'Seleccionar producto...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar producto..." 
                        value={productSearchTerm}
                        onValueChange={setProductSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {productosFiltrados.map((producto) => (
                            <CommandItem
                              key={producto.id}
                              value={`${producto.nombre} ${producto.codigo}`}
                              onSelect={() => {
                                setSelectedProduct(producto.id);
                                setProductSearchOpen(false);
                              }}
                            >
                              <CheckCircle
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProduct === producto.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{producto.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  Preregistrado: {producto.cantidad_preregistrada} unidades
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  type="number"
                  min="1"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  placeholder="Cantidad"
                  className="w-24"
                />
                <Button onClick={handleAddProducto} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lista de Productos */}
            {detallesPedido.length > 0 && (
              <div className="space-y-2">
                <Label>Productos del Pedido</Label>
                <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                  {detallesPedido.map((detalle) => (
                    <div key={detalle.id_producto} className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <p className="font-medium">{detalle.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad: {detalle.cantidad}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProducto(detalle.id_producto)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-2">
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales sobre el pedido..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setShowEditDialog(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={showEditDialog ? handleUpdatePedido : handleCreatePedido}
              disabled={
                detallesPedido.length === 0 ||
                createPedidoMutation.isPending ||
                updatePedidoMutation.isPending
              }
            >
              {(createPedidoMutation.isPending || updatePedidoMutation.isPending) ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {showEditDialog ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                showEditDialog ? 'Actualizar Pedido' : 'Crear Pedido'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles Completos del Pedido</DialogTitle>
            <DialogDescription>
              Información detallada del pedido y sus productos
            </DialogDescription>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-6 py-4">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID del Pedido</Label>
                  <p className="font-mono text-sm font-medium">{selectedPedido.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Usuario</Label>
                  <p className="font-medium capitalize">{selectedPedido.tipo_usuario}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha de Pedido</Label>
                  <p className="font-medium">
                    {(() => {
                      // Formatear fecha directamente desde YYYY-MM-DD sin conversión a Date
                      if (selectedPedido.fecha_pedido) {
                        const fechaStr = selectedPedido.fecha_pedido.split('T')[0];
                        const [year, month, day] = fechaStr.split('-');
                        return `${day}/${month}/${year}`;
                      }
                      return '-';
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selectedPedido.created_at), 'HH:mm:ss', { locale: es })}
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
                      {(() => {
                        // Formatear fecha directamente desde YYYY-MM-DD sin conversión a Date
                        const fechaStr = selectedPedido.fecha_entrega.split('T')[0];
                        const [year, month, day] = fechaStr.split('-');
                        return `${day}/${month}/${year}`;
                      })()}
                    </p>
                    <p className="text-xs text-success mt-1">
                      ✓ Productos agregados a preregistros
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Última Actualización</Label>
                  <p className="font-medium text-sm">
                    {format(new Date(selectedPedido.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              {selectedPedido.observaciones && (
                <div>
                  <Label className="text-muted-foreground">Observaciones</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedPedido.observaciones}</p>
                  </div>
                </div>
              )}

              {/* Productos del Pedido */}
              <div>
                <Label className="text-muted-foreground mb-3 block">Productos del Pedido</Label>
                <div className="border rounded-lg divide-y">
                  {selectedPedido.detalles && selectedPedido.detalles.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 p-3 bg-muted font-medium text-sm">
                        <div>Producto</div>
                        <div className="text-center">Código</div>
                        <div className="text-right">Cantidad</div>
                      </div>
                      {selectedPedido.detalles.map((detalle) => (
                        <div key={detalle.id} className="grid grid-cols-3 gap-4 p-3 items-center hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium">{detalle.producto?.nombre || 'N/A'}</p>
                            {detalle.producto?.codigo && (
                              <p className="text-xs text-muted-foreground">
                                Código: {detalle.producto.codigo}
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              {detalle.producto?.codigo || 'N/A'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-base px-3 py-1">
                              {detalle.cantidad} unidades
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-primary/5 border-t-2 border-primary">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total de Unidades:</span>
                          <Badge variant="default" className="text-base px-3 py-1">
                            {selectedPedido.detalles.reduce((sum, d) => sum + d.cantidad, 0)} unidades
                          </Badge>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay productos en este pedido</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Estado */}
              {selectedPedido.estado === 'entregado' && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-success mb-1">Pedido Entregado</p>
                      <p className="text-sm text-muted-foreground">
                        Los productos de este pedido han sido agregados al campo "aumento" de tus preregistros. 
                        Puedes verlos en la página "Nueva Venta" cuando inicies una venta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPedido.estado === 'enviado' && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Send className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-primary mb-1">Pedido Enviado</p>
                      <p className="text-sm text-muted-foreground">
                        Tu pedido ha sido enviado al administrador y está esperando ser entregado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPedido.estado === 'pendiente' && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-warning mb-1">Pedido Pendiente</p>
                      <p className="text-sm text-muted-foreground">
                        Tu pedido está pendiente de envío. Puedes editarlo o enviarlo cuando esté listo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Cerrar</Button>
            {selectedPedido && selectedPedido.estado === 'pendiente' && (
              <Button onClick={() => {
                setShowDetailsDialog(false);
                handleOpenEditDialog(selectedPedido);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Pedido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar pedido */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPedidoToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePedidoMutation.isPending}
            >
              {deletePedidoMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

