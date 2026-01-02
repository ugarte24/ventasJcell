import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCart } from '@/contexts/CartContext';
import { PaymentMethod, Client } from '@/types';
import { useAuth } from '@/contexts';
import { useProducts, useSearchProducts } from '@/hooks/useProducts';
import { useCreateSale } from '@/hooks/useSales';
import { useClients, useSearchClients } from '@/hooks/useClients';
import { Sale, PreregistroVentaItem } from '@/types';
import { preregistrosService } from '@/services/preregistros.service';
import { getLocalDateISO } from '@/lib/utils';
import { printTicket } from '@/utils/print';
import { salesService } from '@/services/sales.service';
import { usersService } from '@/services/users.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  QrCode,
  Banknote,
  CheckCircle,
  Loader,
  Printer,
  Package,
  User,
  Edit,
  X
} from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsDesktopLarge } from '@/hooks/use-desktop-large';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function NewSale() {
  const isMobile = useIsMobile();
  const isDesktopLarge = useIsDesktopLarge();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('efectivo');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [saleTotal, setSaleTotal] = useState(0);
  const [saleItems, setSaleItems] = useState<typeof items>([]);
  const [saleItemCount, setSaleItemCount] = useState(0);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Estados para crédito
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [mesesCredito, setMesesCredito] = useState<number>(1);
  const [mesesCreditoInput, setMesesCreditoInput] = useState<string>('1');
  const [tasaInteres, setTasaInteres] = useState<number>(0);
  const [tasaInteresInput, setTasaInteresInput] = useState<string>('');
  const [cuotaInicialHabilitada, setCuotaInicialHabilitada] = useState<boolean>(false);
  const [cuotaInicial, setCuotaInicial] = useState<number>(0);
  const [cuotaInicialInput, setCuotaInicialInput] = useState<string>('');
  
  const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { user } = useAuth();
  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();
  const { data: searchResults = [], isLoading: searching } = useSearchProducts(searchTerm);
  const { data: allClients = [] } = useClients();
  const { data: clientSearchResults = [] } = useSearchClients(clientSearchTerm);
  const createSaleMutation = useCreateSale();

  // Estados para preregistros (minorista/mayorista)
  const [preregistroItems, setPreregistroItems] = useState<PreregistroVentaItem[]>([]);
  const [isLoadingPreregistros, setIsLoadingPreregistros] = useState(false);
  const [editingCantidadRestante, setEditingCantidadRestante] = useState<string | null>(null);
  const [editCantidadRestanteValue, setEditCantidadRestanteValue] = useState<string>('');

  // Cargar preregistros si es minorista o mayorista
  useEffect(() => {
    const loadPreregistros = async () => {
      if (!user || (user.rol !== 'minorista' && user.rol !== 'mayorista')) {
        return;
      }

      try {
        setIsLoadingPreregistros(true);
        const fecha = getLocalDateISO();
        
        if (user.rol === 'minorista') {
          const preregistros = await preregistrosService.getPreregistrosMinorista(fecha);
          const items: PreregistroVentaItem[] = preregistros.map(p => ({
            id: p.id,
            nombre: p.producto?.nombre || 'N/A',
            codigo: p.producto?.codigo,
            cantidad: p.cantidad,
            aumento: 0,
            cantidadRestante: p.cantidad,
            precio_unitario: p.producto?.precio_por_unidad || 0,
            subtotal: 0,
            id_producto: p.id_producto,
          }));
          // Calcular subtotales iniciales
          items.forEach(item => {
            item.subtotal = (item.cantidad + item.aumento - item.cantidadRestante) * item.precio_unitario;
          });
          setPreregistroItems(items);
        } else if (user.rol === 'mayorista') {
          const preregistros = await preregistrosService.getPreregistrosMayorista(user.id, fecha);
          const items: PreregistroVentaItem[] = preregistros.map(p => ({
            id: p.id,
            nombre: p.producto?.nombre || 'N/A',
            codigo: p.producto?.codigo,
            cantidad: p.cantidad,
            aumento: 0,
            cantidadRestante: p.cantidad,
            precio_unitario: p.producto?.precio_por_mayor ?? 0,
            subtotal: 0,
            id_producto: p.id_producto,
          }));
          // Calcular subtotales iniciales
          items.forEach(item => {
            item.subtotal = (item.cantidad + item.aumento - item.cantidadRestante) * item.precio_unitario;
          });
          setPreregistroItems(items);
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al cargar preregistros');
      } finally {
        setIsLoadingPreregistros(false);
      }
    };

    loadPreregistros();
  }, [user]);

  // Función para actualizar cantidadRestante
  const handleUpdateCantidadRestante = (itemId: string, newValue: number) => {
    setPreregistroItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const cantidadRestante = Math.max(0, Math.min(newValue, item.cantidad + item.aumento));
        const subtotal = (item.cantidad + item.aumento - cantidadRestante) * item.precio_unitario;
        return { ...item, cantidadRestante, subtotal };
      }
      return item;
    }));
  };

  // Función para actualizar aumento
  const handleUpdateAumento = (itemId: string, newValue: number) => {
    setPreregistroItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const aumento = Math.max(0, newValue);
        const cantidadRestante = Math.min(item.cantidadRestante, item.cantidad + aumento);
        const subtotal = (item.cantidad + aumento - cantidadRestante) * item.precio_unitario;
        return { ...item, aumento, cantidadRestante, subtotal };
      }
      return item;
    }));
  };

  // Calcular total de preregistros
  const preregistroTotal = useMemo(() => {
    return preregistroItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [preregistroItems]);

  const filteredProducts = useMemo(() => {
    if (searchTerm.length > 0 && searchResults.length > 0) {
      return searchResults;
    }
    return allProducts;
  }, [searchTerm, searchResults, allProducts]);

  // Calcular productos paginados
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCompleteSale = async () => {
    if (!user) {
      toast.error('Debes estar autenticado');
      return;
    }

    // Si es minorista o mayorista, usar preregistros
    if (user.rol === 'minorista' || user.rol === 'mayorista') {
      if (preregistroItems.length === 0) {
        toast.error('No hay preregistros para procesar');
        return;
      }

      // Validar que haya al menos un item con cantidad vendida (cantidad + aumento - cantidadRestante > 0)
      const itemsConVenta = preregistroItems.filter(item => 
        (item.cantidad + item.aumento - item.cantidadRestante) > 0
      );

      if (itemsConVenta.length === 0) {
        toast.error('Debes vender al menos un producto');
        return;
      }

      // Validar stock antes de completar la venta
      for (const item of itemsConVenta) {
        const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
        const producto = allProducts.find(p => p.id === item.id_producto);
        if (!producto) {
          toast.error(`Producto "${item.nombre}" no encontrado`);
          return;
        }
        if (producto.estado !== 'activo') {
          toast.error(`El producto "${item.nombre}" está inactivo`);
          return;
        }
        if (cantidadVendida > producto.stock_actual) {
          toast.error(
            `Stock insuficiente para "${item.nombre}". Stock disponible: ${producto.stock_actual}, solicitado: ${cantidadVendida}`
          );
          return;
        }
      }

      // Validar crédito
      if (selectedPayment === 'credito') {
        if (!selectedClient) {
          toast.error('Debes seleccionar un cliente para ventas a crédito');
          return;
        }
        if (!mesesCredito || mesesCredito <= 0) {
          toast.error('Debes establecer la cantidad de cuotas para el crédito');
          return;
        }
      }

      try {
        const saleItems = itemsConVenta.map(item => {
          const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
          return {
            id_producto: item.id_producto,
            cantidad: cantidadVendida,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
          };
        });

        const saleData: any = {
          total: preregistroTotal,
          metodo_pago: selectedPayment,
          id_vendedor: user.id,
          items: saleItems,
        };

        // Agregar datos de crédito si es necesario
        if (selectedPayment === 'credito' && selectedClient && mesesCredito) {
          saleData.id_cliente = selectedClient.id;
          saleData.meses_credito = mesesCredito;
          saleData.tasa_interes = tasaInteres || 0;
          if (cuotaInicialHabilitada && cuotaInicial > 0) {
            saleData.cuota_inicial = cuotaInicial;
          }
        }

        const newSale = await createSaleMutation.mutateAsync(saleData);

        // Guardar datos de la venta
        setSaleTotal(preregistroTotal);
        setSaleItems(itemsConVenta.map(item => ({
          ...allProducts.find(p => p.id === item.id_producto)!,
          cantidad: item.cantidad + item.aumento - item.cantidadRestante,
          subtotal: item.subtotal,
        })));
        setSaleItemCount(itemsConVenta.length);
        setCreatedSale(newSale);
        
        // Limpiar preregistros procesados
        setPreregistroItems(prev => prev.map(item => {
          const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
          if (cantidadVendida > 0) {
            // Actualizar cantidadRestante a la nueva cantidad total (cantidad + aumento)
            return { ...item, cantidadRestante: item.cantidad + item.aumento, subtotal: 0 };
          }
          return item;
        }));

        // Si es venta a crédito, resetear también los campos de crédito
        if (selectedPayment === 'credito') {
          setSelectedClient(null);
          setClientSearchOpen(false);
          setClientSearchTerm('');
          setMesesCredito(1);
          setMesesCreditoInput('1');
          setTasaInteres(0);
          setTasaInteresInput('');
          setCuotaInicialHabilitada(false);
          setCuotaInicial(0);
          setCuotaInicialInput('');
        }
        
        // Resetear método de pago a efectivo después de completar la venta
        setSelectedPayment('efectivo');
        
        setShowSuccessDialog(true);
        toast.success('Venta registrada exitosamente');
        return;
      } catch (error: any) {
        toast.error(error.message || 'Error al registrar la venta');
        return;
      }
    }

    // Flujo normal para admin y vendedor
    if (items.length === 0) {
      toast.error('Agrega productos al carrito');
      return;
    }

    // Validar stock antes de completar la venta
    for (const item of items) {
      if (item.estado !== 'activo') {
        toast.error(`El producto "${item.nombre}" está inactivo`);
        return;
      }
      if (item.cantidad > item.stock_actual) {
        toast.error(
          `Stock insuficiente para "${item.nombre}". Stock disponible: ${item.stock_actual}, solicitado: ${item.cantidad}`
        );
        return;
      }
    }

    // Validar crédito
    if (selectedPayment === 'credito') {
      if (!selectedClient) {
        toast.error('Debes seleccionar un cliente para ventas a crédito');
        return;
      }
      if (!mesesCredito || mesesCredito <= 0) {
        toast.error('Debes establecer la cantidad de cuotas para el crédito');
        return;
      }
    }

    try {
      const saleItems = items.map(item => ({
        id_producto: item.id,
        cantidad: Number(item.cantidad) || 0,
        precio_unitario: Number(item.precio_por_unidad) || 0,
        subtotal: Number(item.subtotal) || 0,
      }));

      const saleData: any = {
        total,
        metodo_pago: selectedPayment,
        id_vendedor: user.id,
        items: saleItems,
      };

      // Agregar datos de crédito si es necesario
      if (selectedPayment === 'credito' && selectedClient && mesesCredito) {
        saleData.id_cliente = selectedClient.id;
        saleData.meses_credito = mesesCredito;
        saleData.tasa_interes = tasaInteres || 0;
        if (cuotaInicialHabilitada && cuotaInicial > 0) {
          saleData.cuota_inicial = cuotaInicial;
        }
      }

      const newSale = await createSaleMutation.mutateAsync(saleData);

      // Guardar datos de la venta antes de limpiar el carrito
      setSaleTotal(total);
      setSaleItems([...items]);
      setSaleItemCount(itemCount);
      setCreatedSale(newSale);
      
      // Limpiar carrito y resetear estados
      clearCart();
      
      // Si es venta a crédito, resetear también los campos de crédito
      if (selectedPayment === 'credito') {
        setSelectedClient(null);
        setClientSearchOpen(false);
        setClientSearchTerm('');
        setMesesCredito(1);
        setMesesCreditoInput('1');
        setTasaInteres(0);
        setTasaInteresInput('');
        setCuotaInicialHabilitada(false);
        setCuotaInicial(0);
        setCuotaInicialInput('');
      }
      
      // Resetear método de pago a efectivo después de completar la venta
      setSelectedPayment('efectivo');
      
      setShowSuccessDialog(true);
      toast.success('Venta registrada exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar la venta');
    }
  };

  const handleNewSale = () => {
    clearCart();
    setShowSuccessDialog(false);
    setSaleTotal(0);
    setSaleItems([]);
    setSaleItemCount(0);
    setCreatedSale(null);
    setSelectedPayment('efectivo');
    setSelectedClient(null);
    setMesesCredito(1);
    setMesesCreditoInput('1');
    setTasaInteres(0);
    setTasaInteresInput('');
    setCuotaInicialHabilitada(false);
    setCuotaInicial(0);
    setCuotaInicialInput('');
    toast.success('¡Listo para una nueva venta!');
  };

  // Resetear cuota inicial cuando cambia el método de pago
  useEffect(() => {
    if (selectedPayment !== 'credito') {
      setCuotaInicialHabilitada(false);
      setCuotaInicial(0);
      setCuotaInicialInput('');
    }
  }, [selectedPayment]);

  const handlePrintTicket = async () => {
    if (!createdSale) return;

    try {
      // Obtener detalles de la venta
      const details = await salesService.getDetails(createdSale.id);
      
      // Obtener información del vendedor
      let vendedorName = 'N/A';
      try {
        const vendedor = await usersService.getById(createdSale.id_vendedor);
        vendedorName = vendedor?.nombre || 'N/A';
      } catch {
        // Si falla, usar el nombre del usuario actual
        vendedorName = user?.nombre || 'N/A';
      }

      // Obtener nombres de productos
      const detailsWithProducts = details.map((detail) => {
        const product = allProducts.find(p => p.id === detail.id_producto);
        return {
          ...detail,
          producto: product ? {
            nombre: product.nombre,
            codigo: product.codigo,
          } : undefined,
        };
      });

      // Si es venta a crédito con cuota inicial, imprimir como comprobante de cuota inicial
      if (createdSale.metodo_pago === 'credito' && createdSale.cuota_inicial && createdSale.cuota_inicial > 0) {
        const clienteNombre = selectedClient?.nombre || '';
        printTicket({
          sale: {
            ...createdSale,
            metodo_pago: 'credito', // Mantener como crédito
          },
          items: detailsWithProducts,
          vendedor: vendedorName,
          cliente: clienteNombre,
          creditPayment: {
            numero_cuota: 0, // Cuota inicial
            monto_pagado: parseFloat((createdSale.cuota_inicial || 0).toString()),
            fecha_pago: createdSale.fecha,
            metodo_pago: 'efectivo', // Método de pago de la cuota inicial
          },
        });
      } else {
        printTicket({
          sale: createdSale,
          items: detailsWithProducts,
          vendedor: vendedorName,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al imprimir ticket');
    }
  };

  const paymentMethods = [
    { id: 'efectivo' as PaymentMethod, label: 'Efectivo', icon: Banknote },
    { id: 'qr' as PaymentMethod, label: 'QR', icon: QrCode },
    { id: 'transferencia' as PaymentMethod, label: 'Transferencia', icon: CreditCard },
    { id: 'credito' as PaymentMethod, label: 'Crédito', icon: User },
  ];

  // Filtrar clientes para el selector
  const filteredClients = useMemo(() => {
    if (clientSearchTerm.length > 0 && clientSearchResults.length > 0) {
      return clientSearchResults;
    }
    return allClients;
  }, [clientSearchTerm, clientSearchResults, allClients]);

  // Resetear campos de crédito cuando cambia el método de pago
  useEffect(() => {
    if (selectedPayment !== 'credito') {
      setSelectedClient(null);
      setMesesCredito(1);
      setMesesCreditoInput('1');
    }
  }, [selectedPayment]);

  // Mostrar Sheet cuando NO estamos en desktop grande (tablet o móvil)
  const shouldShowSheet = !isDesktopLarge;

  return (
    <DashboardLayout title="Nueva Venta">
      {/* Botón flotante del carrito - Tablet y móvil (cuando NO es desktop grande) */}
      {shouldShowSheet && (
        <Button
          onClick={() => setShowCartSheet(true)}
          className="fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full">
              {itemCount}
            </Badge>
          )}
        </Button>
      )}

      <div className={cn("grid gap-4 sm:gap-6", isDesktopLarge && "lg:grid-cols-3")}>
        {/* Products Section */}
        <div className={cn("space-y-3 sm:space-y-4", isDesktopLarge && "lg:col-span-2")}>
          {/* Mostrar tabla de preregistros si es minorista o mayorista */}
          {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>
                  {user.rol === 'minorista' ? 'Preregistros Minorista' : 'Preregistros Mayorista'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPreregistros ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando preregistros...
                  </div>
                ) : preregistroItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay preregistros para el día de hoy
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Aumento</TableHead>
                            <TableHead className="text-right">Cantidad Restante</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preregistroItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.nombre}</p>
                                  {item.codigo && (
                                    <p className="text-sm text-muted-foreground">{item.codigo}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {item.cantidad}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.aumento}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingCantidadRestante === item.id ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={item.cantidad + item.aumento}
                                      value={editCantidadRestanteValue}
                                      onChange={(e) => setEditCantidadRestanteValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newValue = parseInt(editCantidadRestanteValue);
                                          if (!isNaN(newValue)) {
                                            handleUpdateCantidadRestante(item.id, newValue);
                                            setEditingCantidadRestante(null);
                                            setEditCantidadRestanteValue('');
                                          }
                                        } else if (e.key === 'Escape') {
                                          setEditingCantidadRestante(null);
                                          setEditCantidadRestanteValue('');
                                        }
                                      }}
                                      className="w-20 h-8"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newValue = parseInt(editCantidadRestanteValue);
                                        if (!isNaN(newValue)) {
                                          handleUpdateCantidadRestante(item.id, newValue);
                                          setEditingCantidadRestante(null);
                                          setEditCantidadRestanteValue('');
                                        }
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingCantidadRestante(null);
                                        setEditCantidadRestanteValue('');
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCantidadRestante(item.id);
                                      setEditCantidadRestanteValue(item.cantidadRestante.toString());
                                    }}
                                  >
                                    {item.cantidadRestante}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                Bs. {item.subtotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCantidadRestante(item.id);
                                    setEditCantidadRestanteValue(item.cantidadRestante.toString());
                                  }}
                                  disabled={editingCantidadRestante === item.id}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-lg font-semibold">Total:</p>
                      <p className="text-2xl font-bold text-primary">
                        Bs. {preregistroTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search */}
              <div className="relative animate-fade-in">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 sm:h-12 pl-10 text-sm sm:text-base"
                />
              </div>

          {/* Products Grid */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
            {loadingProducts || searching ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No se encontraron productos
              </div>
            ) : (
              paginatedProducts.map((product, index) => {
                const cartItem = items.find(item => item.id === product.id);
                const availableStock = product.stock_actual - (cartItem?.cantidad || 0);
                const canAdd = product.estado === 'activo' && availableStock > 0;

                return (
                <Card 
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-soft animate-fade-in",
                    canAdd ? "hover:border-primary/30" : "opacity-60 cursor-not-allowed",
                    product.estado !== 'activo' && "border-destructive/30"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    if (!canAdd) {
                      if (product.estado !== 'activo') {
                        toast.error(`El producto "${product.nombre}" está inactivo`);
                      } else {
                        toast.error(`Stock insuficiente para "${product.nombre}"`);
                      }
                      return;
                    }
                    try {
                      addItem(product);
                      toast.success(`${product.nombre} agregado`);
                    } catch (error: any) {
                      toast.error(error.message || 'Error al agregar producto');
                    }
                  }}
                >
                <CardContent className="p-4">
                  {/* Imagen del producto */}
                  {product.imagen_url ? (
                    <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <img 
                        src={product.imagen_url} 
                        alt={product.nombre}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          // Si la imagen falla al cargar, ocultar el contenedor
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mb-3 aspect-square w-full rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{product.nombre}</p>
                      <p className="text-sm text-muted-foreground">{product.codigo}</p>
                    </div>
                    <Badge 
                      variant={
                        product.estado !== 'activo' 
                          ? 'destructive' 
                          : product.stock_actual <= product.stock_minimo 
                          ? 'destructive' 
                          : availableStock === 0
                          ? 'secondary'
                          : 'secondary'
                      }
                      className="shrink-0"
                    >
                      {availableStock > 0 ? availableStock : 'Sin stock'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-display text-lg font-bold text-primary">
                      Bs. {product.precio_por_unidad.toFixed(2)}
                    </p>
                    {cartItem && (
                      <Badge variant="default" className="text-xs">
                        {cartItem.cantidad} en carrito
                      </Badge>
                    )}
                    {canAdd && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
              })
            )}
          </div>

          {/* Paginación */}
          {!loadingProducts && !searching && filteredProducts.length > itemsPerPage && (
            <div className="flex justify-center pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {/* Mostrar primera página */}
                  {currentPage > 2 && (
                    <>
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => setCurrentPage(1)}
                          className="cursor-pointer"
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {currentPage > 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}

                  {/* Mostrar páginas alrededor de la actual */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar página actual, anterior y siguiente
                      return page === currentPage || 
                             page === currentPage - 1 || 
                             page === currentPage + 1;
                    })
                    .map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                  {/* Mostrar última página */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => setCurrentPage(totalPages)}
                          className="cursor-pointer"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

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

          {/* Información de paginación */}
          {!loadingProducts && !searching && filteredProducts.length > 0 && (
            <div className="text-center text-sm text-muted-foreground pt-2">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} productos
            </div>
          )}
            </>
          )}
        </div>

        {/* Cart Section - Solo visible en desktop grande (≥1024px) */}
        {isDesktopLarge && (
        <div className={cn("space-y-4 animate-slide-up lg:sticky lg:top-6")}>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-display">
                <ShoppingCart className="h-5 w-5" />
                {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? 'Resumen de Venta' : 'Carrito'}
                {!user || (user.rol !== 'minorista' && user.rol !== 'mayorista') ? (
                  itemCount > 0 && (
                    <Badge className="ml-auto">{itemCount}</Badge>
                  )
                ) : (
                  preregistroItems.length > 0 && (
                    <Badge className="ml-auto">{preregistroItems.length}</Badge>
                  )
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mostrar preregistros si es minorista o mayorista */}
              {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                preregistroItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No hay preregistros para el día de hoy</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                      <div className="divide-y">
                        {preregistroItems.map((item) => {
                          const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
                          return cantidadVendida > 0 ? (
                            <div key={item.id} className="p-4">
                              <div className="flex items-center gap-3 flex-nowrap">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">{item.nombre}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    Bs. {item.precio_unitario.toFixed(2)} c/u
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="w-12 text-center font-medium">{cantidadVendida}</span>
                                </div>
                              </div>
                              <div className="mt-2 text-right">
                                <p className="text-sm font-semibold">Bs. {item.subtotal.toFixed(2)}</p>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="border-t p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium">Total:</p>
                        <p className="text-xl font-bold text-primary">
                          Bs. {preregistroTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </>
                )
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">El carrito está vacío</p>
                  <p className="text-sm text-muted-foreground">Haz clic en un producto para agregarlo</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                    <div className="divide-y">
                      {items.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="flex items-center gap-3 flex-nowrap">
                            {/* Imagen del producto en el carrito */}
                            {item.imagen_url ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                                <img 
                                  src={item.imagen_url} 
                                  alt={item.nombre}
                                  className="h-full w-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{item.nombre}</p>
                              <p className="text-sm text-muted-foreground truncate">
                              Bs. {item.precio_por_unidad.toFixed(2)} c/u
                            </p>
                          </div>
                            
                            {/* Controles de cantidad - siempre en la misma fila */}
                            <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                                className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.cantidad}</span>
                            <Button
                              variant="outline"
                              size="icon"
                                className="h-8 w-8"
                              onClick={() => {
                                try {
                                  updateQuantity(item.id, item.cantidad + 1);
                                } catch (error: any) {
                                  toast.error(error.message || 'Error al actualizar cantidad');
                                }
                              }}
                              disabled={item.cantidad >= item.stock_actual}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                              size="icon"
                                className="h-8 w-8 text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  removeItem(item.id);
                                  toast.success(`${item.nombre} eliminado del carrito`);
                                }}
                                title="Eliminar del carrito"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="border-t p-3 sm:p-4">
                    <p className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-muted-foreground">Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPayment(method.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-2 sm:p-3 transition-all min-h-[60px] sm:min-h-0",
                            selectedPayment === method.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <method.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos adicionales para crédito */}
                  {selectedPayment === 'credito' && (
                    <div className="border-t p-3 sm:p-4 space-y-3">
                      {/* Selector de Cliente */}
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Cliente *</Label>
                        <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-9"
                            >
                              {selectedClient ? (
                                <span className="truncate">{selectedClient.nombre}</span>
                              ) : (
                                <span className="text-muted-foreground">Seleccionar cliente...</span>
                              )}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Buscar cliente..." 
                                value={clientSearchTerm}
                                onValueChange={setClientSearchTerm}
                              />
                              <CommandList>
                                {filteredClients.length === 0 ? (
                                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredClients.map((client) => (
                                      <CommandItem
                                        key={client.id}
                                        value={`${client.nombre} ${client.ci_nit || ''}`}
                                        onSelect={() => {
                                          setSelectedClient(client);
                                          setClientSearchOpen(false);
                                          setClientSearchTerm('');
                                        }}
                                        className="group"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{client.nombre}</span>
                                          {client.ci_nit && (
                                            <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">
                                              CI/NIT: {client.ci_nit}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Cantidad de Cuotas */}
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Cantidad de Cuotas *</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          max="120"
                          value={mesesCreditoInput}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setMesesCreditoInput(inputValue);
                            
                            // Si el campo está vacío, establecer mesesCredito en 1
                            if (inputValue === '' || inputValue === '.') {
                              setMesesCredito(1);
                              return;
                            }
                            
                            // Convertir a número y validar
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 120) {
                              setMesesCredito(numValue);
                            }
                          }}
                          onBlur={(e) => {
                            // Al perder el foco, asegurar que el valor sea válido
                            const numValue = parseInt(e.target.value, 10);
                            if (isNaN(numValue) || numValue < 1) {
                              setMesesCredito(1);
                              setMesesCreditoInput('1');
                            } else if (numValue > 120) {
                              setMesesCredito(120);
                              setMesesCreditoInput('120');
                            } else {
                              setMesesCreditoInput(e.target.value);
                            }
                          }}
                          placeholder="Ej: 3"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Número de cuotas para el pago del crédito
                        </p>
                      </div>

                      {/* Tasa de Interés Mensual */}
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Tasa de Interés Mensual (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={tasaInteresInput !== '' ? tasaInteresInput : (tasaInteres > 0 ? tasaInteres.toString() : '')}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setTasaInteresInput(inputValue);
                            
                            // Si el campo está vacío, establecer tasaInteres en 0
                            if (inputValue === '' || inputValue === '.') {
                              setTasaInteres(0);
                              return;
                            }
                            
                            // Convertir a número y validar
                            const numValue = parseFloat(inputValue);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                              setTasaInteres(numValue);
                            }
                          }}
                          onBlur={(e) => {
                            // Al perder el foco, asegurar que el valor sea válido
                            const numValue = parseFloat(e.target.value);
                            if (isNaN(numValue) || numValue < 0) {
                              setTasaInteres(0);
                              setTasaInteresInput('');
                            } else if (numValue > 100) {
                              setTasaInteres(100);
                              setTasaInteresInput('100');
                            } else {
                              setTasaInteresInput(e.target.value);
                            }
                          }}
                          placeholder="0.0"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Se aplicará mensualmente sobre el total original desde la fecha de la venta
                        </p>
                      </div>

                      {/* Cuota Inicial */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cuota-inicial"
                            checked={cuotaInicialHabilitada}
                            onCheckedChange={(checked) => {
                              setCuotaInicialHabilitada(checked === true);
                              if (!checked) {
                                setCuotaInicial(0);
                                setCuotaInicialInput('');
                              }
                            }}
                          />
                          <Label
                            htmlFor="cuota-inicial"
                            className="text-xs sm:text-sm font-normal cursor-pointer"
                          >
                            Cuota Inicial
                          </Label>
                        </div>
                        {cuotaInicialHabilitada && (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={(user?.rol === 'minorista' || user?.rol === 'mayorista') ? preregistroTotal : total}
                              value={cuotaInicialInput !== '' ? cuotaInicialInput : (cuotaInicial > 0 ? cuotaInicial.toFixed(2) : '')}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                setCuotaInicialInput(inputValue);
                                
                                if (inputValue === '' || inputValue === '.') {
                                  setCuotaInicial(0);
                                  return;
                                }
                                
                                const currentTotal = (user?.rol === 'minorista' || user?.rol === 'mayorista') ? preregistroTotal : total;
                                const numValue = parseFloat(inputValue);
                                if (!isNaN(numValue) && numValue >= 0 && numValue <= currentTotal) {
                                  setCuotaInicial(numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const numValue = parseFloat(e.target.value);
                                const currentTotal = (user?.rol === 'minorista' || user?.rol === 'mayorista') ? preregistroTotal : total;
                                if (isNaN(numValue) || numValue < 0) {
                                  setCuotaInicial(0);
                                  setCuotaInicialInput('');
                                } else if (numValue > currentTotal) {
                                  setCuotaInicial(currentTotal);
                                  setCuotaInicialInput(currentTotal.toFixed(2));
                                } else {
                                  setCuotaInicialInput(e.target.value);
                                }
                              }}
                              placeholder="0.00"
                              className="h-9"
                            />
                            <p className="text-xs text-muted-foreground">
                              El interés y las cuotas se calcularán sobre: Bs. {(total - cuotaInicial).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t bg-muted/30 p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Subtotal</span>
                      <span className="text-sm sm:text-base font-medium">Bs. {total.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-base sm:text-lg font-bold">Total</span>
                      <span className="font-display text-xl sm:text-2xl font-bold text-primary">
                        Bs. {total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 sm:p-4 space-y-2">
                    <Button 
                      className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base" 
                      onClick={handleCompleteSale}
                      disabled={itemCount === 0 || createSaleMutation.isPending}
                    >
                      {createSaleMutation.isPending ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Completar Venta
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={clearCart}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Sheet del Carrito - Tablet y móvil (cuando NO es desktop grande) */}
      {shouldShowSheet && (
        <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
            <SheetHeader className="px-4 pt-4 pb-2 border-b pr-12">
              <SheetTitle className="flex items-center gap-2 font-display">
                <ShoppingCart className="h-5 w-5" />
                <span>Carrito</span>
                {itemCount > 0 && (
                  <Badge className="ml-auto">{itemCount}</Badge>
                )}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Gestiona los productos en tu carrito de venta
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">El carrito está vacío</p>
                  <p className="text-sm text-muted-foreground">Haz clic en un producto para agregarlo</p>
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto overscroll-contain">
                    <div className="divide-y">
                      {items.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="flex items-center gap-3 flex-nowrap">
                            {/* Imagen del producto en el carrito */}
                            {item.imagen_url ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                                <img 
                                  src={item.imagen_url} 
                                  alt={item.nombre}
                                  className="h-full w-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{item.nombre}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                Bs. {item.precio_por_unidad.toFixed(2)} c/u
                              </p>
                            </div>
                            
                            {/* Controles de cantidad */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.cantidad}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  try {
                                    updateQuantity(item.id, item.cantidad + 1);
                                  } catch (error: any) {
                                    toast.error(error.message || 'Error al actualizar cantidad');
                                  }
                                }}
                                disabled={item.cantidad >= item.stock_actual}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  removeItem(item.id);
                                  toast.success(`${item.nombre} eliminado del carrito`);
                                }}
                                title="Eliminar del carrito"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="border-t p-4">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPayment(method.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all min-h-[60px]",
                            selectedPayment === method.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <method.icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos adicionales para crédito */}
                  {selectedPayment === 'credito' && (
                    <div className="border-t p-4 space-y-3">
                      {/* Selector de Cliente */}
                      <div className="space-y-2">
                        <Label className="text-sm">Cliente *</Label>
                        <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-9"
                            >
                              {selectedClient ? (
                                <span className="truncate">{selectedClient.nombre}</span>
                              ) : (
                                <span className="text-muted-foreground">Seleccionar cliente...</span>
                              )}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Buscar cliente..." 
                                value={clientSearchTerm}
                                onValueChange={setClientSearchTerm}
                              />
                              <CommandList>
                                {filteredClients.length === 0 ? (
                                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredClients.map((client) => (
                                      <CommandItem
                                        key={client.id}
                                        value={`${client.nombre} ${client.ci_nit || ''}`}
                                        onSelect={() => {
                                          setSelectedClient(client);
                                          setClientSearchOpen(false);
                                          setClientSearchTerm('');
                                        }}
                                        className="group"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{client.nombre}</span>
                                          {client.ci_nit && (
                                            <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">
                                              CI/NIT: {client.ci_nit}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Cantidad de Cuotas */}
                      <div className="space-y-2">
                        <Label className="text-sm">Cantidad de Cuotas *</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          max="120"
                          value={mesesCreditoInput}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setMesesCreditoInput(inputValue);
                            if (inputValue === '' || inputValue === '.') {
                              setMesesCredito(1);
                              return;
                            }
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 120) {
                              setMesesCredito(numValue);
                            }
                          }}
                          onBlur={(e) => {
                            const numValue = parseInt(e.target.value, 10);
                            if (isNaN(numValue) || numValue < 1) {
                              setMesesCredito(1);
                              setMesesCreditoInput('1');
                            } else if (numValue > 120) {
                              setMesesCredito(120);
                              setMesesCreditoInput('120');
                            } else {
                              setMesesCreditoInput(e.target.value);
                            }
                          }}
                          placeholder="Ej: 3"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Número de cuotas para el pago del crédito
                        </p>
                      </div>

                      {/* Tasa de Interés Mensual */}
                      <div className="space-y-2">
                        <Label className="text-sm">Tasa de Interés Mensual (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={tasaInteresInput !== '' ? tasaInteresInput : (tasaInteres > 0 ? tasaInteres.toString() : '')}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setTasaInteresInput(inputValue);
                            if (inputValue === '' || inputValue === '.') {
                              setTasaInteres(0);
                              return;
                            }
                            const numValue = parseFloat(inputValue);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                              setTasaInteres(numValue);
                            }
                          }}
                          onBlur={(e) => {
                            const numValue = parseFloat(e.target.value);
                            if (isNaN(numValue) || numValue < 0) {
                              setTasaInteres(0);
                              setTasaInteresInput('');
                            } else if (numValue > 100) {
                              setTasaInteres(100);
                              setTasaInteresInput('100');
                            } else {
                              setTasaInteresInput(e.target.value);
                            }
                          }}
                          placeholder="0.0"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Se aplicará mensualmente sobre el total original desde la fecha de la venta
                        </p>
                      </div>

                      {/* Cuota Inicial */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cuota-inicial-mobile"
                            checked={cuotaInicialHabilitada}
                            onCheckedChange={(checked) => {
                              setCuotaInicialHabilitada(checked === true);
                              if (!checked) {
                                setCuotaInicial(0);
                                setCuotaInicialInput('');
                              }
                            }}
                          />
                          <Label
                            htmlFor="cuota-inicial-mobile"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Cuota Inicial
                          </Label>
                        </div>
                        {cuotaInicialHabilitada && (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={total}
                              value={cuotaInicialInput !== '' ? cuotaInicialInput : (cuotaInicial > 0 ? cuotaInicial.toFixed(2) : '')}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                setCuotaInicialInput(inputValue);
                                if (inputValue === '' || inputValue === '.') {
                                  setCuotaInicial(0);
                                  return;
                                }
                                const numValue = parseFloat(inputValue);
                                if (!isNaN(numValue) && numValue >= 0 && numValue <= total) {
                                  setCuotaInicial(numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const numValue = parseFloat(e.target.value);
                                if (isNaN(numValue) || numValue < 0) {
                                  setCuotaInicial(0);
                                  setCuotaInicialInput('');
                                } else if (numValue > total) {
                                  setCuotaInicial(total);
                                  setCuotaInicialInput(total.toFixed(2));
                                } else {
                                  setCuotaInicialInput(e.target.value);
                                }
                              }}
                              placeholder="0.00"
                              className="h-9"
                            />
                            <p className="text-xs text-muted-foreground">
                              El interés y las cuotas se calcularán sobre: Bs. {(total - cuotaInicial).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <span className="text-base font-medium">Bs. {total.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-lg font-bold">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        Bs. {total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 space-y-2 border-t">
                    <Button 
                      className="w-full h-12 gap-2 text-base" 
                      onClick={() => {
                        handleCompleteSale();
                        setShowCartSheet(false);
                      }}
                      disabled={itemCount === 0 || createSaleMutation.isPending}
                    >
                      {createSaleMutation.isPending ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Completar Venta
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        clearCart();
                        setShowCartSheet(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
        <DialogTitle className="font-display text-2xl">
          {selectedPayment === 'credito' ? 'Venta a Crédito Registrada' : '¡Venta Completada!'}
        </DialogTitle>
            <DialogDescription>
          {selectedPayment === 'credito'
            ? 'Venta a crédito creada. Registra pagos desde el módulo de Créditos.'
            : 'La venta se ha registrado exitosamente en el sistema'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedPayment === 'credito' ? 'Total de la venta' : 'Total cobrado'}
              </p>
              <p className="font-display text-3xl font-bold text-foreground">
                Bs. {saleTotal.toFixed(2)}
              </p>
              <Badge className="mt-2 capitalize">{selectedPayment === 'credito' ? 'Crédito' : selectedPayment}</Badge>
              {selectedPayment === 'credito' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-sm bg-background rounded-lg p-3 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Cuota inicial</p>
                    <p className="font-semibold">Bs. {cuotaInicial.toFixed(2)}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">Por cobrar</p>
                    <p className="font-semibold">
                      Bs. {(saleTotal - cuotaInicial).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>{saleItems.length} productos • {saleItemCount} unidades</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {(selectedPayment !== 'credito' || (selectedPayment === 'credito' && cuotaInicial > 0)) && (
              <Button 
                variant="outline" 
                className="w-full h-11 gap-2" 
                onClick={handlePrintTicket}
              >
                <Printer className="h-4 w-4" />
                Imprimir Ticket
              </Button>
            )}
            <Button className="w-full h-11" onClick={handleNewSale}>
              Nueva Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
