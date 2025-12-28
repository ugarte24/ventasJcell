import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { exportService } from '@/services/export.service';
import { 
  Search, 
  Calendar, 
  Download, 
  Package, 
  ArrowUp, 
  ArrowDown,
  Filter,
  X,
  FileText,
  FileSpreadsheet,
  Plus,
  Loader,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { useInventoryMovements, useCreateInventoryMovement, useCancelInventoryMovement } from '@/hooks/useInventoryMovements';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts';
import { InventoryMovement, CreateInventoryMovementData } from '@/services/inventory-movements.service';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';

// Esquema de validación para crear movimiento
const createMovementSchema = z.object({
  id_producto: z.string().min(1, 'Debe seleccionar un producto'),
  tipo_movimiento: z.enum(['entrada', 'salida'], {
    required_error: 'Debe seleccionar un tipo de movimiento',
  }),
  cantidad: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  motivo: z.enum(['venta', 'ajuste', 'compra', 'devolución'], {
    required_error: 'Debe seleccionar un motivo',
  }),
  fecha: z.string().optional(),
  observacion: z.string().optional(),
});

type CreateMovementForm = z.infer<typeof createMovementSchema>;

export default function InventoryMovements() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [idProducto, setIdProducto] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida' | ''>('');
  const [motivo, setMotivo] = useState<'venta' | 'ajuste' | 'compra' | 'devolución' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [movementToCancel, setMovementToCancel] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Obtener productos para el filtro
  const { data: products } = useProducts();
  const createMovementMutation = useCreateInventoryMovement();
  const cancelMovementMutation = useCancelInventoryMovement();

  // Formulario para crear movimiento (debe estar antes de usarlo)
  const createForm = useForm<CreateMovementForm>({
    resolver: zodResolver(createMovementSchema),
    defaultValues: {
      tipo_movimiento: 'entrada',
      motivo: 'compra', // Cambiado de 'ajuste' a 'compra' como valor por defecto más común
      cantidad: 0,
      fecha: '',
      observacion: '',
    },
  });

  // Filtrar productos localmente para el combobox de creación
  const filteredProductsForSelect = useMemo(() => {
    if (!products) return [];
    const activeProducts = products.filter(p => p.estado === 'activo');
    
    if (!productSearchTerm) return activeProducts;
    
    const term = productSearchTerm.toLowerCase();
    return activeProducts.filter(product =>
      product.nombre.toLowerCase().includes(term) ||
      product.codigo.toLowerCase().includes(term)
    );
  }, [products, productSearchTerm]);

  // Obtener el producto seleccionado en creación
  const selectedProduct = products?.find(p => p.id === createForm.watch('id_producto'));

  // Construir filtros
  const filters = useMemo(() => {
    const f: {
      fechaDesde?: string;
      fechaHasta?: string;
      id_producto?: string;
      tipo_movimiento?: 'entrada' | 'salida';
      motivo?: 'venta' | 'ajuste' | 'compra' | 'devolución';
    } = {};
    
    if (fechaDesde) f.fechaDesde = fechaDesde;
    if (fechaHasta) f.fechaHasta = fechaHasta;
    if (idProducto) f.id_producto = idProducto;
    if (tipoMovimiento) f.tipo_movimiento = tipoMovimiento;
    if (motivo) f.motivo = motivo;
    
    return f;
  }, [fechaDesde, fechaHasta, idProducto, tipoMovimiento, motivo]);

  const { data: movements, isLoading, error } = useInventoryMovements(filters);

  // Filtrar movimientos por término de búsqueda
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    
    let filtered = movements;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (movement) =>
          movement.id.toLowerCase().includes(term) ||
          movement.producto?.nombre.toLowerCase().includes(term) ||
          movement.producto?.codigo.toLowerCase().includes(term) ||
          movement.usuario?.nombre.toLowerCase().includes(term) ||
          movement.observacion?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [movements, searchTerm]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!filteredMovements) return { entradas: 0, salidas: 0, total: 0 };
    
    const entradas = filteredMovements
      .filter(m => m.tipo_movimiento === 'entrada')
      .reduce((sum, m) => sum + m.cantidad, 0);
    const salidas = filteredMovements
      .filter(m => m.tipo_movimiento === 'salida')
      .reduce((sum, m) => sum + m.cantidad, 0);
    const total = filteredMovements.length;
    
    return { entradas, salidas, total };
  }, [filteredMovements]);

  const getTipoMovimientoBadge = (tipo: 'entrada' | 'salida') => {
    if (tipo === 'entrada') {
      return <Badge variant="default" className="bg-success/10 text-success border-success/20">
        <ArrowUp className="mr-1 h-3 w-3" />
        Entrada
      </Badge>;
    }
    return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
      <ArrowDown className="mr-1 h-3 w-3" />
      Salida
    </Badge>;
  };

  const getMotivoBadge = (motivo: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      'venta': 'destructive',
      'ajuste': 'secondary',
      'compra': 'default',
      'devolución': 'outline',
    } as any;
    
    const labels: Record<string, string> = {
      'venta': 'Venta',
      'ajuste': 'Ajuste',
      'compra': 'Compra',
      'devolución': 'Devolución',
    };

    return (
      <Badge variant={variants[motivo] || 'default'} className="capitalize">
        {labels[motivo] || motivo}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      // La fecha ahora viene como string YYYY-MM-DD (tipo date en BD)
      // Igual que en ventas, simplemente formatear
      const [year, month, day] = dateString.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return format(fecha, 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setIdProducto('');
    setTipoMovimiento('');
    setMotivo('');
    setSearchTerm('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || idProducto || tipoMovimiento || motivo || searchTerm;

  // Crear movimiento
  const handleCreateMovement = async (data: CreateMovementForm) => {
    try {
      // Si no se proporciona fecha, usar la fecha local del cliente
      let fecha = data.fecha;
      if (!fecha) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        fecha = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      const movementData: CreateInventoryMovementData = {
        id_producto: data.id_producto,
        tipo_movimiento: data.tipo_movimiento,
        cantidad: data.cantidad,
        motivo: data.motivo,
        fecha: fecha,
        id_usuario: user?.id || null,
        observacion: data.observacion || undefined,
      };

      await createMovementMutation.mutateAsync(movementData);
      toast.success('Movimiento de inventario creado exitosamente');
      setIsCreateDialogOpen(false);
      setProductSearchOpen(false);
      setProductSearchTerm('');
      createForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el movimiento');
    }
  };

  // Anular movimiento
  const handleCancelMovement = async () => {
    if (!movementToCancel) return;

    try {
      await cancelMovementMutation.mutateAsync({
        id: movementToCancel,
        idUsuarioAnulacion: user?.id,
        motivoAnulacion: motivoAnulacion.trim() || undefined,
      });
      toast.success('Movimiento anulado exitosamente');
      setIsCancelDialogOpen(false);
      setMovementToCancel(null);
      setMotivoAnulacion('');
    } catch (error: any) {
      toast.error(error.message || 'Error al anular el movimiento');
    }
  };

  // Paginación
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [fechaDesde, fechaHasta, idProducto, tipoMovimiento, motivo, searchTerm]);

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      await exportService.exportToPDF({
        title: 'INVENTARIO',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Producto', dataKey: 'producto.nombre', width: 50 },
          { header: 'Código', dataKey: 'producto.codigo', width: 30 },
          { header: 'Tipo', dataKey: 'tipo_movimiento', width: 25 },
          { header: 'Cantidad', dataKey: 'cantidad', width: 25 },
          { header: 'Motivo', dataKey: 'motivo', width: 30 },
          { header: 'Usuario', dataKey: 'usuario.nombre', width: 40 },
          { header: 'Observación', dataKey: 'observacion', width: 50 },
        ],
        data: filteredMovements.map(movement => ({
          ...movement,
          tipo_movimiento: movement.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
          motivo: movement.motivo.charAt(0).toUpperCase() + movement.motivo.slice(1),
        })),
        dateRange: {
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        },
        usuario: user?.nombre || 'N/A',
        entity: 'J-Cell - Sistema de Gestión de Ventas',
        reportType: 'MOVIMIENTOS DE INVENTARIO',
      });
      toast.success('Exportación a PDF completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a PDF');
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      await exportService.exportToExcel({
        title: 'Movimientos de Inventario',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Producto', dataKey: 'producto.nombre', width: 50 },
          { header: 'Código', dataKey: 'producto.codigo', width: 30 },
          { header: 'Tipo', dataKey: 'tipo_movimiento', width: 25 },
          { header: 'Cantidad', dataKey: 'cantidad', width: 25 },
          { header: 'Motivo', dataKey: 'motivo', width: 30 },
          { header: 'Usuario', dataKey: 'usuario.nombre', width: 40 },
          { header: 'Observación', dataKey: 'observacion', width: 50 },
        ],
        data: filteredMovements.map(movement => ({
          ...movement,
          tipo_movimiento: movement.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
          motivo: movement.motivo.charAt(0).toUpperCase() + movement.motivo.slice(1),
        })),
        dateRange: {
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        },
      });
      toast.success('Exportación a Excel completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a Excel');
    }
  };

  if (error) {
    return (
      <DashboardLayout title="Movimientos de Inventario">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Error al cargar movimientos: {error.message}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Movimientos de Inventario">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-success/10 shrink-0">
                  <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Entradas</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-16 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      {stats.entradas}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                  <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Salidas</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-16 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      {stats.salidas}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Movimientos</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-16 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      {stats.total}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="font-display">Historial de Movimientos</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                className="gap-2 w-full sm:w-auto"
                onClick={() => {
                  createForm.reset();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Movimiento</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleClearFilters}
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpiar Filtros</span>
                  <span className="sm:hidden">Limpiar</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                    <span className="sm:hidden">Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar a PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar a Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Búsqueda */}
                <div className="space-y-2">
                  <Label htmlFor="buscar">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="buscar"
                      placeholder="Producto, código, usuario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Fecha Desde */}
                <div className="space-y-2">
                  <Label htmlFor="fechaDesde">Desde</Label>
                  <DatePicker
                    id="fechaDesde"
                    value={fechaDesde}
                    onChange={setFechaDesde}
                    placeholder="Seleccionar fecha"
                  />
                </div>

                {/* Fecha Hasta */}
                <div className="space-y-2">
                  <Label htmlFor="fechaHasta">Hasta</Label>
                  <DatePicker
                    id="fechaHasta"
                    value={fechaHasta}
                    onChange={setFechaHasta}
                    placeholder="Seleccionar fecha"
                  />
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <Label htmlFor="producto">Producto</Label>
                  <Select value={idProducto || undefined} onValueChange={(value) => setIdProducto(value || '')}>
                    <SelectTrigger id="producto">
                      <SelectValue placeholder="Todos los productos" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.nombre} ({product.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Tipo de Movimiento */}
                <div className="space-y-2">
                  <Label htmlFor="tipoMovimiento">Tipo de Movimiento</Label>
                  <Select value={tipoMovimiento || undefined} onValueChange={(value) => setTipoMovimiento(value as 'entrada' | 'salida' | '')}>
                    <SelectTrigger id="tipoMovimiento">
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Select value={motivo || undefined} onValueChange={(value) => setMotivo(value as 'venta' | 'ajuste' | 'compra' | 'devolución' | '')}>
                    <SelectTrigger id="motivo">
                      <SelectValue placeholder="Todos los motivos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="devolución">Devolución</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedMovements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron movimientos
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-medium">
                              {formatDate(movement.fecha)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{movement.producto?.nombre || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {movement.producto?.codigo || 'Sin código'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getTipoMovimientoBadge(movement.tipo_movimiento)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.cantidad}
                            </TableCell>
                            <TableCell>
                              {getMotivoBadge(movement.motivo)}
                            </TableCell>
                            <TableCell>
                              {movement.usuario?.nombre || 'Sistema'}
                            </TableCell>
                            <TableCell>
                              {movement.estado === 'anulado' ? (
                                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                  Anulado
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-success/10 text-success border-success/20">
                                  Activo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {movement.estado !== 'anulado' && movement.motivo !== 'venta' && user?.rol === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setMovementToCancel(movement.id);
                                    setIsCancelDialogOpen(true);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} - {Math.min(endIndex, filteredMovements.length)} de {filteredMovements.length} movimientos
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Mostrar primera página, última página, página actual y páginas adyacentes
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
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
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
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

      {/* Create Movement Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setProductSearchOpen(false);
            setProductSearchTerm('');
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
            <DialogDescription>
              Registra una entrada o salida de inventario
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createForm.handleSubmit(handleCreateMovement)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Producto */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="id_producto">Producto *</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSearchOpen}
                      className="w-full justify-between h-10"
                      id="id_producto"
                      type="button"
                    >
                      {selectedProduct
                        ? `${selectedProduct.nombre} (${selectedProduct.codigo}) - Stock: ${selectedProduct.stock_actual}`
                        : "Seleccionar producto"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar producto por nombre o código..."
                        value={productSearchTerm}
                        onValueChange={setProductSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {filteredProductsForSelect.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.nombre} ${product.codigo}`}
                              onSelect={() => {
                                createForm.setValue('id_producto', product.id);
                                setProductSearchOpen(false);
                                setProductSearchTerm('');
                              }}
                              className="group"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  createForm.watch('id_producto') === product.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{product.nombre}</div>
                                <div className="text-xs text-muted-foreground group-hover:text-white transition-colors">
                                  {product.codigo} - Stock: {product.stock_actual}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {createForm.formState.errors.id_producto && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.id_producto.message}
                  </p>
                )}
              </div>

              {/* Tipo de Movimiento */}
              <div className="space-y-2">
                <Label htmlFor="tipo_movimiento">Tipo *</Label>
                <Select
                  value={createForm.watch('tipo_movimiento')}
                  onValueChange={(value) => createForm.setValue('tipo_movimiento', value as 'entrada' | 'salida')}
                >
                  <SelectTrigger id="tipo_movimiento">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.tipo_movimiento && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.tipo_movimiento.message}
                  </p>
                )}
              </div>

              {/* Cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...createForm.register('cantidad', { valueAsNumber: true })}
                />
                {createForm.formState.errors.cantidad && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.cantidad.message}
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Select
                  value={createForm.watch('motivo')}
                  onValueChange={(value) => createForm.setValue('motivo', value as 'ajuste' | 'compra' | 'devolución')}
                >
                  <SelectTrigger id="motivo">
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="devolución">Devolución</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.motivo && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.motivo.message}
                  </p>
                )}
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <DatePicker
                  id="fecha"
                  value={createForm.watch('fecha') || ''}
                  onChange={(value) => createForm.setValue('fecha', value || '')}
                  placeholder="Fecha del movimiento"
                />
              </div>

              {/* Observación */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="observacion">Observación</Label>
                <Textarea
                  id="observacion"
                  {...createForm.register('observacion')}
                  placeholder="Observaciones adicionales (opcional)"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Movimiento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Movement Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular movimiento de inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción revertirá el stock del producto y marcará el movimiento como anulado.
              El movimiento permanecerá en el historial pero no afectará el stock.
              <br /><br />
              <strong>Nota:</strong> No se pueden anular movimientos generados por ventas. 
              Para anularlos, debes anular la venta completa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivoAnulacion">Motivo de anulación (opcional)</Label>
              <Textarea
                id="motivoAnulacion"
                placeholder="Ingresa el motivo de la anulación..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setMotivoAnulacion('');
                setMovementToCancel(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelMovement}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMovementMutation.isPending}
            >
              {cancelMovementMutation.isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                'Anular Movimiento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

