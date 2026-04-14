import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCart } from '@/contexts/CartContext';
import { PaymentMethod, Client } from '@/types';
import { useAuth } from '@/contexts';
import { useProducts, useSearchProducts } from '@/hooks/useProducts';
import { useCreateSale } from '@/hooks/useSales';
import { useClients, useSearchClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { Sale, PreregistroVentaItem, TransferenciaSaldo, SaldoRestanteMayorista } from '@/types';
import { preregistrosService } from '@/services/preregistros.service';
import { transferenciasService } from '@/services/transferencias.service';
import { saldosRestantesMayoristasService } from '@/services/saldos-restantes-mayoristas.service';
import { pagosMayoristasService } from '@/services/pagos-mayoristas.service';
import { ventasMinoristasService } from '@/services/ventas-minoristas.service';
import { ventasMayoristasService } from '@/services/ventas-mayoristas.service';
import {
  minoristaJornadaDiariaService,
  MINORISTA_JORNADA_DIARIA_QUERY_KEY,
} from '@/services/minorista-jornada-diaria.service';
import { tryAutoFinalizarVentaMinoristaDiaAnterior } from '@/services/minorista-auto-finalizar-dia-anterior.service';
import {
  getLocalDateISO,
  getLocalTimeISO,
  formatDateOnlyLocal,
  parseDateOnlyLocal,
} from '@/lib/utils';
import {
  generarArchivoPngQrTransferencia,
  descargarArchivo,
} from '@/lib/qr-transferencia-share';
import { printTicket } from '@/utils/print';
import { QRCodeSVG } from 'qrcode.react';
import { salesService } from '@/services/sales.service';
import { usersService } from '@/services/users.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  X,
  ClipboardList,
  CalendarDays,
  Share2,
  Download,
  Lock,
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
import { useSidebar } from '@/components/ui/sidebar';
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

type BucketVentaResumen = 'tarjeta' | 'recarga' | 'chip' | 'otros';

function normalizeResumenStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Agrupa ventas del resumen preregistro en Tarjeta / Recarga / Chip (y Otros si no encaja). */
function bucketPreregistroItem(
  categoriaNombre: string | undefined,
  productoNombre: string
): BucketVentaResumen {
  const c = normalizeResumenStr(categoriaNombre || '');
  const p = normalizeResumenStr(productoNombre);
  if (c.includes('recarga') || p.includes('recarga')) return 'recarga';
  if (c.includes('chip') || p.includes('chip')) return 'chip';
  if (c.includes('tarjeta') || c.includes('tarjet')) return 'tarjeta';
  if (p.includes('tigo') || p.includes('entel') || p.includes('viva')) return 'tarjeta';
  return 'otros';
}

function formatFechaISOLocalLegible(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const s = new Date(y, m - 1, d).toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fechaLocalToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Debe renderizarse dentro de DashboardLayout (SidebarProvider); no usar useSidebar en el padre NewSale. */
function VendedorMobileCartFab({
  itemCount,
  onOpen,
}: {
  itemCount: number;
  onOpen: () => void;
}) {
  const isMobile = useIsMobile();
  const { state: sidebarDesktopState } = useSidebar();
  return (
    <Button
      onClick={onOpen}
      className={cn(
        'fixed z-[110] h-14 w-14 rounded-full shadow-lg',
        'bottom-[max(1.5rem,env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-6',
        isMobile
          ? 'left-4 sm:left-6'
          : sidebarDesktopState === 'expanded'
            ? 'left-4 sm:left-6 md:left-[calc(var(--sidebar-width)+0.75rem)]'
            : 'left-4 sm:left-6 md:left-[calc(var(--sidebar-width-icon)+0.75rem)]'
      )}
      size="icon"
    >
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full">
          {itemCount}
        </Badge>
      )}
    </Button>
  );
}

