import { useState, useMemo } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader,
  Eye,
  Plus,
  Trash2,
  MoreVertical,
  Printer
} from 'lucide-react';
import { useCreditSales } from '@/hooks/useCreditSales';
import { useCreditPayments, useCreditPaymentsBySale, useCreateCreditPayment, useDeleteCreditPayment } from '@/hooks/useCreditPayments';
import { useSaleDetails } from '@/hooks/useSales';
import { printTicket } from '@/utils/print';
import { salesService } from '@/services/sales.service';
import { useAuth } from '@/contexts';
import { Sale, CreditPayment } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';

const registerPaymentSchema = z.object({
  numero_cuota: z.number().min(1, 'Debes seleccionar una cuota'),
  monto_pagado: z.number().min(0.01, 'El monto debe ser mayor a cero'),
  fecha_pago: z.string().min(1, 'La fecha de pago es requerida'),
  metodo_pago: z.enum(['efectivo', 'qr', 'transferencia']),
  observacion: z.string().optional(),
});

type RegisterPaymentForm = z.infer<typeof registerPaymentSchema>;

interface SaleWithClient extends Sale {
  clientes?: {
    id: string;
    nombre: string;
    ci_nit?: string;
    telefono?: string;
  };
  detalle_venta?: Array<{
    productos?: {
      nombre: string;
    };
    cantidad: number;
    precio_unitario: number;
  }>;
}

