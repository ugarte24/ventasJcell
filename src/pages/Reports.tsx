import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportService } from '@/services/export.service';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Users, 
  Download,
  Calendar,
  DollarSign,
  ShoppingBag,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useSales } from '@/hooks/useSales';
import { useCreditSales } from '@/hooks/useCreditSales';
import { useUsers } from '@/hooks/useUsers';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts';
import { salesService } from '@/services/sales.service';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

type PeriodType = 'today' | 'week' | 'month' | 'custom';

const COLORS = ['hsl(224, 71%, 45%)', 'hsl(162, 63%, 41%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'credito'>('general');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [idVendedor, setIdVendedor] = useState<string>('');
  
  // Filtros específicos para créditos
  const [periodCredito, setPeriodCredito] = useState<PeriodType>('week');
  const [fechaDesdeCredito, setFechaDesdeCredito] = useState('');
  const [fechaHastaCredito, setFechaHastaCredito] = useState('');

  const { data: users } = useUsers();

  // Calcular fechas según el período (usando fecha local, no UTC)
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD en hora local

    switch (period) {
      case 'today':
        return { desde: todayStr, hasta: todayStr };
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const weekAgoYear = weekAgo.getFullYear();
        const weekAgoMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
        const weekAgoDay = String(weekAgo.getDate()).padStart(2, '0');
        const weekAgoStr = `${weekAgoYear}-${weekAgoMonth}-${weekAgoDay}`;
        return { desde: weekAgoStr, hasta: todayStr };
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        const monthAgoYear = monthAgo.getFullYear();
        const monthAgoMonth = String(monthAgo.getMonth() + 1).padStart(2, '0');
        const monthAgoDay = String(monthAgo.getDate()).padStart(2, '0');
        const monthAgoStr = `${monthAgoYear}-${monthAgoMonth}-${monthAgoDay}`;
        return { desde: monthAgoStr, hasta: todayStr };
      }
      case 'custom':
        return { desde: fechaDesde || todayStr, hasta: fechaHasta || todayStr };
      default:
        return { desde: todayStr, hasta: todayStr };
    }
  }, [period, fechaDesde, fechaHasta]);

  // Construir filtros
  const filters = useMemo(() => {
    const f: { fechaDesde?: string; fechaHasta?: string; id_vendedor?: string } = {
      fechaDesde: dateRange.desde,
      fechaHasta: dateRange.hasta,
    };
    
    if (user?.rol === 'vendedor') {
      f.id_vendedor = user.id;
    } else if (idVendedor) {
      f.id_vendedor = idVendedor;
    }
    
    return f;
  }, [dateRange, idVendedor, user]);

  const { data: sales, isLoading } = useSales(filters);

  // Calcular fechas para créditos
  const dateRangeCredito = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    switch (periodCredito) {
      case 'today':
        return { desde: todayStr, hasta: todayStr };
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const weekAgoYear = weekAgo.getFullYear();
        const weekAgoMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
        const weekAgoDay = String(weekAgo.getDate()).padStart(2, '0');
        const weekAgoStr = `${weekAgoYear}-${weekAgoMonth}-${weekAgoDay}`;
        return { desde: weekAgoStr, hasta: todayStr };
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        const monthAgoYear = monthAgo.getFullYear();
        const monthAgoMonth = String(monthAgo.getMonth() + 1).padStart(2, '0');
        const monthAgoDay = String(monthAgo.getDate()).padStart(2, '0');
        const monthAgoStr = `${monthAgoYear}-${monthAgoMonth}-${monthAgoDay}`;
        return { desde: monthAgoStr, hasta: todayStr };
      }
      case 'custom':
        return { desde: fechaDesdeCredito || todayStr, hasta: fechaHastaCredito || todayStr };
      default:
        return { desde: todayStr, hasta: todayStr };
    }
  }, [periodCredito, fechaDesdeCredito, fechaHastaCredito]);

  // Obtener ventas a crédito (sin filtro de fecha en el servicio, lo haremos en el frontend)
  const { data: allCreditSales = [], isLoading: isLoadingCredits } = useCreditSales();

  // Obtener estadísticas de productos
  const { data: productStats, isLoading: loadingProducts } = useQuery({
    queryKey: ['product-stats', dateRange],
    queryFn: () => salesService.getProductSalesStats(dateRange.desde, dateRange.hasta),
    enabled: !!dateRange.desde && !!dateRange.hasta,
  });

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!sales) return { total: 0, count: 0, promedio: 0, porMetodo: {} };

    const completadas = sales.filter(s => s.estado === 'completada');
    const total = completadas.reduce((sum, sale) => sum + sale.total, 0);
    const count = completadas.length;
    const promedio = count > 0 ? total / count : 0;

    // Agrupar por método de pago
    const porMetodo = completadas.reduce((acc, sale) => {
      acc[sale.metodo_pago] = (acc[sale.metodo_pago] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    return { total, count, promedio, porMetodo };
  }, [sales]);

  // Datos para gráfico de ventas por día
  const salesByDay = useMemo(() => {
    if (!sales) return [];

    const salesMap = new Map<string, number>();

    sales
      .filter(s => s.estado === 'completada')
      .forEach(sale => {
        const fecha = sale.fecha;
        const existing = salesMap.get(fecha) || 0;
        salesMap.set(fecha, existing + sale.total);
      });

    return Array.from(salesMap.entries())
      .map(([fecha, total]) => {
        const date = new Date(fecha + 'T00:00:00');
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
        const dayNumber = date.getDate();
        return {
          name: `${dayName} ${dayNumber}`,
          fecha,
          ventas: total,
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sales]);

  // Top 5 productos más vendidos
  const topProducts = useMemo(() => {
    if (!productStats) return [];
    return productStats.slice(0, 5);
  }, [productStats]);

  // Datos para gráfico de métodos de pago
  const paymentMethodsData = useMemo(() => {
    if (!stats.porMetodo) return [];
    
    return Object.entries(stats.porMetodo).map(([metodo, total]) => ({
      name: metodo.charAt(0).toUpperCase() + metodo.slice(1),
      value: total,
    }));
  }, [stats.porMetodo]);

  // Rendimiento de vendedores (solo admins)
  const vendedoresStats = useMemo(() => {
    if (!sales || user?.rol !== 'admin') return [];

    const vendedoresMap = new Map<string, { ventas: number; total: number }>();

    sales
      .filter(s => s.estado === 'completada')
      .forEach(sale => {
        const existing = vendedoresMap.get(sale.id_vendedor) || { ventas: 0, total: 0 };
        vendedoresMap.set(sale.id_vendedor, {
          ventas: existing.ventas + 1,
          total: existing.total + sale.total,
        });
      });

    return Array.from(vendedoresMap.entries())
      .map(([id, stats]) => {
        const vendedor = users?.find(u => u.id === id);
        return {
          id,
          nombre: vendedor?.nombre || 'Desconocido',
          ventas: stats.ventas,
          total: stats.total,
          promedio: stats.ventas > 0 ? stats.total / stats.ventas : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [sales, users, user]);

  // Obtener nombre del vendedor
  const getVendedorName = (idVendedor: string) => {
    const vendedor = users?.find(u => u.id === idVendedor);
    return vendedor?.nombre || 'N/A';
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!sales || sales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const completadas = sales.filter(s => s.estado === 'completada');
      
      // Preparar datos con información de productos
      const exportData = completadas.map(sale => {
        const detalles = sale.detalle_venta || [];
        const productos = detalles.map((det: any) => {
          const nombre = det.productos?.nombre || 'N/A';
          return `${det.cantidad}x ${nombre}`;
        }).join(', ');
        
        return {
          ...sale,
          fecha: formatDate(sale.fecha),
          id_vendedor: getVendedorName(sale.id_vendedor),
          productos: productos || 'N/A',
          total: `Bs. ${sale.total.toFixed(2)}`,
          metodo_pago: sale.metodo_pago.charAt(0).toUpperCase() + sale.metodo_pago.slice(1),
        };
      });
      
      await exportService.exportToPDF({
        title: 'VENTAS',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Hora', dataKey: 'hora', width: 20 },
          { header: 'Vendedor', dataKey: 'id_vendedor', width: 40 },
          { header: 'Productos', dataKey: 'productos', width: 60 },
          { header: 'Total', dataKey: 'total', width: 30 },
          { header: 'Método de Pago', dataKey: 'metodo_pago', width: 35 },
        ],
        data: exportData,
        dateRange: {
          desde: dateRange.desde || undefined,
          hasta: dateRange.hasta || undefined,
        },
        summary: {
          totalVentas: stats.total,
          cantidadVentas: stats.count,
          ticketPromedio: stats.promedio,
        },
        usuario: user?.nombre || 'N/A',
        entity: 'J-Cell - Sistema de Gestión de Ventas',
        reportType: 'RECAUDACIÓN GENERAL POR RESUMENES',
      });
      toast.success('Exportación a PDF completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a PDF');
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!sales || sales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const completadas = sales.filter(s => s.estado === 'completada');
      
      // Preparar datos con información de productos
      const exportData = completadas.map(sale => {
        const detalles = sale.detalle_venta || [];
        const productos = detalles.map((det: any) => {
          const nombre = det.productos?.nombre || 'N/A';
          return `${det.cantidad}x ${nombre}`;
        }).join(', ');
        
        return {
          ...sale,
          fecha: formatDate(sale.fecha),
          id_vendedor: getVendedorName(sale.id_vendedor),
          productos: productos || 'N/A',
          total: sale.total,
          metodo_pago: sale.metodo_pago.charAt(0).toUpperCase() + sale.metodo_pago.slice(1),
        };
      });
      
      await exportService.exportToExcel({
        title: 'Reporte de Ventas',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Hora', dataKey: 'hora', width: 20 },
          { header: 'Vendedor', dataKey: 'id_vendedor', width: 40 },
          { header: 'Productos', dataKey: 'productos', width: 60 },
          { header: 'Total', dataKey: 'total', width: 30 },
          { header: 'Método de Pago', dataKey: 'metodo_pago', width: 35 },
        ],
        data: exportData,
        dateRange: {
          desde: dateRange.desde || undefined,
          hasta: dateRange.hasta || undefined,
        },
        summary: {
          totalVentas: stats.total,
          cantidadVentas: stats.count,
          ticketPromedio: stats.promedio,
        },
      });
      toast.success('Exportación a Excel completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a Excel');
    }
  };

  // Filtrar créditos por fecha
  const creditSales = useMemo(() => {
    if (!allCreditSales || allCreditSales.length === 0) return [];
    return allCreditSales.filter(sale => {
      const saleDate = sale.fecha;
      return saleDate >= dateRangeCredito.desde && saleDate <= dateRangeCredito.hasta;
    });
  }, [allCreditSales, dateRangeCredito]);

  // Estadísticas de crédito
  const creditStats = useMemo(() => {
    if (!creditSales || creditSales.length === 0) {
      return {
        totalVentas: 0,
        totalPendiente: 0,
        totalCobrado: 0,
        totalInteres: 0,
        cantidadActivos: 0,
        cantidadPagados: 0,
        cantidadParciales: 0,
        cantidadPendientes: 0,
        porEstado: {} as Record<string, number>,
      };
    }

    const totalVentas = creditSales.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0);
    const totalPendiente = creditSales.reduce((sum, sale) => {
      const saldo = parseFloat((sale as any).saldo_pendiente?.toString() || '0');
      return sum + Math.max(0, saldo);
    }, 0);
    const totalCobrado = creditSales.reduce((sum, sale) => {
      const pagado = parseFloat((sale as any).monto_pagado?.toString() || '0');
      return sum + pagado;
    }, 0);
    const totalInteres = creditSales.reduce((sum, sale) => {
      const interes = parseFloat((sale as any).monto_interes?.toString() || '0');
      return sum + interes;
    }, 0);

    const porEstado = creditSales.reduce((acc, sale) => {
      const estado = (sale as any).estado_credito || 'pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalVentas,
      totalPendiente,
      totalCobrado,
      totalInteres,
      cantidadActivos: creditSales.length,
      cantidadPagados: porEstado.pagado || 0,
      cantidadParciales: porEstado.parcial || 0,
      cantidadPendientes: porEstado.pendiente || 0,
      porEstado,
    };
  }, [creditSales]);

  // Datos para gráfico de distribución por estado
  const creditStatusData = useMemo(() => {
    if (!creditStats.porEstado) return [];
    
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      pagado: 'Pagado',
      vencido: 'Vencido',
    };

    return Object.entries(creditStats.porEstado).map(([estado, cantidad]) => ({
      name: labels[estado] || estado,
      value: cantidad,
    }));
  }, [creditStats.porEstado]);

  // Datos para gráfico de cobros por día
  const creditPaymentsByDay = useMemo(() => {
    if (!creditSales) return [];

    const paymentsMap = new Map<string, number>();

    creditSales.forEach(sale => {
      const fecha = sale.fecha;
      const pagado = parseFloat((sale as any).monto_pagado?.toString() || '0');
      const existing = paymentsMap.get(fecha) || 0;
      paymentsMap.set(fecha, existing + pagado);
    });

    return Array.from(paymentsMap.entries())
      .map(([fecha, total]) => {
        const date = new Date(fecha + 'T00:00:00');
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
        const dayNumber = date.getDate();
        return {
          name: `${dayName} ${dayNumber}`,
          fecha,
          cobros: total,
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [creditSales]);

  // Top clientes con más créditos
  const topClientsCredits = useMemo(() => {
    if (!creditSales) return [];

    const clientsMap = new Map<string, { nombre: string; cantidad: number; total: number }>();

    creditSales.forEach(sale => {
      const cliente = (sale as any).clientes;
      if (!cliente) return;

      const existing = clientsMap.get(cliente.id) || { nombre: cliente.nombre || 'Sin nombre', cantidad: 0, total: 0 };
      clientsMap.set(cliente.id, {
        nombre: existing.nombre,
        cantidad: existing.cantidad + 1,
        total: existing.total + parseFloat(sale.total.toString()),
      });
    });

    return Array.from(clientsMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [creditSales]);

  // Exportar reporte de créditos a PDF
  const handleExportCreditPDF = async () => {
    if (!creditSales || creditSales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const exportData = creditSales.map(sale => {
        const cliente = (sale as any).clientes;
        const detalles = sale.detalle_venta || [];
        const productos = detalles.map((det: any) => {
          const nombre = det.productos?.nombre || 'N/A';
          return `${det.cantidad}x ${nombre}`;
        }).join(', ');
        
        return {
          ...sale,
          fecha: formatDate(sale.fecha),
          cliente: cliente?.nombre || 'N/A',
          ci_nit: cliente?.ci_nit || 'N/A',
          productos: productos || 'N/A',
          total: `Bs. ${sale.total.toFixed(2)}`,
          monto_interes: `Bs. ${((sale as any).monto_interes || 0).toFixed(2)}`,
          total_con_interes: `Bs. ${((sale as any).total_con_interes || sale.total).toFixed(2)}`,
          monto_pagado: `Bs. ${((sale as any).monto_pagado || 0).toFixed(2)}`,
          saldo_pendiente: `Bs. ${((sale as any).saldo_pendiente || 0).toFixed(2)}`,
          estado_credito: ((sale as any).estado_credito || 'pendiente').charAt(0).toUpperCase() + ((sale as any).estado_credito || 'pendiente').slice(1),
          meses_credito: sale.meses_credito || 0,
        };
      });
      
      await exportService.exportToPDF({
        title: 'VENTAS A CRÉDITO',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 20 },
          { header: 'Cliente', dataKey: 'cliente', width: 30 },
          { header: 'CI/NIT', dataKey: 'ci_nit', width: 22 },
          { header: 'Productos', dataKey: 'productos', width: 35 },
          { header: 'Total', dataKey: 'total', width: 20 },
          { header: 'Interés', dataKey: 'monto_interes', width: 20 },
          { header: 'Total c/Int', dataKey: 'total_con_interes', width: 22 },
          { header: 'Pagado', dataKey: 'monto_pagado', width: 20 },
          { header: 'Pendiente', dataKey: 'saldo_pendiente', width: 22 },
          { header: 'Estado', dataKey: 'estado_credito', width: 18 },
          { header: 'Cuotas', dataKey: 'meses_credito', width: 18 },
        ],
        data: exportData,
        dateRange: {
          desde: dateRangeCredito.desde || undefined,
          hasta: dateRangeCredito.hasta || undefined,
        },
        summary: {
          totalVentas: creditStats.totalVentas,
          cantidadVentas: creditStats.cantidadActivos,
          ticketPromedio: creditStats.cantidadActivos > 0 ? creditStats.totalVentas / creditStats.cantidadActivos : 0,
        },
        usuario: user?.nombre || 'N/A',
        entity: 'J-Cell - Sistema de Gestión de Ventas',
        reportType: 'REPORTE DE VENTAS A CRÉDITO',
      });
      toast.success('Exportación a PDF completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a PDF');
    }
  };

  // Exportar reporte de créditos a Excel
  const handleExportCreditExcel = async () => {
    if (!creditSales || creditSales.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const exportData = creditSales.map(sale => {
        const cliente = (sale as any).clientes;
        const detalles = sale.detalle_venta || [];
        const productos = detalles.map((det: any) => {
          const nombre = det.productos?.nombre || 'N/A';
          return `${det.cantidad}x ${nombre}`;
        }).join(', ');
        
        return {
          ...sale,
          fecha: formatDate(sale.fecha),
          cliente: cliente?.nombre || 'N/A',
          ci_nit: cliente?.ci_nit || 'N/A',
          productos: productos || 'N/A',
          total: sale.total,
          monto_interes: (sale as any).monto_interes || 0,
          total_con_interes: (sale as any).total_con_interes || sale.total,
          monto_pagado: (sale as any).monto_pagado || 0,
          saldo_pendiente: (sale as any).saldo_pendiente || 0,
          estado_credito: ((sale as any).estado_credito || 'pendiente').charAt(0).toUpperCase() + ((sale as any).estado_credito || 'pendiente').slice(1),
          meses_credito: sale.meses_credito || 0,
        };
      });
      
      await exportService.exportToExcel({
        title: 'Reporte de Ventas a Crédito',
        columns: [
          { header: 'Fecha', dataKey: 'fecha', width: 25 },
          { header: 'Cliente', dataKey: 'cliente', width: 40 },
          { header: 'CI/NIT', dataKey: 'ci_nit', width: 30 },
          { header: 'Productos', dataKey: 'productos', width: 50 },
          { header: 'Total', dataKey: 'total', width: 25 },
          { header: 'Interés', dataKey: 'monto_interes', width: 25 },
          { header: 'Total c/Interés', dataKey: 'total_con_interes', width: 30 },
          { header: 'Pagado', dataKey: 'monto_pagado', width: 25 },
          { header: 'Pendiente', dataKey: 'saldo_pendiente', width: 25 },
          { header: 'Estado', dataKey: 'estado_credito', width: 25 },
          { header: 'Cuotas', dataKey: 'meses_credito', width: 20 },
        ],
        data: exportData,
        dateRange: {
          desde: dateRangeCredito.desde || undefined,
          hasta: dateRangeCredito.hasta || undefined,
        },
        summary: {
          totalVentas: creditStats.totalVentas,
          cantidadVentas: creditStats.cantidadActivos,
          ticketPromedio: creditStats.cantidadActivos > 0 ? creditStats.totalVentas / creditStats.cantidadActivos : 0,
        },
      });
      toast.success('Exportación a Excel completada');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar a Excel');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout title="Reportes">
      <div className="space-y-4 sm:space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'general' | 'credito')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Reportes Generales</TabsTrigger>
            <TabsTrigger value="credito">Ventas a Crédito</TabsTrigger>
          </TabsList>

          {/* Pestaña: Reportes Generales */}
          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Análisis de Ventas
                </h2>
                <p className="text-sm text-muted-foreground">
                  {period === 'today' && 'Resumen del día de hoy'}
                  {period === 'week' && 'Resumen de los últimos 7 días'}
                  {period === 'month' && 'Resumen del último mes'}
                  {period === 'custom' && `Desde ${formatDate(dateRange.desde)} hasta ${formatDate(dateRange.hasta)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar
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
            </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mes</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fechaDesde">Desde</Label>
                    <DatePicker
                      id="fechaDesde"
                      value={fechaDesde}
                      onChange={setFechaDesde}
                      placeholder="Seleccionar fecha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaHasta">Hasta</Label>
                    <DatePicker
                      id="fechaHasta"
                      value={fechaHasta}
                      onChange={setFechaHasta}
                      placeholder="Seleccionar fecha"
                      min={fechaDesde}
                    />
                  </div>
                </>
              )}

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
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* Primera fila: Título e icono */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">Total Vendido</p>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
                {/* Segunda fila: Valor */}
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
                  ) : (
                    <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold break-words">Bs. {stats.total.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* Primera fila: Título e icono */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">Número de Ventas</p>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                </div>
                {/* Segunda fila: Valor */}
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                  ) : (
                    <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{stats.count}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* Primera fila: Título e icono */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">Promedio de Ventas</p>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                </div>
                {/* Segunda fila: Valor */}
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                  ) : (
                    <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold break-words">Bs. {stats.promedio.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* Primera fila: Título e icono */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">Productos Únicos</p>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                </div>
                {/* Segunda fila: Valor */}
                <div>
                  {loadingProducts ? (
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                  ) : (
                    <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{productStats?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Sales Trend */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="font-display">Tendencia de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : salesByDay.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesByDay}>
                      <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(224, 71%, 45%)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(224, 71%, 45%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(220, 9%, 46%)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(220, 9%, 46%)"
                        fontSize={12}
                        tickFormatter={(value) => `Bs.${value}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(0, 0%, 100%)',
                          border: '1px solid hsl(220, 13%, 91%)',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [`Bs. ${value}`, 'Ventas']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ventas" 
                        stroke="hsl(224, 71%, 45%)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorVentas)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="font-display">Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : paymentMethodsData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `Bs. ${value.toFixed(2)}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos vendidos en este período
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="nombre" 
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                      width={120}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 13%, 91%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value} unidades`, 'Cantidad']}
                    />
                    <Bar 
                      dataKey="cantidad_total" 
                      fill="hsl(162, 63%, 41%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendedores Performance (solo admins) */}
        {user?.rol === 'admin' && vendedoresStats.length > 0 && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="font-display">Rendimiento de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendedoresStats.map((vendedor) => (
                  <div key={vendedor.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vendedor.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {vendedor.ventas} ventas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Bs. {vendedor.total.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        Promedio: Bs. {vendedor.promedio.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* Pestaña: Ventas a Crédito */}
          <TabsContent value="credito" className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Reportes de Ventas a Crédito
                </h2>
                <p className="text-sm text-muted-foreground">
                  {periodCredito === 'today' && 'Resumen del día de hoy'}
                  {periodCredito === 'week' && 'Resumen de los últimos 7 días'}
                  {periodCredito === 'month' && 'Resumen del último mes'}
                  {periodCredito === 'custom' && `Desde ${formatDate(dateRangeCredito.desde)} hasta ${formatDate(dateRangeCredito.hasta)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCreditPDF}>
                      <FileText className="mr-2 h-4 w-4" />
                      Exportar a PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCreditExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Exportar a Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filtros para Créditos */}
            <Card>
              <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={periodCredito} onValueChange={(value) => setPeriodCredito(value as PeriodType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mes</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {periodCredito === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fechaDesdeCredito">Desde</Label>
                        <DatePicker
                          id="fechaDesdeCredito"
                          value={fechaDesdeCredito}
                          onChange={setFechaDesdeCredito}
                          placeholder="Seleccionar fecha"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fechaHastaCredito">Hasta</Label>
                        <DatePicker
                          id="fechaHastaCredito"
                          value={fechaHastaCredito}
                          onChange={setFechaHastaCredito}
                          placeholder="Seleccionar fecha"
                          min={fechaDesdeCredito}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats de Crédito */}
            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Total Ventas</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold break-words">Bs. {creditStats.totalVentas.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Pendiente por Cobrar</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold break-words">Bs. {creditStats.totalPendiente.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Total Cobrado</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold break-words">Bs. {creditStats.totalCobrado.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Créditos Activos</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{creditStats.cantidadActivos}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats adicionales de crédito */}
            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
              <Card>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Pagados</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{creditStats.cantidadPagados}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Parciales</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{creditStats.cantidadParciales}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-medium text-muted-foreground">Pendientes</p>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                      </div>
                    </div>
                    <div>
                      {isLoadingCredits ? (
                        <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                      ) : (
                        <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold">{creditStats.cantidadPendientes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos de Crédito */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Distribución por Estado */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="font-display">Distribución por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCredits ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : creditStatusData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos para mostrar
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={creditStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {creditStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `${value} créditos`}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tendencia de Cobros */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="font-display">Tendencia de Cobros</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCredits ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : creditPaymentsByDay.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos para mostrar
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={creditPaymentsByDay}>
                          <defs>
                            <linearGradient id="colorCobros" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(162, 63%, 41%)" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="hsl(162, 63%, 41%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(220, 9%, 46%)"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(220, 9%, 46%)"
                            fontSize={12}
                            tickFormatter={(value) => `Bs.${value}`}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(0, 0%, 100%)',
                              border: '1px solid hsl(220, 13%, 91%)',
                              borderRadius: '8px',
                            }}
                            formatter={(value) => [`Bs. ${value}`, 'Cobros']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cobros" 
                            stroke="hsl(162, 63%, 41%)" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorCobros)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes con más Créditos */}
            {topClientsCredits.length > 0 && (
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="font-display">Top Clientes con más Créditos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topClientsCredits.map((cliente, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {cliente.cantidad} crédito{cliente.cantidad !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Bs. {cliente.total.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            Promedio: Bs. {(cliente.total / cliente.cantidad).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