export default function NewSale() {
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
  const { user, refreshUserProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const fechaHoy = getLocalDateISO();
  const ocultarSelectorMetodoPago =
    user?.rol === 'minorista' || user?.rol === 'mayorista';

  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();
  const { data: searchResults = [], isLoading: searching } = useSearchProducts(searchTerm);
  const { data: allClients = [] } = useClients();
  const { data: clientSearchResults = [] } = useSearchClients(clientSearchTerm);
  const { data: categories = [] } = useCategories();
  const createSaleMutation = useCreateSale();

  // Estados para preregistros (minorista/mayorista)
  const [preregistroItems, setPreregistroItems] = useState<PreregistroVentaItem[]>([]);
  const [isLoadingPreregistros, setIsLoadingPreregistros] = useState(false);
  const [editingCantidadRestante, setEditingCantidadRestante] = useState<string | null>(null);
  const [editCantidadRestanteValue, setEditCantidadRestanteValue] = useState<string>('');
  
  // Estados para mayoristas: arrastrar saldos restantes
  const [showArrastrarSaldosDialog, setShowArrastrarSaldosDialog] = useState(false);
  const [saldosParaArrastrar, setSaldosParaArrastrar] = useState<Array<{ id_producto: string; cantidad_restante: number; nombre: string }>>([]);
  
  // Estados para minoristas: generar QR
  const [showQRDialog, setShowQRDialog] = useState(false);
  /** Modal QR al consultar un día pasado con transferencia pendiente. */
  const [showQRDialogConsultaHistorica, setShowQRDialogConsultaHistorica] = useState(false);
  /** Tras finalizar venta se muestra el QR primero; al cerrar el modal debe abrirse el éxito (no al usar "Mostrar QR"). */
  const [showSuccessAfterQrClose, setShowSuccessAfterQrClose] = useState(false);
  const [showMinoristaFinalizarAdvertencia, setShowMinoristaFinalizarAdvertencia] = useState(false);
  const [pendingFinalizarCierraSheet, setPendingFinalizarCierraSheet] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [transferenciaCreada, setTransferenciaCreada] = useState<TransferenciaSaldo | null>(null);
  const [minoristaHayVentaNuevaVentaHoy, setMinoristaHayVentaNuevaVentaHoy] = useState(false);
  const [iniciandoJornadaMinorista, setIniciandoJornadaMinorista] = useState(false);
  /** Fecha consultada en la tarjeta de preregistro (minorista); venta / jornada / QR solo aplican si es hoy. */
  const [fechaVistaMinorista, setFechaVistaMinorista] = useState(() => getLocalDateISO());
  const [calendarioMinoristaOpen, setCalendarioMinoristaOpen] = useState(false);
  const [calendarMonthMinorista, setCalendarMonthMinorista] = useState<Date>(() =>
    parseDateOnlyLocal(getLocalDateISO())
  );

  useEffect(() => {
    setCalendarMonthMinorista(parseDateOnlyLocal(fechaVistaMinorista));
  }, [fechaVistaMinorista]);

  const { data: minoristaUltimaFechaFinalizadaVenta } = useQuery({
    queryKey: ['minorista-ultima-finalizada-preregistro', user?.id],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return null;
      return ventasMinoristasService.getUltimaFechaVentaDesdeNuevaVenta(user.id);
    },
    enabled: !!user && user.rol === 'minorista',
  });

  const { data: minoristaJornadaIniciadaHoy = false } = useQuery({
    queryKey: [MINORISTA_JORNADA_DIARIA_QUERY_KEY, user?.id, fechaHoy],
    queryFn: async () => {
      if (!user || user.rol !== 'minorista') return false;
      const row = await minoristaJornadaDiariaService.getByUsuarioYFecha(user.id, fechaHoy);
      return row != null;
    },
    enabled: !!user && user.rol === 'minorista',
  });

  const fechaResumenVentasDia = user?.rol === 'minorista' ? fechaVistaMinorista : fechaHoy;

  const {
    data: ventasRegistradasResumenRaw = [],
    isPending: cargandoVentasResumenDia,
  } = useQuery({
    queryKey: ['preregistro-resumen-ventas-dia', user?.id, user?.rol, fechaResumenVentasDia],
    queryFn: async () => {
      if (!user?.id) return [];
      if (user.rol === 'minorista') {
        const v = await ventasMinoristasService.getVentasDelDia(user.id, fechaVistaMinorista);
        return v.filter((row) => row.cantidad_vendida > 0);
      }
      if (user.rol === 'mayorista') {
        const v = await ventasMayoristasService.getVentasDelPeriodo(user.id, fechaHoy, fechaHoy);
        return v.filter((row) => row.cantidad_vendida > 0);
      }
      return [];
    },
    enabled: !!user?.id && (user.rol === 'minorista' || user.rol === 'mayorista'),
  });

  const { data: transferenciaQRConsultaHistorica = null, isFetching: cargandoTransferenciaQRConsultaHistorica } =
    useQuery({
      queryKey: ['minorista-transfer-qr-consulta-dia', user?.id, fechaVistaMinorista],
      queryFn: async () => {
        if (!user || user.rol !== 'minorista') return null;
        const hoy = getLocalDateISO();
        if (fechaVistaMinorista === hoy) return null;
        const porDia = await transferenciasService.getPendienteOrigenPorDiaVenta(user.id, fechaVistaMinorista);
        if (porDia) return porDia;
        const ultima = await transferenciasService.getPendienteOrigenUltimaVentaFinalizada(user.id);
        if (!ultima) return null;
        const venta = await salesService.getById(ultima.id_venta_origen);
        const fv = venta?.fecha ? String(venta.fecha).split('T')[0] : '';
        if (venta?.estado === 'completada' && fv === fechaVistaMinorista) return ultima;
        return null;
      },
      enabled: !!user?.id && user.rol === 'minorista' && fechaVistaMinorista !== getLocalDateISO(),
    });

  const compartirCodigoQRTransferencia = useCallback(async (codigo: string) => {
    const c = codigo.trim();
    if (!c) return;
    const cuerpo = `Código transferencia de saldos (Ventas Jcell):\n${c}`;
    const title = 'Transferencia de saldos';

    let pngFile: File | null = null;
    try {
      pngFile = await generarArchivoPngQrTransferencia(c);
    } catch {
      pngFile = null;
    }

    const nav = typeof navigator !== 'undefined' ? navigator : null;

    try {
      if (pngFile && nav?.share && nav.canShare) {
        const full: ShareData = { files: [pngFile], title, text: cuerpo };
        if (nav.canShare(full)) {
          await nav.share(full);
          return;
        }
        if (nav.canShare({ files: [pngFile] })) {
          await nav.share({ files: [pngFile], title });
          return;
        }
      }
      if (nav?.share) {
        await nav.share({ title, text: cuerpo });
        return;
      }
      if (pngFile && nav?.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await nav.clipboard.write([new ClipboardItem({ [pngFile.type]: pngFile })]);
          toast.success('Imagen del QR copiada al portapapeles. Pegala en WhatsApp u otra app.');
          return;
        } catch {
          /* intentar texto */
        }
      }
      await navigator.clipboard.writeText(c);
      toast.success(
        'Código copiado al portapapeles. En este dispositivo no está disponible el menú nativo de compartir.'
      );
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(c);
        toast.success('Código copiado al portapapeles');
      } catch {
        toast.error('No se pudo compartir ni copiar el código');
      }
    }
  }, []);

  const descargarImagenQRTransferencia = useCallback(async (codigo: string) => {
    const c = codigo.trim();
    if (!c) return;
    try {
      const file = await generarArchivoPngQrTransferencia(c);
      descargarArchivo(file);
      toast.success('Imagen del QR descargada');
    } catch {
      toast.error('No se pudo generar la imagen del QR');
    }
  }, []);

  useEffect(() => {
    if (fechaVistaMinorista === getLocalDateISO()) {
      setShowQRDialogConsultaHistorica(false);
    }
  }, [fechaVistaMinorista]);

  const bloqueQRResumenConsultaHistorica = useMemo(() => {
    if (user?.rol !== 'minorista' || fechaVistaMinorista === getLocalDateISO()) return null;
    if (cargandoTransferenciaQRConsultaHistorica) {
      return (
        <div className="flex justify-center py-3" aria-hidden>
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    const codigo = transferenciaQRConsultaHistorica?.codigo_qr?.trim();
    if (!codigo) return null;
    return (
      <div className="space-y-3 rounded-lg border border-primary/25 bg-muted/40 p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-center text-muted-foreground">
          Transferencia de saldos pendiente
        </p>
        <p className="text-xs text-center text-muted-foreground px-1">
          Podés <strong>mostrar el QR</strong> para que lo escaneen, <strong>compartir</strong> código e imagen PNG por
          WhatsApp, etc., o <strong>descargar la imagen</strong>. El otro minorista lo usa en{' '}
          <strong>Escanear QR</strong>.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className="h-11 flex-1 gap-2 sm:min-w-[140px]"
            onClick={() => setShowQRDialogConsultaHistorica(true)}
          >
            <QrCode className="h-4 w-4 shrink-0" />
            Mostrar QR
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 gap-2 sm:min-w-[140px]"
            onClick={() => void compartirCodigoQRTransferencia(codigo)}
          >
            <Share2 className="h-4 w-4 shrink-0" />
            Compartir
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 gap-2 sm:min-w-[140px]"
            onClick={() => void descargarImagenQRTransferencia(codigo)}
          >
            <Download className="h-4 w-4 shrink-0" />
            Guardar imagen
          </Button>
        </div>
      </div>
    );
  }, [
    user?.rol,
    fechaVistaMinorista,
    cargandoTransferenciaQRConsultaHistorica,
    transferenciaQRConsultaHistorica,
    compartirCodigoQRTransferencia,
    descargarImagenQRTransferencia,
  ]);

  const minoristaPuedeEditarPreregistro = useMemo(() => {
    if (user?.rol !== 'minorista') return true;
    const p = user.edicion_preregistro_nueva_venta_permitida;
    // El bloqueo por "venta finalizada" debe aplicar solo al día actual.
    const minoristaFinalizoHoy =
      minoristaHayVentaNuevaVentaHoy || minoristaUltimaFechaFinalizadaVenta === fechaHoy;
    if (p === false) return !minoristaFinalizoHoy;
    if (p === true) return true;
    return !minoristaFinalizoHoy;
  }, [
    user?.rol,
    user?.edicion_preregistro_nueva_venta_permitida,
    minoristaHayVentaNuevaVentaHoy,
    minoristaUltimaFechaFinalizadaVenta,
    fechaHoy,
  ]);

  const minoristaEdicionBloqueada =
    user?.rol === 'minorista' && !minoristaPuedeEditarPreregistro;
  const minoristaMostrarQREnLugarDeFinalizar =
    minoristaEdicionBloqueada && Boolean(qrCode.trim());

  const minoristaConsultaEsHoy =
    user?.rol !== 'minorista' || fechaVistaMinorista === getLocalDateISO();

  const minoristaBloqueadoPorJornadaPendiente = useMemo(() => {
    if (user?.rol !== 'minorista') return false;
    // Regla estricta: para trabajar hoy se debe iniciar jornada explícitamente.
    // Solo se desbloquea si ya hay jornada iniciada hoy o una venta guardada hoy.
    if (!minoristaConsultaEsHoy) return false;
    if (minoristaHayVentaNuevaVentaHoy) return false;
    if (minoristaJornadaIniciadaHoy) return false;
    return true;
  }, [
    user?.rol,
    minoristaConsultaEsHoy,
    minoristaHayVentaNuevaVentaHoy,
    minoristaJornadaIniciadaHoy,
  ]);

  const minoristaBloqueadoPorJornadaPendienteVista =
    minoristaBloqueadoPorJornadaPendiente && minoristaConsultaEsHoy;

  const handleCalendarioMinoristaSelect = useCallback((d: Date | undefined) => {
    if (!d) return;
    const picked = fechaLocalToISO(d);
    if (picked > getLocalDateISO()) return;
    setFechaVistaMinorista(picked);
    setCalendarioMinoristaOpen(false);
  }, []);

  useEffect(() => {
    if (user?.rol !== 'minorista' || !user.id) {
      setMinoristaHayVentaNuevaVentaHoy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const hay = await ventasMinoristasService.hasVentaRegistradaDesdeNuevaVentaEnFecha(
          user.id,
          getLocalDateISO()
        );
        if (!cancelled) setMinoristaHayVentaNuevaVentaHoy(hay);
      } catch {
        if (!cancelled) setMinoristaHayVentaNuevaVentaHoy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.rol]);

  useEffect(() => {
    if (user?.rol !== 'minorista' || !user.id) return;
    if (minoristaPuedeEditarPreregistro) return;
    try {
      const raw = localStorage.getItem(`ventasJcell_minorista_qr_${user.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { codigo_qr?: string; fecha?: string };
      if (parsed.fecha === getLocalDateISO() && parsed.codigo_qr) {
        setQrCode(parsed.codigo_qr);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id, user?.rol, minoristaPuedeEditarPreregistro]);

  useEffect(() => {
    if (user?.rol !== 'minorista' || !user.id) return;
    if (!minoristaPuedeEditarPreregistro) return;
    localStorage.removeItem(`ventasJcell_minorista_qr_${user.id}`);
    setQrCode('');
    setTransferenciaCreada(null);
  }, [user?.id, user?.rol, minoristaPuedeEditarPreregistro]);

  // Recuperar código QR desde BD si la venta ya finalizó pero el estado en cliente se perdió (recarga, otro dispositivo).
  useEffect(() => {
    if (user?.rol !== 'minorista' || !user.id || !minoristaEdicionBloqueada) return;
    if (qrCode.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await transferenciasService.getPendienteOrigenUltimaVentaFinalizada(user.id);
        if (cancelled || !t?.codigo_qr) return;
        setQrCode(t.codigo_qr);
        setTransferenciaCreada(t);
        try {
          localStorage.setItem(
            `ventasJcell_minorista_qr_${user.id}`,
            JSON.stringify({ codigo_qr: t.codigo_qr, fecha: getLocalDateISO() })
          );
        } catch {
          /* ignore */
        }
      } catch (e) {
        console.warn('No se pudo recuperar el QR de transferencia pendiente:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.rol, minoristaEdicionBloqueada, qrCode]);

  // Cargar preregistros si es minorista o mayorista
  useEffect(() => {
    const loadPreregistros = async () => {
      if (!user || (user.rol !== 'minorista' && user.rol !== 'mayorista')) {
        return;
      }

      try {
        setIsLoadingPreregistros(true);
        const hoyISO = getLocalDateISO();
        const fechaActual = user.rol === 'minorista' ? fechaVistaMinorista : hoyISO;

        if (user.rol === 'minorista') {
          if (fechaActual === hoyISO) {
            try {
              const auto = await tryAutoFinalizarVentaMinoristaDiaAnterior(user.id);
              if (auto.ok && auto.mode === 'done') {
                toast.success(
                  `Se guardó la venta del ${formatDateOnlyLocal(auto.fechaCerrada)} que había quedado sin finalizar (cierre automático). No equivale a haber finalizado hoy: ya podés editar el preregistro del día actual.`
                );
                void queryClient.invalidateQueries({ queryKey: ['minorista-ultima-finalizada-preregistro'] });
                void queryClient.invalidateQueries({ queryKey: ['pedidos-gate'] });
                void queryClient.invalidateQueries({ queryKey: ['preregistro-resumen-ventas-dia'] });
                void queryClient.invalidateQueries({ queryKey: ['minorista-hay-venta-nueva-venta-hoy'] });
                void queryClient.invalidateQueries({ queryKey: [MINORISTA_JORNADA_DIARIA_QUERY_KEY] });
                void queryClient.invalidateQueries({ queryKey: ['minorista-transfer-qr-consulta-dia'] });
                void refreshUserProfile();
              } else if (!auto.ok) {
                console.warn('Auto-cierre venta día anterior:', auto.message);
              }
            } catch (e: unknown) {
              console.warn('Auto-cierre venta día anterior:', e);
            }
          }

          // Cargar preregistros del minorista actual (sin filtrar por fecha, son reutilizables)
          const preregistros = await preregistrosService.getPreregistrosMinorista(user.id);

          // Cargar aumentos del día consultado desde ventas_minoristas
          const aumentosDelDia = await ventasMinoristasService.getAumentosDelDia(user.id, fechaActual);

          const ventasDelDiaHistorial =
            fechaActual !== hoyISO
              ? await ventasMinoristasService.getVentasDelDia(user.id, fechaActual)
              : [];

          const vendidoPorProducto = new Map<string, number>();
          if (fechaActual !== hoyISO) {
            ventasDelDiaHistorial.forEach((v) => {
              const prev = vendidoPorProducto.get(v.id_producto) || 0;
              vendidoPorProducto.set(v.id_producto, prev + (v.cantidad_vendida || 0));
            });
          }

          // Crear un mapa de aumentos por producto
          const aumentosPorProducto = new Map<string, number>();
          aumentosDelDia.forEach((aumento) => {
            const actual = aumentosPorProducto.get(aumento.id_producto) || 0;
            aumentosPorProducto.set(aumento.id_producto, actual + aumento.cantidad_aumento);
          });

          const items: PreregistroVentaItem[] = preregistros.map((p) => {
            const aumento = aumentosPorProducto.get(p.id_producto) || 0;
            const vendido = fechaActual !== hoyISO ? vendidoPorProducto.get(p.id_producto) || 0 : 0;
            const saldoDisponible = p.cantidad + aumento;

            let cantidadRestante: number;
            if (fechaActual !== hoyISO) {
              cantidadRestante = Math.max(0, saldoDisponible - vendido);
            } else if (p.cantidad_restante != null && !Number.isNaN(Number(p.cantidad_restante))) {
              cantidadRestante = Math.max(0, Math.min(Number(p.cantidad_restante), saldoDisponible));
            } else {
              // Solo BD: sin fallback localStorage (la columna/RPC debe existir en Supabase)
              cantidadRestante = saldoDisponible;
            }
            
            return {
              id: p.id,
              nombre: p.producto?.nombre || 'N/A',
              codigo: p.producto?.codigo,
              cantidad: p.cantidad,
              aumento: aumento, // Aumentos del día desde ventas_minoristas
              cantidadRestante: cantidadRestante, // Usar saldo guardado o saldo disponible
              precio_unitario: p.producto?.precio_por_unidad || 0,
              subtotal: 0,
              id_producto: p.id_producto,
              id_categoria: p.producto?.id_categoria,
            };
          });
          
          // Calcular subtotales iniciales (inicialmente 0 porque cantidadRestante = saldo disponible)
          items.forEach(item => {
            item.subtotal = (item.cantidad + item.aumento - item.cantidadRestante) * item.precio_unitario;
          });
          setPreregistroItems(items);
        } else if (user.rol === 'mayorista') {
          // Cargar preregistros del mayorista (sin filtrar por fecha, son reutilizables como minorista)
          const preregistros = await preregistrosService.getPreregistrosMayorista(user.id);
          
          // Cargar aumentos del día desde ventas_mayoristas
          const aumentosDelDia = await ventasMayoristasService.getAumentosDelPeriodo(
            user.id, 
            fechaActual, 
            fechaActual
          );
          
          // Crear un mapa de aumentos por producto
          const aumentosPorProducto = new Map<string, number>();
          aumentosDelDia.forEach(aumento => {
            const actual = aumentosPorProducto.get(aumento.id_producto) || 0;
            aumentosPorProducto.set(aumento.id_producto, actual + aumento.cantidad_aumento);
          });
          
          // Obtener último arqueo cerrado para calcular saldos arrastrados
          // TODO: Implementar cuando tengamos el servicio de arqueos
          // Por ahora, solo usamos preregistros + aumentos del día
          
          const items: PreregistroVentaItem[] = preregistros.map(p => {
            const aumento = aumentosPorProducto.get(p.id_producto) || 0;
            const saldoDisponible = p.cantidad + aumento; // TODO: Sumar saldos arrastrados del último arqueo

            let cantidadRestante: number;
            if (p.cantidad_restante != null && !Number.isNaN(Number(p.cantidad_restante))) {
              cantidadRestante = Math.max(0, Math.min(Number(p.cantidad_restante), saldoDisponible));
            } else {
              cantidadRestante = saldoDisponible;
            }
            
            return {
              id: p.id,
              nombre: p.producto?.nombre || 'N/A',
              codigo: p.producto?.codigo,
              cantidad: p.cantidad,
              aumento: aumento, // Aumentos del día desde ventas_mayoristas
              cantidadRestante: cantidadRestante, // Usar saldo guardado o saldo disponible
              precio_unitario: p.producto?.precio_por_mayor ?? 0,
              subtotal: 0,
              id_producto: p.id_producto,
              id_categoria: p.producto?.id_categoria,
            };
          });
          
          // Calcular subtotales iniciales (inicialmente 0 porque cantidadRestante = saldo disponible)
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
  }, [user, location.pathname, fechaVistaMinorista, queryClient, refreshUserProfile]);

  const handleIniciarJornadaMinorista = useCallback(async () => {
    if (!user || user.rol !== 'minorista') return;
    if (fechaVistaMinorista !== getLocalDateISO()) {
      toast.error('Solo podés crear la nueva venta en la fecha de hoy. Elegí hoy en el calendario.');
      return;
    }
    if (preregistroItems.length === 0) {
      toast.error('No hay preregistros');
      return;
    }
    const confirmar = window.confirm(
      'Vas a iniciar una nueva venta del día. Esto restablecerá los saldos al máximo según tu preregistro y pedidos entregados. ¿Deseas continuar?'
    );
    if (!confirmar) return;
    setIniciandoJornadaMinorista(true);
    try {
      for (const item of preregistroItems) {
        const full = item.cantidad + item.aumento;
        await preregistrosService.updateCantidadRestanteMinorista(item.id, full);
      }
      setPreregistroItems((prev) =>
        prev.map((i) => ({
          ...i,
          cantidadRestante: i.cantidad + i.aumento,
          subtotal: 0,
        }))
      );
      for (const item of preregistroItems) {
        localStorage.removeItem(`preregistro_saldo_${user.id}_${item.id}`);
      }
      await minoristaJornadaDiariaService.marcarIniciada(user.id, fechaHoy);
      localStorage.removeItem(`ventasJcell_minorista_jornada_${user.id}_${fechaHoy}`);
      await queryClient.invalidateQueries({ queryKey: [MINORISTA_JORNADA_DIARIA_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: ['pedidos-gate'] });
      await queryClient.invalidateQueries({ queryKey: ['minorista-ultima-finalizada-preregistro'] });
      await queryClient.invalidateQueries({ queryKey: ['minorista-hay-venta-nueva-venta-hoy'] });
      toast.success(
        'Nueva jornada iniciada: saldos al máximo según tu preregistro y los pedidos del día. Ya podés vender.'
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar la jornada');
    } finally {
      setIniciandoJornadaMinorista(false);
    }
  }, [user, preregistroItems, queryClient, fechaHoy, fechaVistaMinorista]);

  const handleUpdateCantidadRestante = async (itemId: string, newValue: number) => {
    if (!user) return;
    if (user.rol === 'minorista' && fechaVistaMinorista !== getLocalDateISO()) {
      toast.error('Solo podés editar saldos en la fecha de hoy.');
      return;
    }
    if (user.rol === 'minorista' && minoristaBloqueadoPorJornadaPendiente) {
      toast.error('Iniciá la nueva jornada antes de editar saldos.');
      return;
    }
    if (user.rol === 'minorista' && !minoristaPuedeEditarPreregistro) {
      toast.error(
        'No puedes editar los saldos. Un administrador debe habilitar la edición en Gestión de usuarios.'
      );
      return;
    }
    const item = preregistroItems.find((i) => i.id === itemId);
    if (!item) return;

    const cantidadRestante = Math.max(0, Math.min(newValue, item.cantidad + item.aumento));
    const subtotal = (item.cantidad + item.aumento - cantidadRestante) * item.precio_unitario;
    const prevRestante = item.cantidadRestante;
    const prevSubtotal = item.subtotal;

    setPreregistroItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, cantidadRestante, subtotal } : i
      )
    );

    try {
      if (user.rol === 'minorista') {
        await preregistrosService.updateCantidadRestanteMinorista(itemId, cantidadRestante);
      } else if (user.rol === 'mayorista') {
        await preregistrosService.updateCantidadRestanteMayorista(itemId, cantidadRestante);
      } else {
        return;
      }
      localStorage.removeItem(`preregistro_saldo_${user.id}_${itemId}`);
    } catch (err: unknown) {
      setPreregistroItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, cantidadRestante: prevRestante, subtotal: prevSubtotal }
            : i
        )
      );
      const message = err instanceof Error ? err.message : 'No se pudo guardar el saldo';
      toast.error(message);
    }
  };

  // NOTA: La función handleUpdateAumento fue eliminada.
  // Los aumentos ahora se registran automáticamente cuando se entregan pedidos
  // y se cargan desde las tablas ventas_minoristas/ventas_mayoristas.

  // Calcular total de preregistros (tabla; borrador hasta finalizar)
  const preregistroTotal = useMemo(() => {
    return preregistroItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [preregistroItems]);

  /** Líneas de venta reales en BD para la fecha del resumen (minorista: calendario; mayorista: hoy). */
  const lineasResumenVentasRegistradas = useMemo(() => {
    type Acc = {
      id_producto: string;
      nombre: string;
      id_categoria?: string;
      cantidadVendida: number;
      subtotal: number;
    };
    const map = new Map<string, Acc>();
    for (const v of ventasRegistradasResumenRaw) {
      const nombre = v.producto?.nombre || 'N/A';
      const idCat = v.producto?.id_categoria;
      const precio = 'precio_por_mayor' in v ? v.precio_por_mayor : v.precio_unitario;
      const lineSub = v.cantidad_vendida * precio;
      const prev = map.get(v.id_producto);
      if (prev) {
        prev.cantidadVendida += v.cantidad_vendida;
        prev.subtotal += lineSub;
      } else {
        map.set(v.id_producto, {
          id_producto: v.id_producto,
          nombre,
          id_categoria: idCat,
          cantidadVendida: v.cantidad_vendida,
          subtotal: lineSub,
        });
      }
    }
    return [...map.values()]
      .map((row) => ({
        key: row.id_producto,
        nombre: row.nombre,
        id_categoria: row.id_categoria,
        cantidadVendida: row.cantidadVendida,
        precioUnitario: row.cantidadVendida > 0 ? row.subtotal / row.cantidadVendida : 0,
        subtotal: row.subtotal,
      }))
      .reverse();
  }, [ventasRegistradasResumenRaw]);

  const resumenTotalVentasRegistradasDia = useMemo(
    () => lineasResumenVentasRegistradas.reduce((s, x) => s + x.subtotal, 0),
    [lineasResumenVentasRegistradas]
  );

  /** Filas con venta en curso no guardada todavía (evita duplicar lo ya finalizado en BD). */
  const lineasResumenBorradorPreregistro = useMemo(() => {
    if (user?.rol !== 'minorista' && user?.rol !== 'mayorista') return [];
    // Consulta de otro día (minorista): el preregistro se arma solo para lectura y repetiría lo ya guardado en BD.
    if (user?.rol === 'minorista' && !minoristaConsultaEsHoy) return [];
    const registradasPorProducto = new Map<string, number>();
    lineasResumenVentasRegistradas.forEach((row) => {
      registradasPorProducto.set(row.key, row.cantidadVendida);
    });

    return preregistroItems
      .map((i) => {
        const cantidadEnTabla = Math.max(0, i.cantidad + i.aumento - i.cantidadRestante);
        if (cantidadEnTabla <= 0) return null;
        const yaRegistrada = registradasPorProducto.get(i.id_producto) || 0;
        const cantidadPendiente = Math.max(0, cantidadEnTabla - yaRegistrada);
        if (cantidadPendiente <= 0) return null;
        return {
          key: `borrador-${i.id}`,
          nombre: i.nombre,
          id_categoria: i.id_categoria,
          cantidadVendida: cantidadPendiente,
          precioUnitario: i.precio_unitario,
          subtotal: cantidadPendiente * i.precio_unitario,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [preregistroItems, user?.rol, minoristaConsultaEsHoy, lineasResumenVentasRegistradas]);

  const totalSubtotalBorradorPreregistro = useMemo(
    () => lineasResumenBorradorPreregistro.reduce((s, x) => s + x.subtotal, 0),
    [lineasResumenBorradorPreregistro]
  );

  const hayLineasEnResumenMinorMayor =
    lineasResumenVentasRegistradas.length > 0 || lineasResumenBorradorPreregistro.length > 0;

  /** Tarjeta / Recarga / Chip: ventas ya guardadas + borrador del preregistro. */
  const resumenTarjetaRecargaChipCombinado = useMemo(() => {
    const acc = { tarjeta: 0, recarga: 0, chip: 0, otros: 0 };
    const add = (id_categoria: string | undefined, nombre: string, subtotal: number) => {
      const catNombre = id_categoria
        ? categories.find((x) => x.id === id_categoria)?.nombre
        : undefined;
      acc[bucketPreregistroItem(catNombre, nombre)] += subtotal;
    };
    lineasResumenVentasRegistradas.forEach((i) => add(i.id_categoria, i.nombre, i.subtotal));
    lineasResumenBorradorPreregistro.forEach((i) => add(i.id_categoria, i.nombre, i.subtotal));
    const rows: { key: string; nombre: string; total: number }[] = [
      { key: 'tarjeta', nombre: 'Tarjeta', total: acc.tarjeta },
      { key: 'recarga', nombre: 'Recarga', total: acc.recarga },
      { key: 'chip', nombre: 'Chip', total: acc.chip },
    ];
    if (acc.otros > 0) {
      rows.push({ key: 'otros', nombre: 'Otros', total: acc.otros });
    }
    return rows;
  }, [lineasResumenVentasRegistradas, lineasResumenBorradorPreregistro, categories]);

  const totalResumenVentasYBorrador =
    resumenTotalVentasRegistradasDia + totalSubtotalBorradorPreregistro;

  /** Alias del resumen preregistro (antes `resumenPorCategoria`). Evita ReferenceError si queda código o caché de HMR con el nombre antiguo. */
  const resumenPorCategoria = resumenTarjetaRecargaChipCombinado;

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
      if (user.rol === 'minorista' && fechaVistaMinorista !== getLocalDateISO()) {
        toast.error('Solo podés finalizar la venta en la fecha de hoy. Volvé al día actual en el calendario.');
        return;
      }
      if (user.rol === 'minorista' && minoristaBloqueadoPorJornadaPendiente) {
        toast.error(
          'Iniciá la nueva jornada (botón en Ventas del día) o cargá saldos con QR antes de finalizar.'
        );
        return;
      }
      if (user.rol === 'minorista' && !minoristaPuedeEditarPreregistro) {
        toast.error(
          'Ya finalizaste la venta. Un administrador debe habilitar de nuevo la edición en Gestión de usuarios.'
        );
        return;
      }
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

        // Guardar registros en ventas_minoristas o ventas_mayoristas
        const fechaActual = getLocalDateISO();
        const horaActual = getLocalTimeISO();
        
        if (user.rol === 'minorista') {
          // Crear registros en ventas_minoristas para cada producto vendido
          for (const item of itemsConVenta) {
            const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
            if (cantidadVendida > 0) {
              await ventasMinoristasService.create({
                id_minorista: user.id,
                id_producto: item.id_producto,
                cantidad_vendida: cantidadVendida,
                cantidad_aumento: 0, // Los aumentos ya están registrados cuando se entregan pedidos
                precio_unitario: item.precio_unitario,
                fecha: fechaActual,
                hora: horaActual,
                observaciones: `Venta registrada desde preregistros - Venta #${newSale.id}`,
              });
            }
          }
          setMinoristaHayVentaNuevaVentaHoy(true);
          void queryClient.invalidateQueries({ queryKey: ['minorista-ultima-finalizada-preregistro'] });
          void queryClient.invalidateQueries({ queryKey: ['pedidos-gate'] });
          void queryClient.invalidateQueries({ queryKey: ['preregistro-resumen-ventas-dia'] });
          void queryClient.invalidateQueries({ queryKey: ['minorista-hay-venta-nueva-venta-hoy'] });
          void queryClient.invalidateQueries({ queryKey: ['minorista-transfer-qr-consulta-dia'] });
        } else if (user.rol === 'mayorista') {
          // Crear registros en ventas_mayoristas para cada producto vendido
          try {
            for (const item of itemsConVenta) {
              const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
              if (cantidadVendida > 0) {
                console.log('Creando registro en ventas_mayoristas:', {
                  id_mayorista: user.id,
                  id_producto: item.id_producto,
                  cantidad_vendida: cantidadVendida,
                  precio_por_mayor: item.precio_unitario,
                });
                
                const ventaMayorista = await ventasMayoristasService.create({
                  id_mayorista: user.id,
                  id_producto: item.id_producto,
                  cantidad_vendida: cantidadVendida,
                  cantidad_aumento: 0, // Los aumentos ya están registrados cuando se entregan pedidos
                  precio_por_mayor: item.precio_unitario,
                  fecha: fechaActual,
                  hora: horaActual,
                  observaciones: `Venta registrada desde preregistros - Venta #${newSale.id}`,
                });
                
                console.log('Registro creado exitosamente en ventas_mayoristas:', ventaMayorista);
              }
            }
          } catch (error: any) {
            console.error('Error al crear registros en ventas_mayoristas:', error);
            toast.error(`Error al registrar ventas mayoristas: ${error.message || 'Error desconocido'}`);
            // No retornar aquí, permitir que continúe el flujo
          }
          void queryClient.invalidateQueries({ queryKey: ['preregistro-resumen-ventas-dia'] });
          void queryClient.invalidateQueries({ queryKey: ['mayorista-hay-venta-nueva-venta-hoy'] });
        }

        // Guardar datos de la venta
        setSaleTotal(preregistroTotal);
        setSaleItems(itemsConVenta.map(item => ({
          ...allProducts.find(p => p.id === item.id_producto)!,
          cantidad: item.cantidad + item.aumento - item.cantidadRestante,
          subtotal: item.subtotal,
        })));
        setSaleItemCount(itemsConVenta.length);
        setCreatedSale(newSale);

        // Si es mayorista: crear pago pendiente y preparar saldos para arrastrar
        if (user.rol === 'mayorista') {
          // Crear registro de pago pendiente
          await pagosMayoristasService.create(
            newSale.id,
            user.id,
            preregistroTotal,
            selectedPayment
          );

          // Preparar saldos restantes para arrastrar
          const saldosRestantes = preregistroItems
            .filter(item => item.cantidadRestante > 0)
            .map(item => ({
              id_producto: item.id_producto,
              cantidad_restante: item.cantidadRestante,
              nombre: item.nombre,
            }));
          
          setSaldosParaArrastrar(saldosRestantes);
        }

        let transferenciaMinorista: TransferenciaSaldo | null = null;
        if (user.rol === 'minorista') {
          const saldosRestantes = preregistroItems
            .filter((item) => item.cantidadRestante > 0)
            .map((item) => ({
              id_producto: item.id_producto,
              cantidad_restante: item.cantidadRestante,
            }));

          if (saldosRestantes.length > 0) {
            try {
              transferenciaMinorista = await transferenciasService.create(
                newSale.id,
                user.id,
                saldosRestantes
              );
              setTransferenciaCreada(transferenciaMinorista);
              setQrCode(transferenciaMinorista.codigo_qr);
              try {
                localStorage.setItem(
                  `ventasJcell_minorista_qr_${user.id}`,
                  JSON.stringify({
                    codigo_qr: transferenciaMinorista.codigo_qr,
                    fecha: fechaActual,
                  })
                );
              } catch {
                /* ignore */
              }
            } catch (error: unknown) {
              console.error('Error al crear transferencia:', error);
            }
          }
        }

        for (const item of itemsConVenta) {
          const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
          if (cantidadVendida <= 0) continue;
          try {
            if (user.rol === 'minorista') {
              await preregistrosService.updateCantidadRestanteMinorista(item.id, item.cantidadRestante);
            } else {
              await preregistrosService.updateCantidadRestanteMayorista(item.id, item.cantidadRestante);
            }
          } catch (persistErr: unknown) {
            console.error('Error guardando cantidad_restante tras venta:', persistErr);
            toast.error(
              'La venta se registró, pero el saldo no se guardó en el servidor. Ejecuta la migración RPC o revisa permisos.'
            );
          }
          localStorage.removeItem(`preregistro_saldo_${user.id}_${item.id}`);
        }

        if (user.rol === 'minorista') {
          try {
            await usersService.minoristaSetEdicionPreregistroPermitida(false);
            await refreshUserProfile();
          } catch (e: unknown) {
            console.error(e);
            toast.error(
              e instanceof Error
                ? e.message
                : 'No se pudo bloquear la edición del preregistro. Ejecuta la migración SQL o revisa permisos de la RPC.'
            );
          }
        }

        setPreregistroItems((prev) =>
          prev.map((item) => {
            const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
            if (cantidadVendida > 0) {
              return { ...item, subtotal: 0 };
            }
            return item;
          })
        );

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
        
        // Mostrar diálogo según el rol
        if (user.rol === 'mayorista') {
          setShowArrastrarSaldosDialog(true);
        } else if (user.rol === 'minorista' && transferenciaMinorista) {
          setShowSuccessAfterQrClose(true);
          setShowQRDialog(true);
        } else {
          setShowSuccessDialog(true);
        }
        
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

  const abrirAdvertenciaFinalizarVentaMinorista = (cerrarSheetAlConfirmar: boolean) => {
    setPendingFinalizarCierraSheet(cerrarSheetAlConfirmar);
    setShowMinoristaFinalizarAdvertencia(true);
  };

  const confirmarAdvertenciaFinalizarVentaMinorista = () => {
    const cerrarSheet = pendingFinalizarCierraSheet;
    setShowMinoristaFinalizarAdvertencia(false);
    setPendingFinalizarCierraSheet(false);
    void handleCompleteSale();
    if (cerrarSheet) setShowCartSheet(false);
  };

  const handleNewSale = () => {
    clearCart();
    setShowSuccessDialog(false);
    setShowArrastrarSaldosDialog(false);
    setShowQRDialog(false);
    setShowSuccessAfterQrClose(false);
    setShowMinoristaFinalizarAdvertencia(false);
    setPendingFinalizarCierraSheet(false);
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
    setSaldosParaArrastrar([]);
    setQrCode('');
    setTransferenciaCreada(null);
    toast.success('¡Listo para una nueva venta!');
  };

  // Función para arrastrar saldos restantes (mayoristas)
  const handleArrastrarSaldos = async () => {
    if (!createdSale || !user || user.rol !== 'mayorista') return;

    try {
      const saldosData = saldosParaArrastrar.map(saldo => ({
        id_producto: saldo.id_producto,
        cantidad_restante: saldo.cantidad_restante,
      }));

      await saldosRestantesMayoristasService.create(
        createdSale.id,
        user.id,
        saldosData
      );

      toast.success('Saldos restantes arrastrados exitosamente');
      setShowArrastrarSaldosDialog(false);
      setShowSuccessDialog(true);
    } catch (error: any) {
      toast.error(error.message || 'Error al arrastrar saldos restantes');
    }
  };

  // Función para omitir arrastrar saldos (mayoristas)
  const handleOmitirArrastrarSaldos = () => {
    setShowArrastrarSaldosDialog(false);
    setShowSuccessDialog(true);
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

  useEffect(() => {
    if (user?.rol === 'minorista' || user?.rol === 'mayorista') {
      setSelectedPayment('efectivo');
    }
  }, [user?.rol]);

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
  const showMobileResumenButton =
    shouldShowSheet &&
    !(
      user?.rol === 'minorista' &&
      !minoristaConsultaEsHoy &&
      !cargandoVentasResumenDia &&
      lineasResumenVentasRegistradas.length === 0
    );
  const esMinoristaOMayorista = user?.rol === 'minorista' || user?.rol === 'mayorista';

  return (
    <DashboardLayout title="Nueva Venta">
      {/* Carrito flotante solo vendedor/admin: esquina inferior izquierda para no tapar tablas a la derecha */}
      {showMobileResumenButton && !esMinoristaOMayorista && (
        <VendedorMobileCartFab itemCount={itemCount} onOpen={() => setShowCartSheet(true)} />
      )}

      <div className={cn("grid gap-4 sm:gap-6", isDesktopLarge && "lg:grid-cols-3")}>
        {/* Products Section */}
        <div className={cn("space-y-3 sm:space-y-4", isDesktopLarge && "lg:col-span-2")}>
          {/* Mostrar tabla de preregistros si es minorista o mayorista */}
          {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
            <Card className="animate-fade-in">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-xl">
                    {user.rol === 'minorista'
                      ? minoristaConsultaEsHoy
                        ? 'Ventas del día (Minorista)'
                        : 'Consulta (Minorista)'
                      : 'Preregistros Mayorista'}
                  </CardTitle>
                  {(user.rol === 'minorista' ||
                    (user.rol === 'mayorista' && showMobileResumenButton)) && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {user.rol === 'minorista' && (
                        <Popover open={calendarioMinoristaOpen} onOpenChange={setCalendarioMinoristaOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 justify-start min-w-[200px] sm:min-w-[220px]"
                            >
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{formatDateOnlyLocal(fechaVistaMinorista)}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              month={calendarMonthMinorista}
                              onMonthChange={setCalendarMonthMinorista}
                              selected={parseDateOnlyLocal(fechaVistaMinorista)}
                              onSelect={handleCalendarioMinoristaSelect}
                              disabled={(date) => fechaLocalToISO(date) > getLocalDateISO()}
                              className="rounded-md border"
                            />
                            <div className="border-t p-2 flex justify-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={fechaVistaMinorista === getLocalDateISO()}
                                onClick={() => setFechaVistaMinorista(getLocalDateISO())}
                              >
                                Ir a hoy
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      {showMobileResumenButton && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="relative gap-2"
                          onClick={() => setShowCartSheet(true)}
                        >
                          <ClipboardList className="h-4 w-4 shrink-0" />
                          <span className="font-medium">Resumen</span>
                          {itemCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center rounded-full"
                            >
                              {itemCount}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {user.rol === 'minorista' && (
                  <CardDescription className="text-xs">
                    En fechas pasadas solo verás detalle si hubo ventas guardadas ese día (incluye el cierre automático
                    al día siguiente si no finalizaste). Crear nueva venta, escanear QR y editar saldos solo están
                    habilitados en la fecha de hoy.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingPreregistros ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando preregistros...
                  </div>
                ) : preregistroItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay preregistros asignados
                  </div>
                ) : user?.rol === 'minorista' && minoristaBloqueadoPorJornadaPendienteVista ? (
                  <div className="space-y-6 py-2">
                    <Alert>
                      <AlertDescription>
                        <span className="font-medium">Jornada anterior cerrada.</span> Ya finalizaste una venta en un día
                        anterior. Para trabajar hoy, elegí una opción:
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                      <Button
                        type="button"
                        className="h-12 gap-2 text-base w-full sm:w-auto sm:min-w-[220px]"
                        onClick={() => void handleIniciarJornadaMinorista()}
                        disabled={
                          iniciandoJornadaMinorista ||
                          preregistroItems.length === 0 ||
                          !minoristaConsultaEsHoy
                        }
                      >
                        {iniciandoJornadaMinorista ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Preparando…
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5" />
                            Crear nueva venta
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 gap-2 text-base w-full sm:w-auto sm:min-w-[220px]"
                        disabled={!minoristaConsultaEsHoy}
                        onClick={() => {
                          if (!minoristaConsultaEsHoy) {
                            toast.error('El escaneo por QR solo está disponible en la fecha de hoy.');
                            return;
                          }
                          navigate('/escanear-qr');
                        }}
                      >
                        <QrCode className="h-5 w-5" />
                        Escaneo por QR
                      </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground max-w-xl mx-auto px-1">
                      <strong>Crear nueva venta</strong> deja los saldos al máximo según tu preregistro y los pedidos
                      entregados hoy. <strong>Escaneo por QR</strong> recibe saldos de otro minorista. Cuando veas la
                      panel <strong>Ventas del día (Minorista)</strong> podrás abrir <strong>Pedidos</strong> desde ahí.
                      Usá el calendario arriba para consultar otros días (solo lectura).
                    </p>
                  </div>
                ) : user?.rol === 'minorista' && !minoristaConsultaEsHoy ? (
                  cargandoVentasResumenDia ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Loader className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-3 text-sm">Consultando ventas de esta fecha…</p>
                    </div>
                  ) : lineasResumenVentasRegistradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                      <ClipboardList className="h-14 w-14 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground max-w-md">
                        No hubo ventas registradas el <strong>{formatDateOnlyLocal(fechaVistaMinorista)}</strong>.
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground max-w-md">
                        Solo se muestra el detalle cuando hay ventas guardadas en el sistema para esa fecha. Elegí otra
                        fecha en el calendario o <strong>Ir a hoy</strong> para crear venta o escanear QR.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          Ventas del <strong>{formatDateOnlyLocal(fechaVistaMinorista)}</strong> (solo consulta, según
                          registros guardados).
                        </AlertDescription>
                      </Alert>
                      <div className="rounded-lg border -mx-4 sm:-mx-6 lg:mx-0 overflow-hidden">
                        <div className="p-2 sm:p-4 lg:p-6">
                          <div
                            className="overflow-x-auto overscroll-x-contain"
                            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
                          >
                            <table className="w-full caption-bottom text-xs sm:text-sm">
                              <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors">
                                  <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-left align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                    Producto
                                  </th>
                                  <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                    <span className="hidden sm:inline">Cant. vendida</span>
                                    <span className="sm:hidden">Cant.</span>
                                  </th>
                                  <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                    P. unit.
                                  </th>
                                  <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="[&_tr:last-child]:border-0">
                                {lineasResumenVentasRegistradas.map((row) => (
                                  <tr key={row.key} className="border-b transition-colors">
                                    <td className="p-1.5 sm:p-2 md:p-4 align-middle">
                                      <p className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                        {row.nombre}
                                      </p>
                                    </td>
                                    <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right tabular-nums text-xs sm:text-sm">
                                      {row.cantidadVendida}
                                    </td>
                                    <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right tabular-nums text-xs sm:text-sm">
                                      Bs. {row.precioUnitario.toFixed(2)}
                                    </td>
                                    <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right font-semibold tabular-nums text-xs sm:text-sm">
                                      Bs. {row.subtotal.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t">
                        <p className="text-lg font-semibold">Total:</p>
                        <p className="text-2xl font-bold text-primary">
                          Bs. {resumenTotalVentasRegistradasDia.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {((user?.rol === 'mayorista') || (user?.rol === 'minorista' && minoristaConsultaEsHoy)) && (
                      <div className="flex justify-end -mx-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => navigate('/pedidos')}
                        >
                          <Package className="h-4 w-4" />
                          Pedidos
                        </Button>
                      </div>
                    )}
                    <div className="rounded-lg border -mx-4 sm:-mx-6 lg:mx-0 overflow-hidden">
                      <div className="p-2 sm:p-4 lg:p-6">
                        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
                          <table className="w-full caption-bottom text-xs sm:text-sm">
                            <thead className="[&_tr]:border-b">
                              <tr className="border-b transition-colors">
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-left align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden sm:inline">Nombre</span>
                                  <span className="sm:hidden">Nom.</span>
                                </th>
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden md:inline">Cantidad Inicial</span>
                                  <span className="hidden sm:inline md:hidden">Cant. Inicial</span>
                                  <span className="sm:hidden">Cant.</span>
                                </th>
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden sm:inline">Aumento</span>
                                  <span className="sm:hidden">Aum.</span>
                                </th>
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden md:inline">Saldo Restante</span>
                                  <span className="hidden sm:inline md:hidden">Saldo Rest.</span>
                                  <span className="sm:hidden">Saldo</span>
                                </th>
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden sm:inline">Subtotal</span>
                                  <span className="sm:hidden">Sub.</span>
                                </th>
                                <th className="h-10 sm:h-12 px-1.5 sm:px-2 md:px-4 text-right align-middle font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                                  <span className="hidden sm:inline">Acciones</span>
                                  <span className="sm:hidden">Acc.</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                              {preregistroItems.map((item) => {
                                const minoristaSaldoBloqueado =
                                  user?.rol === 'minorista' &&
                                  (!minoristaPuedeEditarPreregistro ||
                                    (minoristaBloqueadoPorJornadaPendiente && minoristaConsultaEsHoy) ||
                                    !minoristaConsultaEsHoy);
                                return (
                                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle">
                                    <p className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{item.nombre}</p>
                                  </td>
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right text-xs sm:text-sm">
                                    {item.cantidad}
                                  </td>
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right text-xs sm:text-sm">
                                    {item.aumento}
                                  </td>
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right">
                                    {editingCantidadRestante === item.id && !minoristaSaldoBloqueado ? (
                                      <div className="flex items-center gap-1 sm:gap-2 justify-end">
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
                                          className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                          onClick={() => {
                                            const newValue = parseInt(editCantidadRestanteValue);
                                            if (!isNaN(newValue)) {
                                              handleUpdateCantidadRestante(item.id, newValue);
                                              setEditingCantidadRestante(null);
                                              setEditCantidadRestanteValue('');
                                            }
                                          }}
                                        >
                                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                          onClick={() => {
                                            setEditingCantidadRestante(null);
                                            setEditCantidadRestanteValue('');
                                          }}
                                        >
                                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                      </div>
                                    ) : minoristaSaldoBloqueado ? (
                                      <span className="inline-flex h-7 sm:h-8 items-center justify-end px-1.5 sm:px-2 text-xs sm:text-sm tabular-nums w-full">
                                        {item.cantidadRestante}
                                      </span>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 sm:h-8 px-1.5 sm:px-2 text-xs sm:text-sm"
                                        onClick={() => {
                                          setEditingCantidadRestante(item.id);
                                          setEditCantidadRestanteValue(item.cantidadRestante.toString());
                                        }}
                                      >
                                        {item.cantidadRestante}
                                      </Button>
                                    )}
                                  </td>
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right font-semibold text-xs sm:text-sm">
                                    <span className="hidden sm:inline">Bs. </span>
                                    <span className="sm:hidden">Bs</span>
                                    {item.subtotal.toFixed(2)}
                                  </td>
                                  <td className="p-1.5 sm:p-2 md:p-4 align-middle text-right">
                                    {minoristaSaldoBloqueado ? (
                                      <span
                                        className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-muted-foreground"
                                        title="Edición bloqueada: venta del día finalizada o consulta de otra fecha. Pedí a un administrador que active Editar Nueva venta si hace falta corregir."
                                      >
                                        <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden />
                                        <span className="sr-only">Edición de saldo bloqueada</span>
                                      </span>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                        onClick={() => {
                                          setEditingCantidadRestante(item.id);
                                          setEditCantidadRestanteValue(item.cantidadRestante.toString());
                                        }}
                                        disabled={editingCantidadRestante === item.id}
                                      >
                                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
                {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                  <ClipboardList className="h-5 w-5" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? 'Resumen de Venta' : 'Carrito'}
              </CardTitle>
              {(user?.rol === 'minorista' || user?.rol === 'mayorista') && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  {formatFechaISOLocalLegible(
                    user?.rol === 'minorista' ? fechaVistaMinorista : getLocalDateISO()
                  )}
                </p>
              )}
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
                    {cargandoVentasResumenDia ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <Loader className="h-10 w-10 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-sm text-muted-foreground">Cargando ventas del día…</p>
                      </div>
                    ) : hayLineasEnResumenMinorMayor ? (
                      <>
                        <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                          <div>
                            {lineasResumenVentasRegistradas.length > 0 && (
                              <>
                                <div className="border-b border-border bg-muted/40 px-2 py-1 sm:px-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Ventas guardadas (finalizadas)
                                  </p>
                                </div>
                                {lineasResumenVentasRegistradas.map((item) => (
                                  <div
                                    key={item.key}
                                    className="border-b border-border flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2"
                                  >
                                    <span className="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                                      {item.nombre}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                      {item.cantidadVendida}×Bs.{item.precioUnitario.toFixed(2)}
                                      <span className="mx-1 opacity-50">·</span>
                                      <span className="font-semibold text-foreground">
                                        Bs.{item.subtotal.toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                            {lineasResumenBorradorPreregistro.length > 0 && (
                              <>
                                <div
                                  className={cn(
                                    'border-b border-border bg-muted/40 px-2 py-1 sm:px-3',
                                    lineasResumenVentasRegistradas.length > 0 && 'border-t border-border'
                                  )}
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                                    Venta en curso (pendiente de finalizar)
                                  </p>
                                </div>
                                {lineasResumenBorradorPreregistro.map((item) => (
                                  <div
                                    key={item.key}
                                    className="border-b border-border flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2"
                                  >
                                    <span className="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                                      {item.nombre}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                      {item.cantidadVendida}×Bs.{item.precioUnitario.toFixed(2)}
                                      <span className="mx-1 opacity-50">·</span>
                                      <span className="font-semibold text-foreground">
                                        Bs.{item.subtotal.toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Tarjeta / Recarga / Chip */}
                        <div className="border-t p-3 sm:p-4 space-y-2">
                          <p className="text-sm font-semibold mb-3">Tarjeta, Recarga y Chip:</p>
                          {resumenTarjetaRecargaChipCombinado.map((row) => (
                            <div key={row.key} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{row.nombre}:</span>
                              <span className="font-medium">Bs. {row.total.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2 mt-2 border-t">
                            <p className="text-sm font-semibold">Total General:</p>
                            <p className="text-xl font-bold text-primary">
                              Bs. {totalResumenVentasYBorrador.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {bloqueQRResumenConsultaHistorica}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No hay ventas ni saldos vendidos para esta fecha</p>
                        {(user?.rol === 'minorista' || user?.rol === 'mayorista') && (
                          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                            Las ventas finalizadas aparecen al cerrar el día en Nueva venta. Si editaste saldos en la
                            tabla, verás aquí la venta en curso cuando el subtotal sea mayor a cero.
                          </p>
                        )}
                      </div>
                    )}

                    {!ocultarSelectorMetodoPago && (
                    <>
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
                              id="cuota-inicial-desktop"
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
                              htmlFor="cuota-inicial-desktop"
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
                                max={preregistroTotal}
                                value={cuotaInicialInput !== '' ? cuotaInicialInput : (cuotaInicial > 0 ? cuotaInicial.toFixed(2) : '')}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  setCuotaInicialInput(inputValue);
                                  
                                  if (inputValue === '' || inputValue === '.') {
                                    setCuotaInicial(0);
                                    return;
                                  }
                                  
                                  const numValue = parseFloat(inputValue);
                                  if (!isNaN(numValue) && numValue >= 0 && numValue <= preregistroTotal) {
                                    setCuotaInicial(numValue);
                                  }
                                }}
                                onBlur={(e) => {
                                  const numValue = parseFloat(e.target.value);
                                  if (isNaN(numValue) || numValue < 0) {
                                    setCuotaInicial(0);
                                    setCuotaInicialInput('');
                                  } else if (numValue > preregistroTotal) {
                                    setCuotaInicial(preregistroTotal);
                                    setCuotaInicialInput(preregistroTotal.toFixed(2));
                                  } else {
                                    setCuotaInicialInput(e.target.value);
                                  }
                                }}
                                placeholder="0.00"
                                className="h-9"
                              />
                              <p className="text-xs text-muted-foreground">
                                El interés y las cuotas se calcularán sobre: Bs. {(preregistroTotal - cuotaInicial).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </>
                    )}

                    {/* Actions */}
                    <div className="p-3 sm:p-4 space-y-2 border-t">
                      {user?.rol === 'minorista' && minoristaEdicionBloqueada && minoristaConsultaEsHoy ? (
                        <>
                          {minoristaMostrarQREnLugarDeFinalizar ? (
                            <Button
                              type="button"
                              className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base"
                              onClick={() => {
                                setShowSuccessAfterQrClose(false);
                                setShowQRDialog(true);
                              }}
                            >
                              <QrCode className="h-5 w-5" />
                              Mostrar QR
                            </Button>
                          ) : (
                            <div className="space-y-2 py-2 px-1 text-center">
                              <p className="text-sm text-muted-foreground">
                                Venta finalizada. Para editar de nuevo, un administrador debe activar{' '}
                                <strong>Editar Nueva venta</strong> (Gestión de usuarios o Control de ventas).
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Mostrar QR solo aparece si había saldo pendiente al finalizar y existe una transferencia
                                pendiente; el código también se recupera al abrir el resumen.
                              </p>
                            </div>
                          )}
                        </>
                      ) : user?.rol === 'minorista' && minoristaBloqueadoPorJornadaPendienteVista ? (
                        <p className="text-sm text-center text-muted-foreground px-2 py-2">
                          Iniciá la jornada con <strong>Crear nueva venta</strong> o <strong>Escaneo por QR</strong> en el
                          panel Ventas del día (Minorista).
                        </p>
                      ) : user?.rol === 'minorista' && !minoristaConsultaEsHoy ? (
                        <p className="text-sm text-center text-muted-foreground px-2 py-2">
                          Estás viendo el <strong>{formatDateOnlyLocal(fechaVistaMinorista)}</strong>. Volvé a{' '}
                          <strong>hoy</strong> en el calendario del panel superior para finalizar la venta.
                        </p>
                      ) : (
                        <>
                          <Button
                            className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base"
                            onClick={() => {
                              if (user?.rol === 'minorista' && minoristaPuedeEditarPreregistro) {
                                abrirAdvertenciaFinalizarVentaMinorista(false);
                              } else {
                                void handleCompleteSale();
                              }
                            }}
                            disabled={
                              preregistroItems.filter(
                                (item) =>
                                  item.cantidad + item.aumento - item.cantidadRestante > 0
                              ).length === 0 || createSaleMutation.isPending
                            }
                          >
                            {createSaleMutation.isPending ? (
                              <>
                                <Loader className="h-5 w-5 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5" />
                                {user?.rol === 'minorista' ? 'Finalizar venta' : 'Completar Venta'}
                              </>
                            )}
                          </Button>
                          <Button variant="outline" className="w-full" onClick={clearCart}>
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                    <>
                      <ClipboardList className="h-16 w-16 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">No hay productos en tu resumen</p>
                      <p className="text-sm text-muted-foreground">Selecciona productos de tu preregistro para agregarlos</p>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">El carrito está vacío</p>
                      <p className="text-sm text-muted-foreground">Haz clic en un producto para agregarlo</p>
                    </>
                  )}
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

                  {!ocultarSelectorMetodoPago && (
                  <>
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
                  </>
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
                {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                  <ClipboardList className="h-5 w-5" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                <span>{(user?.rol === 'minorista' || user?.rol === 'mayorista') ? 'Resumen' : 'Carrito'}</span>
              </SheetTitle>
              {(user?.rol === 'minorista' || user?.rol === 'mayorista') && (
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  {formatFechaISOLocalLegible(
                    user?.rol === 'minorista' ? fechaVistaMinorista : getLocalDateISO()
                  )}
                </p>
              )}
              <SheetDescription className="sr-only">
                {(user?.rol === 'minorista' || user?.rol === 'mayorista') 
                  ? 'Gestiona tu resumen de pedido' 
                  : 'Gestiona los productos en tu carrito de venta'}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto',
                  (user?.rol === 'minorista' || user?.rol === 'mayorista') && 'pb-28'
                )}
              >
              {/* Mostrar preregistros si es minorista o mayorista */}
              {(user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                preregistroItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <ClipboardList className="h-16 w-16 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No hay productos en tu resumen</p>
                    <p className="text-sm text-muted-foreground">Selecciona productos de tu preregistro para agregarlos</p>
                  </div>
                ) : (
                  <>
                    {cargandoVentasResumenDia ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <Loader className="h-10 w-10 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-sm text-muted-foreground">Cargando ventas del día…</p>
                      </div>
                    ) : hayLineasEnResumenMinorMayor ? (
                      <>
                        <div className="overflow-y-auto overscroll-contain">
                          <div>
                            {lineasResumenVentasRegistradas.length > 0 && (
                              <>
                                <div className="border-b border-border bg-muted/40 px-2 py-1 sm:px-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Ventas guardadas (finalizadas)
                                  </p>
                                </div>
                                {lineasResumenVentasRegistradas.map((item) => (
                                  <div
                                    key={item.key}
                                    className="border-b border-border flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2"
                                  >
                                    <span className="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                                      {item.nombre}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                      {item.cantidadVendida}×Bs.{item.precioUnitario.toFixed(2)}
                                      <span className="mx-1 opacity-50">·</span>
                                      <span className="font-semibold text-foreground">
                                        Bs.{item.subtotal.toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                            {lineasResumenBorradorPreregistro.length > 0 && (
                              <>
                                <div
                                  className={cn(
                                    'border-b border-border bg-muted/40 px-2 py-1 sm:px-3',
                                    lineasResumenVentasRegistradas.length > 0 && 'border-t border-border'
                                  )}
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                                    Venta en curso (pendiente de finalizar)
                                  </p>
                                </div>
                                {lineasResumenBorradorPreregistro.map((item) => (
                                  <div
                                    key={item.key}
                                    className="border-b border-border flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2"
                                  >
                                    <span className="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                                      {item.nombre}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                      {item.cantidadVendida}×Bs.{item.precioUnitario.toFixed(2)}
                                      <span className="mx-1 opacity-50">·</span>
                                      <span className="font-semibold text-foreground">
                                        Bs.{item.subtotal.toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Tarjeta / Recarga / Chip */}
                        <div className="border-t p-3 sm:p-4 space-y-2">
                          <p className="text-sm font-semibold mb-3">Tarjeta, Recarga y Chip:</p>
                          {resumenTarjetaRecargaChipCombinado.map((row) => (
                            <div key={row.key} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{row.nombre}:</span>
                              <span className="font-medium">Bs. {row.total.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2 mt-2 border-t">
                            <p className="text-sm font-semibold">Total General:</p>
                            <p className="text-xl font-bold text-primary">
                              Bs. {totalResumenVentasYBorrador.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {bloqueQRResumenConsultaHistorica}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <ClipboardList className="h-16 w-16 text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No hay ventas ni saldos vendidos para esta fecha</p>
                        {(user?.rol === 'minorista' || user?.rol === 'mayorista') && (
                          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                            Las ventas finalizadas aparecen al cerrar el día en Nueva venta. Si editaste saldos en la
                            tabla, verás aquí la venta en curso cuando el subtotal sea mayor a cero.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )
              ) : items.length === 0 ? (
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
                  {(user?.rol === 'minorista' || user?.rol === 'mayorista') &&
                  cargandoVentasResumenDia ? (
                    <div className="border-t bg-muted/30 p-4 flex flex-col items-center gap-2 py-6">
                      <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cargando ventas…</span>
                    </div>
                  ) : (user?.rol === 'minorista' || user?.rol === 'mayorista') &&
                  hayLineasEnResumenMinorMayor ? (
                    <>
                      <div className="border-t p-4 space-y-2">
                        <p className="text-sm font-semibold mb-3">Tarjeta, Recarga y Chip:</p>
                        {resumenTarjetaRecargaChipCombinado.map((row) => (
                          <div key={row.key} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{row.nombre}:</span>
                            <span className="font-medium">Bs. {row.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Subtotal</span>
                          <span className="text-base font-medium">Bs. {totalResumenVentasYBorrador.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-display text-lg font-bold">Total</span>
                          <span className="font-display text-2xl font-bold text-primary">
                            Bs. {totalResumenVentasYBorrador.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (user?.rol === 'minorista' || user?.rol === 'mayorista') ? (
                    <div className="border-t bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No hay ventas ni saldos vendidos para esta fecha
                    </div>
                  ) : (
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
                  )}

                  {/* Actions */}
                  <div className="p-4 space-y-2 border-t">
                    <Button 
                      className="w-full h-12 gap-2 text-base" 
                      onClick={() => {
                        handleCompleteSale();
                        setShowCartSheet(false);
                      }}
                      disabled={((user?.rol === 'minorista' || user?.rol === 'mayorista') ? preregistroItems.length === 0 : itemCount === 0) || createSaleMutation.isPending}
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
              {(user?.rol === 'minorista' || user?.rol === 'mayorista') &&
                preregistroItems.length > 0 && (
                  <div className="shrink-0 space-y-2 border-t bg-background p-4">
                    {user?.rol === 'minorista' && minoristaEdicionBloqueada && minoristaConsultaEsHoy ? (
                      <>
                        {minoristaMostrarQREnLugarDeFinalizar ? (
                          <Button
                            type="button"
                            className="h-12 w-full gap-2 text-base"
                            onClick={() => {
                              setShowSuccessAfterQrClose(false);
                              setShowQRDialog(true);
                            }}
                          >
                            <QrCode className="h-5 w-5" />
                            Mostrar QR
                          </Button>
                        ) : (
                          <div className="space-y-2 px-2 text-center">
                            <p className="text-sm text-muted-foreground">
                              Venta finalizada. Un administrador debe activar <strong>Editar Nueva venta</strong>{' '}
                              (Gestión de usuarios o Control de ventas) para corregir y volver a finalizar.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Mostrar QR solo aparece si al finalizar quedó saldo por transferir y la transferencia sigue
                              pendiente (no escaneada aún).
                            </p>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCartSheet(false)}
                        >
                          Cerrar
                        </Button>
                      </>
                    ) : user?.rol === 'minorista' && minoristaBloqueadoPorJornadaPendienteVista ? (
                      <>
                        <p className="text-sm text-center text-muted-foreground px-2">
                          Usá los botones en <strong>Ventas del día (Minorista)</strong> (arriba): nueva venta o QR.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCartSheet(false)}
                        >
                          Cerrar
                        </Button>
                      </>
                    ) : user?.rol === 'minorista' && !minoristaConsultaEsHoy ? (
                      <>
                        <p className="text-sm text-center text-muted-foreground px-2">
                          Consulta del <strong>{formatDateOnlyLocal(fechaVistaMinorista)}</strong>. Para vender, elegí{' '}
                          <strong>hoy</strong> en el calendario del panel superior.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCartSheet(false)}
                        >
                          Cerrar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="h-12 w-full gap-2 text-base"
                          onClick={() => {
                            if (user?.rol === 'minorista' && minoristaPuedeEditarPreregistro) {
                              abrirAdvertenciaFinalizarVentaMinorista(true);
                            } else {
                              void handleCompleteSale();
                              setShowCartSheet(false);
                            }
                          }}
                          disabled={
                            preregistroItems.filter(
                              (item) =>
                                item.cantidad + item.aumento - item.cantidadRestante > 0
                            ).length === 0 || createSaleMutation.isPending
                          }
                        >
                          {createSaleMutation.isPending ? (
                            <>
                              <Loader className="h-5 w-5 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              {user?.rol === 'minorista' ? 'Finalizar venta' : 'Completar Venta'}
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
                      </>
                    )}
                  </div>
                )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Dialog para arrastrar saldos restantes (Mayoristas) */}
      <Dialog open={showArrastrarSaldosDialog} onOpenChange={setShowArrastrarSaldosDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Arrastrar Saldos Restantes</DialogTitle>
            <DialogDescription>
              Registra los saldos restantes de productos que quedan después de tu jornada de trabajo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {saldosParaArrastrar.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay saldos restantes para arrastrar.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Productos con saldo restante:
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {saldosParaArrastrar.map((saldo) => (
                    <div
                      key={saldo.id_producto}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{saldo.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad restante: {saldo.cantidad_restante}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleOmitirArrastrarSaldos}
            >
              Omitir
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleArrastrarSaldos}
              disabled={saldosParaArrastrar.length === 0}
            >
              Arrastrar Saldos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advertencia antes de finalizar venta (minorista) */}
      <AlertDialog
        open={showMinoristaFinalizarAdvertencia}
        onOpenChange={(open) => {
          setShowMinoristaFinalizarAdvertencia(open);
          if (!open) setPendingFinalizarCierraSheet(false);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Advertencia</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-foreground">
                <p>
                  Al finalizar, <strong>no podrás editar</strong> las <strong>ventas del día</strong> ni los saldos de
                  esta jornada.
                </p>
                <p>
                  Tampoco podrás <strong>hacer pedidos</strong> hasta que un administrador lo habilite en{' '}
                  <strong>Control de ventas</strong> para la fecha que corresponda.
                </p>
                <p className="text-sm text-muted-foreground">¿Continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={() => confirmarAdvertenciaFinalizarVentaMinorista()}>
              Aceptar y finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para generar QR (Minoristas) */}
      <Dialog
        open={showQRDialog}
        onOpenChange={(open) => {
          setShowQRDialog(open);
          if (!open && showSuccessAfterQrClose) {
            setShowSuccessAfterQrClose(false);
            setShowSuccessDialog(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-xl">Transferir Saldos Restantes</DialogTitle>
            <DialogDescription>
              Escanea este código QR para transferir tus saldos restantes a otro minorista. Con <strong>Compartir</strong>{' '}
              podés enviar imagen PNG y texto cuando el teléfono lo permita; si no, probá <strong>Descargar imagen</strong>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrCode ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-primary">
                  <QRCodeSVG
                    value={qrCode}
                    size={220}
                    level="M"
                    includeMargin
                    className="mx-auto block"
                  />
                </div>
                <p className="text-xs font-mono text-muted-foreground text-center break-all max-w-full px-1">
                  {qrCode}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Comparte este código con otro minorista para que pueda escanearlo y recibir tus saldos restantes.
                </p>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      void navigator.clipboard.writeText(qrCode);
                      toast.success('Código QR copiado al portapapeles');
                    }}
                  >
                    Copiar código
                  </Button>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={() => void compartirCodigoQRTransferencia(qrCode)}
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
                    Compartir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 sm:col-span-2"
                    onClick={() => void descargarImagenQRTransferencia(qrCode)}
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    Descargar imagen del QR
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No se pudo generar el código QR.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR consulta histórica (día pasado con transferencia pendiente) */}
      <Dialog open={showQRDialogConsultaHistorica} onOpenChange={setShowQRDialogConsultaHistorica}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-xl">Transferir saldos</DialogTitle>
            <DialogDescription>
              Venta del <strong>{formatDateOnlyLocal(fechaVistaMinorista)}</strong>. Otro minorista puede escanear este
              código en <strong>Escanear QR</strong>. <strong>Compartir</strong> incluye imagen PNG y texto si el
              dispositivo lo admite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {transferenciaQRConsultaHistorica?.codigo_qr?.trim() ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-lg border-2 border-primary bg-white p-4">
                  <QRCodeSVG
                    value={transferenciaQRConsultaHistorica.codigo_qr.trim()}
                    size={220}
                    level="M"
                    includeMargin
                    className="mx-auto block"
                  />
                </div>
                <p className="max-w-full px-1 text-center font-mono text-xs text-muted-foreground break-all">
                  {transferenciaQRConsultaHistorica.codigo_qr}
                </p>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      void navigator.clipboard.writeText(transferenciaQRConsultaHistorica.codigo_qr.trim());
                      toast.success('Código copiado al portapapeles');
                    }}
                  >
                    Copiar código
                  </Button>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={() =>
                      void compartirCodigoQRTransferencia(transferenciaQRConsultaHistorica.codigo_qr)
                    }
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
                    Compartir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 sm:col-span-2"
                    onClick={() =>
                      void descargarImagenQRTransferencia(transferenciaQRConsultaHistorica.codigo_qr)
                    }
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    Descargar imagen del QR
                  </Button>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">No hay código QR para mostrar.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