export default function CreditSales() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoCredito, setEstadoCredito] = useState<'pendiente' | 'pagado' | 'parcial' | 'vencido' | 'todos'>('todos');
  const [selectedSale, setSelectedSale] = useState<SaleWithClient | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<CreditPayment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filters = useMemo(() => {
    const f: any = {};
    if (estadoCredito !== 'todos') {
      f.estado_credito = estadoCredito;
    }
    return f;
  }, [estadoCredito]);

  const { data: creditSales = [], isLoading } = useCreditSales(filters);
  const { data: paymentHistory = [] } = useCreditPaymentsBySale(selectedSale?.id || '');
  // Cargar todos los pagos para mostrar estado de cuotas en la tabla
  const { data: allPayments = [] } = useCreditPayments();
  // Cargar detalles de la venta para mostrar productos
  const { data: saleDetails = [] } = useSaleDetails(selectedSale?.id || '');
  const createPaymentMutation = useCreateCreditPayment();
  const deletePaymentMutation = useDeleteCreditPayment();

  // Función para obtener fecha de hoy en formato YYYY-MM-DD (hora local)
  const getTodayLocalDate = () => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const paymentForm = useForm<RegisterPaymentForm>({
    resolver: zodResolver(registerPaymentSchema),
    defaultValues: {
      monto_pagado: 0,
      fecha_pago: getTodayLocalDate(),
      metodo_pago: 'efectivo',
      observacion: '',
    },
  });


  // Filtrar ventas por término de búsqueda
  const filteredSales = useMemo(() => {
    return creditSales.filter((sale: SaleWithClient) => {
      const term = searchTerm.toLowerCase();
      const clienteNombre = sale.clientes?.nombre?.toLowerCase() || '';
      const clienteCi = sale.clientes?.ci_nit?.toLowerCase() || '';
      const productos = sale.detalle_venta?.map(d => d.productos?.nombre?.toLowerCase() || '').join(' ') || '';
      
      return (
        clienteNombre.includes(term) ||
        clienteCi.includes(term) ||
        productos.includes(term) ||
        sale.id.toLowerCase().includes(term)
      );
    });
  }, [creditSales, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  const handleFilterChange = (newEstado: typeof estadoCredito) => {
    setEstadoCredito(newEstado);
    setCurrentPage(1);
  };


  // Abrir diálogo de registro de pago
  const handleOpenPaymentDialog = (sale: SaleWithClient) => {
    setSelectedSale(sale);
    
    // Obtener fecha de hoy en hora local (no UTC)
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoy = `${año}-${mes}-${dia}`;
    
    // Calcular cuotas disponibles
    // Base: (total - cuota_inicial)
    // Interés total: monto_interes
    // Base por cuota: (total - cuota_inicial) / cuotas
    // Monto por cuota: base_por_cuota + interes_total (el interés completo se suma a cada cuota)
    const total = parseFloat(sale.total.toString());
    const cuotaInicial = parseFloat((sale.cuota_inicial || 0).toString());
    const montoInteres = parseFloat((sale.monto_interes || 0).toString());
    const cuotas = sale.meses_credito || 1;
    const basePorCuota = (total - cuotaInicial) / cuotas;
    const montoPorCuota = basePorCuota + montoInteres;
    
    // Obtener cuotas ya pagadas de esta venta
    const cuotasPagadas = allPayments
      .filter((p: CreditPayment) => p.id_venta === sale.id && p.numero_cuota)
      .map((p: CreditPayment) => p.numero_cuota!);
    
    // Encontrar la primera cuota no pagada
    const primeraCuotaPendiente = Array.from({ length: cuotas }, (_, i) => i + 1)
      .find(cuota => !cuotasPagadas.includes(cuota)) || 1;
    
    paymentForm.reset({
      numero_cuota: primeraCuotaPendiente,
      monto_pagado: parseFloat(montoPorCuota.toFixed(2)),
      fecha_pago: fechaHoy,
      metodo_pago: 'efectivo',
      observacion: '',
    });
    setShowPaymentDialog(true);
  };

  // Registrar pago
  const handleRegisterPayment = async (data: RegisterPaymentForm) => {
    if (!selectedSale || !user) return;

    try {
      await createPaymentMutation.mutateAsync({
        id_venta: selectedSale.id,
        numero_cuota: data.numero_cuota,
        monto_pagado: data.monto_pagado,
        fecha_pago: data.fecha_pago,
        metodo_pago: data.metodo_pago,
        observacion: data.observacion || undefined,
        id_usuario: user.id,
      });

      // Imprimir comprobante de pago
      try {
        const details = await salesService.getDetails(selectedSale.id);
        const detailsWithProducts = details.map((detail) => {
          const product = detail.productos?.nombre
            ? { nombre: detail.productos.nombre, codigo: detail.productos.codigo || '' }
            : undefined;
          return { ...detail, producto: product };
        });

        const clienteNombre = selectedSale.clientes?.nombre || '';

        printTicket({
          sale: {
            ...selectedSale,
            metodo_pago: data.metodo_pago,
          },
          items: detailsWithProducts as any,
          vendedor: user?.nombre || '',
          cliente: clienteNombre,
          creditPayment: {
            numero_cuota: data.numero_cuota,
            monto_pagado: data.monto_pagado,
            fecha_pago: data.fecha_pago,
            metodo_pago: data.metodo_pago,
          },
        });
      } catch (error) {
        console.error('Error al imprimir comprobante de pago:', error);
      }

      toast.success('Pago registrado exitosamente');
      setShowPaymentDialog(false);
      setSelectedSale(null);
      paymentForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago');
    }
  };

  // Ver historial de pagos
  const handleViewHistory = (sale: SaleWithClient) => {
    setSelectedSale(sale);
    setShowHistoryDialog(true);
  };

  // Abrir diálogo de confirmación de eliminación
  const handleOpenDeleteDialog = (payment: CreditPayment) => {
    setPaymentToDelete(payment);
    setShowDeletePaymentDialog(true);
  };

  // Eliminar pago
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await deletePaymentMutation.mutateAsync(paymentToDelete.id);
      toast.success('Cuota eliminada exitosamente');
      setShowDeletePaymentDialog(false);
      setPaymentToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la cuota');
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Imprimir comprobante de cuota inicial
  const handlePrintInitialPayment = async () => {
    if (!selectedSale) return;

    try {
      // Obtener detalles de la venta
      const details = await salesService.getDetails(selectedSale.id);
      const detailsWithProducts = details.map((detail: any) => {
        const product = detail.productos?.nombre
          ? { nombre: detail.productos.nombre, codigo: detail.productos.codigo || '' }
          : undefined;
        return { ...detail, producto: product };
      });

      const clienteNombre = selectedSale.clientes?.nombre || '';

      printTicket({
        sale: {
          ...selectedSale,
          metodo_pago: 'credito', // Mantener como crédito
        },
        items: detailsWithProducts as any,
        vendedor: user?.nombre || '',
        cliente: clienteNombre,
        creditPayment: {
          numero_cuota: 0, // Cuota inicial
          monto_pagado: parseFloat((selectedSale.cuota_inicial || 0).toString()),
          fecha_pago: selectedSale.fecha,
          metodo_pago: 'efectivo', // Método de pago de la cuota inicial
        },
      });
    } catch (error) {
      console.error('Error al imprimir comprobante de cuota inicial:', error);
      toast.error('Error al imprimir el comprobante');
    }
  };

  // Imprimir comprobante de cuota
  const handlePrintPayment = async (payment: CreditPayment) => {
    if (!selectedSale) return;

    try {
      // Obtener detalles de la venta
      const details = await salesService.getDetails(selectedSale.id);
      const detailsWithProducts = details.map((detail: any) => {
        const product = detail.productos?.nombre
          ? { nombre: detail.productos.nombre, codigo: detail.productos.codigo || '' }
          : undefined;
        return { ...detail, producto: product };
      });

      const clienteNombre = selectedSale.clientes?.nombre || '';

      printTicket({
        sale: {
          ...selectedSale,
          metodo_pago: 'credito', // Mantener como crédito
        },
        items: detailsWithProducts as any,
        vendedor: user?.nombre || '',
        cliente: clienteNombre,
        creditPayment: {
          numero_cuota: payment.numero_cuota || undefined,
          monto_pagado: payment.monto_pagado,
          fecha_pago: payment.fecha_pago,
          metodo_pago: payment.metodo_pago, // Método de pago de la cuota
        },
      });
    } catch (error) {
      console.error('Error al imprimir comprobante de pago:', error);
      toast.error('Error al imprimir el comprobante');
    }
  };

  // Obtener badge de estado
  const getEstadoBadge = (estado?: string) => {
    switch (estado) {
      case 'pagado':
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Pagado</Badge>;
      case 'parcial':
        return <Badge className="bg-yellow-600"><Clock className="mr-1 h-3 w-3" />Parcial</Badge>;
      case 'vencido':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Vencido</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
    }
  };

  // Calcular totales
  const totalPendiente = useMemo(() => {
    return filteredSales.reduce((sum, sale) => {
      const totalConInteres = parseFloat((sale.total_con_interes || sale.total).toString());
      const montoPagado = parseFloat((sale.monto_pagado || 0).toString());
      const saldo = totalConInteres - montoPagado;
      return sum + saldo;
    }, 0);
  }, [filteredSales]);

  const totalVentas = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0);
  }, [filteredSales]);

  return (
    <DashboardLayout title="Ventas a Crédito">
      <div className="space-y-4">
        {/* Filtros y búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, CI/NIT, productos..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={estadoCredito} onValueChange={(value: any) => handleFilterChange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Ventas</div>
              <div className="text-2xl font-bold">Bs. {totalVentas.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Saldo Pendiente</div>
              <div className="text-2xl font-bold text-yellow-600">Bs. {totalPendiente.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Cantidad de Ventas</div>
              <div className="text-2xl font-bold">{filteredSales.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de ventas */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas a Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedSales.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron ventas a crédito
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Interés</TableHead>
                        <TableHead>Total + Interés</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Cuotas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSales.map((sale: SaleWithClient) => {
                        const totalOriginal = parseFloat(sale.total.toString());
                        const montoInteres = parseFloat((sale.monto_interes || 0).toString());
                        const totalConInteres = parseFloat((sale.total_con_interes || sale.total).toString());
                        const montoPagado = parseFloat((sale.monto_pagado || 0).toString());
                        const saldoPendiente = totalConInteres - montoPagado;
                        const puedePagar = saldoPendiente > 0;
                        const tieneInteres = montoInteres > 0;
                        const interesEximido = sale.interes_eximido || false;
                        // Calcular monto por cuota: base_por_cuota + interes_total (el interés completo se suma a cada cuota)
                        const cuotas = sale.meses_credito || 1;
                        const totalVenta = parseFloat(sale.total.toString());
                        const cuotaInicial = parseFloat((sale.cuota_inicial || 0).toString());
                        const basePorCuota = (totalVenta - cuotaInicial) / cuotas;
                        const montoPorCuota = basePorCuota + montoInteres;

                        return (
                          <TableRow key={sale.id}>
                            <TableCell>{formatDate(sale.fecha)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{sale.clientes?.nombre || 'N/A'}</div>
                                {sale.clientes?.ci_nit && (
                                  <div className="text-sm text-muted-foreground">
                                    CI/NIT: {sale.clientes.ci_nit}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>Bs. {totalOriginal.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "font-medium",
                                  tieneInteres && !interesEximido ? "text-orange-600" : "text-muted-foreground"
                                )}>
                                  Bs. {montoInteres.toFixed(2)}
                                </span>
                                {sale.tasa_interes && sale.tasa_interes > 0 && (
                                  <Badge variant="outline" className="text-xs w-fit">
                                    {sale.tasa_interes}% mensual
                                  </Badge>
                                )}
                                {interesEximido && (
                                  <Badge variant="secondary" className="text-xs w-fit">
                                    Eximido
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              Bs. {totalConInteres.toFixed(2)}
                            </TableCell>
                            <TableCell>Bs. {montoPagado.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">
                              Bs. {saldoPendiente.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {sale.meses_credito ? (
                                <div>
                                  <div className="font-medium">
                                    {sale.meses_credito} {sale.meses_credito === 1 ? 'cuota' : 'cuotas'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Bs. {montoPorCuota.toFixed(2)} por cuota
                                  </div>
                                  {(() => {
                                    // Calcular cuotas pagadas y pendientes
                                    const cuotasPagadas = allPayments
                                      .filter((p: CreditPayment) => p.id_venta === sale.id && p.numero_cuota)
                                      .map((p: CreditPayment) => p.numero_cuota!);
                                    const cuotasPendientes = sale.meses_credito! - cuotasPagadas.length;
                                    if (cuotasPendientes > 0) {
                                      return (
                                        <div className="text-xs text-yellow-600 mt-1">
                                          {cuotasPagadas.length} pagadas, {cuotasPendientes} pendientes
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="text-xs text-green-600 mt-1">
                                        Todas las cuotas pagadas
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell>{getEstadoBadge(sale.estado_credito || 'pendiente')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewHistory(sale)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Historial
                                  </DropdownMenuItem>
                                  {puedePagar && (
                                    <DropdownMenuItem onClick={() => handleOpenPaymentDialog(sale)}>
                                      <Plus className="mr-2 h-4 w-4" />
                                      Pagar
                                    </DropdownMenuItem>
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

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

      {/* Diálogo de registro de pago */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] !flex !flex-col p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registrar un pago para la venta seleccionada
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                <form onSubmit={paymentForm.handleSubmit(handleRegisterPayment)} className="space-y-4 px-6 py-4">
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{selectedSale.clientes?.nombre || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Venta:</span>
                      <span className="font-medium">Bs. {parseFloat(selectedSale.total.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pagado:</span>
                      <span className="font-medium">Bs. {parseFloat((selectedSale.monto_pagado || 0).toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-semibold">Saldo Pendiente:</span>
                      <span className="font-bold text-yellow-600">
                        Bs. {(() => {
                          const totalConInteres = parseFloat((selectedSale.total_con_interes || selectedSale.total).toString());
                          const montoPagado = parseFloat((selectedSale.monto_pagado || 0).toString());
                          return (totalConInteres - montoPagado).toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cuota a Pagar *</Label>
                    {(() => {
                      if (!selectedSale) return null;
                      const cuotas = selectedSale.meses_credito || 1;
                      const totalVenta = parseFloat(selectedSale.total.toString());
                      const cuotaInicial = parseFloat((selectedSale.cuota_inicial || 0).toString());
                      const montoInteres = parseFloat((selectedSale.monto_interes || 0).toString());
                      const basePorCuota = (totalVenta - cuotaInicial) / cuotas;
                      const montoPorCuota = basePorCuota + montoInteres;
                      const numeroCuota = paymentForm.watch('numero_cuota') || 1;
                      
                      return (
                        <Input
                          value={`Cuota ${numeroCuota} - Bs. ${montoPorCuota.toFixed(2)}`}
                          readOnly
                          tabIndex={-1}
                          onFocus={(e) => e.target.blur()}
                          onClick={(e) => e.target.blur()}
                          className="bg-muted cursor-default select-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
                        />
                      );
                    })()}
                    {paymentForm.formState.errors.numero_cuota && (
                      <p className="text-sm text-destructive">
                        {paymentForm.formState.errors.numero_cuota.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha de Pago *</Label>
                      <DatePicker
                        value={paymentForm.watch('fecha_pago') || undefined}
                        onChange={(value) => {
                          paymentForm.setValue('fecha_pago', value);
                        }}
                        min={(() => {
                          // Fecha mínima: hace 1 año (para permitir pagos pasados)
                          const fechaMin = new Date();
                          fechaMin.setFullYear(fechaMin.getFullYear() - 1);
                          const año = fechaMin.getFullYear();
                          const mes = String(fechaMin.getMonth() + 1).padStart(2, '0');
                          const dia = String(fechaMin.getDate()).padStart(2, '0');
                          return `${año}-${mes}-${dia}`;
                        })()}
                        max={(() => {
                          // Fecha máxima: hoy (bloquear fechas futuras)
                          const hoy = new Date();
                          const año = hoy.getFullYear();
                          const mes = String(hoy.getMonth() + 1).padStart(2, '0');
                          const dia = String(hoy.getDate()).padStart(2, '0');
                          return `${año}-${mes}-${dia}`;
                        })()}
                        placeholder="Seleccionar fecha de pago"
                      />
                      {paymentForm.formState.errors.fecha_pago && (
                        <p className="text-sm text-destructive">
                          {paymentForm.formState.errors.fecha_pago.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Método de Pago *</Label>
                      <Select
                        value={paymentForm.watch('metodo_pago')}
                        onValueChange={(value: 'efectivo' | 'qr' | 'transferencia') => paymentForm.setValue('metodo_pago', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="qr">QR</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observación</Label>
                    <Textarea
                      {...paymentForm.register('observacion')}
                      placeholder="Observaciones adicionales (opcional)"
                      rows={3}
                    />
                  </div>
                </form>
              </div>
              <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={paymentForm.handleSubmit(handleRegisterPayment)} disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Registrar Pago'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de historial de pagos */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] !flex !flex-col p-0 [&>button]:right-4 [&>button]:top-4 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Historial de Pagos</DialogTitle>
            <DialogDescription>
              Historial de pagos para la venta seleccionada
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-4 px-6 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedSale.clientes?.nombre || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Venta:</span>
                  <span className="font-medium">Bs. {parseFloat(selectedSale.total.toString()).toFixed(2)}</span>
                </div>
                {(selectedSale.total_con_interes && parseFloat(selectedSale.total_con_interes.toString()) !== parseFloat(selectedSale.total.toString())) && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total con Interés:</span>
                    <span className="font-medium">Bs. {parseFloat((selectedSale.total_con_interes || selectedSale.total).toString()).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pagado:</span>
                  <span className="font-medium">Bs. {parseFloat((selectedSale.monto_pagado || 0).toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Saldo Pendiente:</span>
                  <span className="font-bold text-yellow-600">
                    Bs. {(() => {
                      const totalConInteres = parseFloat((selectedSale.total_con_interes || selectedSale.total).toString());
                      const montoPagado = parseFloat((selectedSale.monto_pagado || 0).toString());
                      const saldo = totalConInteres - montoPagado;
                      return saldo.toFixed(2);
                    })()}
                  </span>
                </div>
              </div>

              {/* Sección de productos */}
              {saleDetails.length > 0 && (
                <div className="rounded-lg border">
                  <div className="p-4 border-b bg-muted/50">
                    <h3 className="font-semibold">Productos de la Venta</h3>
                  </div>
                  <div className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetails.map((detail: any, index: number) => {
                          // Manejar productos que pueden venir como objeto o null
                          const producto = detail.productos && typeof detail.productos === 'object' && !Array.isArray(detail.productos)
                            ? detail.productos
                            : null;
                          const cantidad = detail.cantidad;
                          const precio = detail.precio_unitario;
                          const subtotal = detail.subtotal || (cantidad * precio);
                          
                          return (
                            <TableRow key={detail.id || index}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{producto?.nombre || 'Producto sin nombre'}</p>
                                  {producto?.codigo && (
                                    <p className="text-xs text-muted-foreground">Código: {producto.codigo}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{cantidad}</TableCell>
                              <TableCell className="text-right">Bs. {precio.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">Bs. {subtotal.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {(() => {
                const cuotaInicial = selectedSale.cuota_inicial !== null && selectedSale.cuota_inicial !== undefined 
                  ? parseFloat(selectedSale.cuota_inicial.toString()) 
                  : 0;
                return cuotaInicial === 0 && paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <TooltipProvider>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuota</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Observación</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {/* Mostrar cuota inicial si existe */}
                        {selectedSale.cuota_inicial != null && parseFloat((selectedSale.cuota_inicial || 0).toString()) > 0 && (
                          <TableRow>
                            <TableCell>
                              <Badge variant="secondary">Cuota Inicial</Badge>
                            </TableCell>
                            <TableCell>{formatDate(selectedSale.fecha)}</TableCell>
                            <TableCell className="font-medium">
                              Bs. {parseFloat((selectedSale.cuota_inicial || 0).toString()).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {selectedSale.metodo_pago === 'credito' ? 'Efectivo' : selectedSale.metodo_pago}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              Pago realizado al momento de la venta
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePrintInitialPayment}
                                    className="h-8 w-8"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Imprimir comprobante</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )}
                        {/* Mostrar pagos registrados */}
                        {paymentHistory.map((payment: CreditPayment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {payment.numero_cuota ? (
                                <Badge variant="outline">Cuota {payment.numero_cuota}</Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{formatDate(payment.fecha_pago)}</TableCell>
                            <TableCell className="font-medium">
                              Bs. {payment.monto_pagado.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {payment.metodo_pago}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.observacion || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handlePrintPayment(payment)}
                                      className="h-8 w-8 text-primary hover:text-primary"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Imprimir comprobante</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenDeleteDialog(payment)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Eliminar cuota</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </TooltipProvider>
                  </div>
                );
              })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={showDeletePaymentDialog} onOpenChange={setShowDeletePaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Cuota</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta cuota pagada? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {paymentToDelete && selectedSale && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedSale.clientes?.nombre || 'N/A'}</span>
                </div>
                {paymentToDelete.numero_cuota && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cuota:</span>
                    <Badge variant="outline">Cuota {paymentToDelete.numero_cuota}</Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de Pago:</span>
                  <span className="font-medium">{formatDate(paymentToDelete.fecha_pago)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monto:</span>
                  <span className="font-medium">Bs. {paymentToDelete.monto_pagado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Método:</span>
                  <Badge variant="outline" className="capitalize">
                    {paymentToDelete.metodo_pago}
                  </Badge>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeletePaymentDialog(false);
                    setPaymentToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleDeletePayment}
                  disabled={deletePaymentMutation.isPending}
                >
                  {deletePaymentMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Cuota
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

