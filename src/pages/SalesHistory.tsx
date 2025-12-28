import { useState, useMemo, useEffect } from 'react';
import * as React from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportService } from '@/services/export.service';
import { 
  Search, 
  Calendar, 
  Download, 
  ShoppingBag, 
  Eye, 
  X,
  Loader,
  User,
  Filter,
  FileText,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { useSales, useSaleDetails, useCancelSale } from '@/hooks/useSales';
import { salesService } from '@/services/sales.service';
import { useUsers } from '@/hooks/useUsers';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts';
import { Sale, SaleDetail, Product } from '@/types';
import { printTicket } from '@/utils/print';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

interface SaleWithDetails extends Sale {
  vendedor?: { nombre: string };
  itemCount?: number;
}

export default function SalesHistory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [idVendedor, setIdVendedor] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Obtener usuarios para el filtro (solo admins)
  const { data: users } = useUsers();
  
  // Obtener productos para mostrar en detalles
  const { data: products } = useProducts();

  // Construir filtros
  const filters = useMemo(() => {
    const f: { fechaDesde?: string; fechaHasta?: string; id_vendedor?: string } = {};
    
    if (fechaDesde) f.fechaDesde = fechaDesde;
    if (fechaHasta) f.fechaHasta = fechaHasta;
    
    // Si es vendedor, solo mostrar sus ventas
    if (user?.rol === 'vendedor') {
      f.id_vendedor = user.id;
    } else if (idVendedor) {
      f.id_vendedor = idVendedor;
    }
    
    return f;
  }, [fechaDesde, fechaHasta, idVendedor, user]);

  const { data: sales, isLoading, error } = useSales(filters);
  const { data: saleDetails, isLoading: loadingDetails } = useSaleDetails(
    selectedSale?.id || ''
  );
  const cancelSaleMutation = useCancelSale();

  // Obtener detalles de la venta seleccionada
  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailsDialog(true);
  };

  // Anular venta
  const handleCancelSale = async () => {
    if (!saleToCancel) return;

    try {
      await cancelSaleMutation.mutateAsync({
        id: saleToCancel,
        idUsuarioAnulacion: user?.id,
        motivoAnulacion: motivoAnulacion.trim() || undefined,
      });
      toast.success('Venta anulada exitosamente');
      setShowCancelDialog(false);
      setSaleToCancel(null);
      setMotivoAnulacion('');
    } catch (error: any) {
      toast.error(error.message || 'Error al anular la venta');
    }
  };

  // Imprimir ticket desde diálogo de detalles
  const handlePrintTicket = async () => {
    if (!selectedSale) return;

    try {
      // Obtener detalles de la venta (ya incluye productos desde getDetails)
      let details = saleDetails || [];
      
      // Si saleDetails no tiene productos, obtenerlos nuevamente
      if (details.length === 0 || !(details[0] as any).productos) {
        details = await salesService.getDetails(selectedSale.id);
      }
      
      // Obtener información del vendedor
      const vendedorName = getVendedorName(selectedSale.id_vendedor);

      // Mapear productos correctamente (los detalles ya incluyen productos)
      const detailsWithProducts = details.map((detail: any) => {
        const producto = detail.productos;
        return {
          ...detail,
          producto: producto ? {
            nombre: producto.nombre || 'N/A',
            codigo: producto.codigo || '',
          } : undefined,
        };
      });

      printTicket({
        sale: selectedSale,
        items: detailsWithProducts,
        vendedor: vendedorName,
      });
    } catch (error: any) {
      console.error('Error al imprimir ticket:', error);
      toast.error(error.message || 'Error al imprimir ticket');
    }
  };

  // Imprimir ticket directamente desde la tabla
  const handlePrintTicketFromTable = async (sale: Sale) => {
    try {
      // Obtener detalles de la venta (ya incluye productos)
      const details = await salesService.getDetails(sale.id);
      
      // Obtener información del vendedor
      const vendedorName = getVendedorName(sale.id_vendedor);

      // Los detalles ya incluyen productos desde getDetails
      // Solo necesitamos mapear la estructura correctamente
      const detailsWithProducts = details.map((detail: any) => {
        const producto = detail.productos;
        return {
          ...detail,
          producto: producto ? {
            nombre: producto.nombre || 'N/A',
            codigo: producto.codigo || '',
          } : undefined,
        };
      });

      printTicket({
        sale: sale,
        items: detailsWithProducts,
        vendedor: vendedorName,
      });
    } catch (error: any) {
      console.error('Error al imprimir ticket:', error);
      toast.error(error.message || 'Error al imprimir ticket');
    }
  };

  // Filtrar ventas por término de búsqueda
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    let filtered = sales;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((sale: any) => {
        const detalles = sale.detalle_venta || [];
        const primerDetalle = detalles[0];
        const producto = primerDetalle?.productos;
        const nombreProducto = producto?.nombre || '';
        
        return (
          sale.hora.toLowerCase().includes(term) ||
          sale.total.toString().includes(term) ||
          nombreProducto.toLowerCase().includes(term)
        );
      });
    }
    
    return filtered;
  }, [sales, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [fechaDesde, fechaHasta, idVendedor, searchTerm]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!filteredSales) return { total: 0, count: 0, promedio: 0 };
    
    const completadas = filteredSales.filter(s => s.estado === 'completada');
    const total = completadas.reduce((sum, sale) => sum + sale.total, 0);
    const count = completadas.length;
    const promedio = count > 0 ? total / count : 0;
    
    return { total, count, promedio };
  }, [filteredSales]);

  // Obtener nombre del vendedor
  const getVendedorName = (idVendedor: string) => {
    const vendedor = users?.find(u => u.id === idVendedor);
    return vendedor?.nombre || 'N/A';
  };

  // Obtener cantidad de items de una venta (necesitamos cargar los detalles)
  // Por ahora, mostraremos un placeholder
  const getItemCount = (saleId: string) => {
    // Esto se puede optimizar cargando los detalles en batch
    return '...';
  };

  const getPaymentBadgeVariant = (method: string) => {
    switch (method) {
      case 'efectivo': return 'default';
      case 'qr': return 'secondary';
      case 'transferencia': return 'outline';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Formato esperado: YYYY-MM-DD
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Formatear timestamp ISO a fecha local (evita problemas de zona horaria)
  const formatTimestamp = (timestamp: string) => {
    try {
      // Si es un timestamp ISO, extraer solo la parte de fecha (YYYY-MM-DD)
      // y formatearla manualmente para evitar problemas de zona horaria
      if (timestamp.includes('T')) {
        const datePart = timestamp.split('T')[0];
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
      // Si ya es formato YYYY-MM-DD, usar formatDate
      return formatDate(timestamp);
    } catch {
      return timestamp;
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setIdVendedor('');
    setSearchTerm('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || idVendedor || searchTerm;

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!filteredSales || filteredSales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      await exportService.exportToPDF({
        title: 'HISTORIAL DE VENTAS',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Hora', dataKey: 'hora', width: 20 },
          { header: 'Vendedor', dataKey: 'id_vendedor', width: 40 },
          { header: 'Producto', dataKey: 'producto', width: 50 },
          { header: 'Total', dataKey: 'total', width: 30 },
          { header: 'Método de Pago', dataKey: 'metodo_pago', width: 35 },
          { header: 'Estado', dataKey: 'estado', width: 30 },
        ],
        data: filteredSales.map((sale: any) => {
          const detalles = sale.detalle_venta || [];
          const productos = detalles.map((det: any) => {
            const nombre = det.productos?.nombre || 'N/A';
            return `${det.cantidad}x ${nombre}`;
          }).join(', ');
          
          return {
            ...sale,
            fecha: formatDate(sale.fecha),
            id_vendedor: getVendedorName(sale.id_vendedor),
            producto: productos || 'N/A',
            total: `Bs. ${sale.total.toFixed(2)}`,
            metodo_pago: sale.metodo_pago.charAt(0).toUpperCase() + sale.metodo_pago.slice(1),
            estado: sale.estado === 'completada' ? 'Completada' : 'Anulada',
          };
        }),
        dateRange: {
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        },
        usuario: user?.nombre || 'N/A',
        entity: 'VentaPlus - Sistema de Gestión de Ventas',
        reportType: 'HISTORIAL DE TRANSACCIONES',
      });
      toast.success('Exportación a PDF completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a PDF');
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!filteredSales || filteredSales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      await exportService.exportToExcel({
        title: 'Historial de Ventas',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Hora', dataKey: 'hora', width: 20 },
          { header: 'Vendedor', dataKey: 'id_vendedor', width: 40 },
          { header: 'Producto', dataKey: 'producto', width: 50 },
          { header: 'Total', dataKey: 'total', width: 30 },
          { header: 'Método de Pago', dataKey: 'metodo_pago', width: 35 },
          { header: 'Estado', dataKey: 'estado', width: 30 },
        ],
        data: filteredSales.map((sale: any) => {
          const detalles = sale.detalle_venta || [];
          const productos = detalles.map((det: any) => {
            const nombre = det.productos?.nombre || 'N/A';
            return `${det.cantidad}x ${nombre}`;
          }).join(', ');
          
          return {
            ...sale,
            fecha: formatDate(sale.fecha),
            id_vendedor: getVendedorName(sale.id_vendedor),
            producto: productos || 'N/A',
            total: sale.total,
            metodo_pago: sale.metodo_pago.charAt(0).toUpperCase() + sale.metodo_pago.slice(1),
            estado: sale.estado === 'completada' ? 'Completada' : 'Anulada',
          };
        }),
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

  return (
    <DashboardLayout title="Historial de Ventas">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                      Bs. {stats.total.toFixed(2)}
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
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Ventas</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-16 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      {stats.count}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-success/10 shrink-0">
                  <Download className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Promedio de Ventas</p>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mt-1" />
                  ) : (
                    <p className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                      Bs. {stats.promedio.toFixed(2)}
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
            <CardTitle className="font-display">Historial de Ventas</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
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
                      placeholder="Hora, producto..."
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
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Fecha Hasta */}
                <div className="space-y-2">
                  <Label htmlFor="fechaHasta">Hasta</Label>
                  <DatePicker
                    id="fechaHasta"
                    value={fechaHasta}
                    onChange={setFechaHasta}
                    placeholder="dd/mm/yyyy"
                    min={fechaDesde}
                  />
                </div>

                {/* Vendedor (solo admins) */}
                {user?.rol === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="vendedor">Vendedor</Label>
                    <Select 
                      value={idVendedor || 'all'} 
                      onValueChange={(value) => setIdVendedor(value === 'all' ? '' : value)}
                    >
                      <SelectTrigger id="vendedor">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {users?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

            </div>

            {/* Table */}
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                Error al cargar las ventas: {error.message}
              </div>
            )}

            <div className="rounded-lg border overflow-x-auto">
              <div className="min-w-[500px]">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {user?.rol === 'admin' && <TableHead>Vendedor</TableHead>}
                    <TableHead>Producto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        {user?.rol === 'admin' && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={user?.rol === 'admin' ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        No se encontraron ventas
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale: any) => {
                      const detalles = sale.detalle_venta || [];
                      const primerDetalle = detalles[0];
                      const producto = primerDetalle?.productos;
                      const nombreProducto = producto?.nombre || 'N/A';
                      
                      return (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatDate(sale.fecha)}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {sale.hora}
                              </p>
                            </div>
                          </TableCell>
                          {user?.rol === 'admin' && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {getVendedorName(sale.id_vendedor)}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <p className="font-medium text-foreground">{nombreProducto}</p>
                            {detalles.length > 1 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                +{detalles.length - 1} producto{detalles.length > 2 ? 's' : ''} más
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentBadgeVariant(sale.metodo_pago)} className="capitalize">
                              {sale.metodo_pago}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={sale.estado === 'completada' ? 'default' : 'destructive'}
                              className="capitalize"
                            >
                              {sale.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            Bs. {sale.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(sale)}
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {sale.estado === 'completada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePrintTicketFromTable(sale)}
                                  title="Imprimir ticket"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              )}
                              {user?.rol === 'admin' && sale.estado === 'completada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSaleToCancel(sale.id);
                                    setShowCancelDialog(true);
                                  }}
                                  title="Anular venta"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredSales.length)} de {filteredSales.length} ventas
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
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Venta</DialogTitle>
            <DialogDescription>
              Venta #{selectedSale?.id.slice(0, 8)} - {selectedSale && formatDate(selectedSale.fecha)} {selectedSale?.hora}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4 py-4">
              {/* Información de la venta */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-display text-2xl font-bold">Bs. {selectedSale.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <Badge variant={getPaymentBadgeVariant(selectedSale.metodo_pago)} className="capitalize mt-1">
                    {selectedSale.metodo_pago}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge 
                    variant={selectedSale.estado === 'completada' ? 'default' : 'destructive'}
                    className="capitalize mt-1"
                  >
                    {selectedSale.estado}
                  </Badge>
                </div>
                {user?.rol === 'admin' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedor</p>
                    <p className="font-medium mt-1">{getVendedorName(selectedSale.id_vendedor)}</p>
                  </div>
                )}
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-semibold mb-2">Productos</h4>
                {loadingDetails ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : saleDetails && saleDetails.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetails.map((detail) => {
                          const product = products?.find((p: Product) => p.id === detail.id_producto);
                          return (
                            <TableRow key={detail.id}>
                              <TableCell>
                                {product ? (
                                  <div>
                                    <p className="font-medium">{product.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Código: {product.codigo}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="font-medium">Producto #{detail.id_producto.slice(0, 8)}</p>
                                )}
                              </TableCell>
                            <TableCell>{detail.cantidad}</TableCell>
                            <TableCell className="text-right">Bs. {detail.precio_unitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              Bs. {detail.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No se encontraron productos</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedSale && selectedSale.estado === 'completada' && (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto gap-2" 
                onClick={handlePrintTicket}
              >
                <Printer className="h-4 w-4" />
                Imprimir Ticket
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => setShowDetailsDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Sale Dialog */}
      <AlertDialog 
        open={showCancelDialog} 
        onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) {
            setSaleToCancel(null);
            setMotivoAnulacion('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará la venta y revertirá el stock de los productos vendidos.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-anulacion">Motivo de anulación (opcional)</Label>
              <Input
                id="motivo-anulacion"
                placeholder="Ej: Error en el precio, cliente canceló, etc."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                disabled={cancelSaleMutation.isPending}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setSaleToCancel(null);
                setMotivoAnulacion('');
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelSaleMutation.isPending}
            >
              {cancelSaleMutation.isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                'Anular Venta'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
