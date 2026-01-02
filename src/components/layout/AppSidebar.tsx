import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, BarChart3, Users, Settings, LogOut, Receipt, FolderTree, UserCircle, Wallet, ArrowLeftRight, DollarSign, Wrench, Calendar, History, Search, ChevronDown, ChevronRight, ClipboardList, Store } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/constants';

const menuSections = [
  {
    label: 'Principal',
    items: [
      { title: 'Panel de Control', url: '/dashboard', icon: Home, roles: ['admin', 'vendedor'] },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { title: 'Nueva Venta', url: '/ventas/nueva', icon: ShoppingCart, roles: ['admin', 'vendedor', 'minorista', 'mayorista'] },
      { title: 'Historial de Ventas', url: '/ventas', icon: Receipt, roles: ['admin', 'vendedor'] },
      { title: 'Ventas a Crédito', url: '/creditos', icon: DollarSign, roles: ['admin', 'vendedor'] },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { title: 'Productos', url: '/productos', icon: Package, roles: ['admin'] },
      { title: 'Categorías', url: '/categorias', icon: FolderTree, roles: ['admin'] },
      { title: 'Movimientos Inventario', url: '/inventario/movimientos', icon: ArrowLeftRight, roles: ['admin'] },
      { title: 'Preregistros Minorista', url: '/preregistros/minorista', icon: ClipboardList, roles: ['admin'] },
      { title: 'Preregistros Mayorista', url: '/preregistros/mayorista', icon: Store, roles: ['admin'] },
    ],
  },
  {
    label: 'Servicios',
    items: [
      { title: 'Servicios', url: '/servicios', icon: Wrench, roles: ['admin', 'vendedor'] },
      { title: 'Registro Servicios', url: '/servicios/registro', icon: Calendar, roles: ['admin', 'vendedor'] },
      { title: 'Historial Servicios', url: '/servicios/historial', icon: History, roles: ['admin', 'vendedor'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { title: 'Clientes', url: '/clientes', icon: UserCircle, roles: ['admin', 'vendedor'] },
      { title: 'Arqueo de Caja', url: '/arqueo', icon: Wallet, roles: ['admin'] },
      { title: 'Reportes', url: '/reportes', icon: BarChart3, roles: ['admin'] },
      { title: 'Usuarios', url: '/usuarios', icon: Users, roles: ['admin'] },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const [searchTerm, setSearchTerm] = useState('');
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  
  // Estado inicial de secciones abiertas (desde sessionStorage o valores por defecto)
  const getInitialOpenSections = (): Record<string, boolean> => {
    const defaultSections = {
      'Principal': true,
      'Ventas': true,
      'Servicios': true,
      'Inventario': true,
      'Administración': true,
    };
    
    try {
      const saved = sessionStorage.getItem('sidebarOpenSections');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Combinar con valores por defecto para asegurar que todas las secciones tengan un valor
        return { ...defaultSections, ...parsed };
      }
    } catch (error) {
      console.error('Error al cargar secciones abiertas:', error);
    }
    
    return defaultSections;
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(getInitialOpenSections);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Guardar posición de scroll cuando cambia
  useEffect(() => {
    const sidebarContent = sidebarContentRef.current;
    if (!sidebarContent) return;

    const handleScroll = () => {
      sessionStorage.setItem('sidebarScrollPosition', String(sidebarContent.scrollTop));
    };

    sidebarContent.addEventListener('scroll', handleScroll);
    return () => {
      sidebarContent.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restaurar posición de scroll cuando cambia la ruta o se monta el componente
  useEffect(() => {
    // Solo restaurar si el sidebar no está colapsado
    if (collapsed) return;

    const sidebarContent = sidebarContentRef.current;
    if (!sidebarContent) return;

    const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPosition) {
      // Usar requestAnimationFrame para asegurar que el DOM esté completamente renderizado
      requestAnimationFrame(() => {
        if (sidebarContentRef.current) {
          sidebarContentRef.current.scrollTop = Number(savedScrollPosition);
        }
      });
    }
  }, [location.pathname, collapsed]);

  // Filtrar y preparar secciones según búsqueda y rol
  const filteredSections = useMemo(() => {
    return menuSections.map((section) => {
      // Filtrar items según el rol del usuario
      let filteredItems = section.items.filter(item => 
        user && item.roles.includes(user.rol)
      );

      // Si hay término de búsqueda, filtrar también por título
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = filteredItems.filter(item =>
          item.title.toLowerCase().includes(searchLower)
        );
      }

      return {
        ...section,
        items: filteredItems,
      };
    }).filter(section => section.items.length > 0); // Solo mostrar secciones con items
  }, [user, searchTerm]);

  const toggleSection = (label: string) => {
    setOpenSections(prev => {
      const newState = {
        ...prev,
        [label]: !prev[label],
      };
      // Guardar en sessionStorage
      try {
        sessionStorage.setItem('sidebarOpenSections', JSON.stringify(newState));
      } catch (error) {
        console.error('Error al guardar secciones abiertas:', error);
      }
      return newState;
    });
  };

  // Si hay búsqueda, abrir todas las secciones que tengan resultados
  useEffect(() => {
    if (searchTerm.trim()) {
      const newOpenSections: Record<string, boolean> = {};
      filteredSections.forEach(section => {
        newOpenSections[section.label] = true;
      });
      setOpenSections(prev => {
        const updated = { ...prev, ...newOpenSections };
        // No guardar en sessionStorage cuando es por búsqueda, solo temporalmente
        return updated;
      });
    } else {
      // Si no hay búsqueda, restaurar el estado guardado
      const saved = sessionStorage.getItem('sidebarOpenSections');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setOpenSections(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error al restaurar secciones abiertas:', error);
        }
      }
    }
  }, [searchTerm, filteredSections]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4 space-y-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white font-display font-bold text-xl shadow-lg">
            <span className="text-white" style={{ textShadow: "0 0 2px #2563EB, 0 0 4px #2563EB" }}>
              J
            </span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-semibold text-foreground" translate="no">J-Cell</span>
              <span className="text-xs text-muted-foreground">Sistema de Ventas</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar en el menú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
              autoFocus={false}
              onFocus={(e) => {
                // Prevenir auto-focus en móvil
                if (window.innerWidth < 768) {
                  e.target.blur();
                }
              }}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent ref={sidebarContentRef} className="px-2 py-1">
        <div className="space-y-0.5">
          {filteredSections.map((section) => {
            const isOpen = openSections[section.label] ?? true;

            return (
              <SidebarGroup key={section.label} className="mb-0 p-0">
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleSection(section.label)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel 
                      className={cn(
                        "flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1 transition-colors mb-0 h-auto min-h-0",
                        collapsed && "sr-only"
                      )}
                    >
                      <span className="text-sm font-medium">{section.label}</span>
                      {!collapsed && (
                        isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-0.5">
                    <SidebarGroupContent className="mt-0 pt-0 pb-0">
                      <SidebarMenu className="space-y-0.5">
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title} className="mb-0">
                            <SidebarMenuButton asChild tooltip={item.title} className="p-0 h-auto min-h-0">
                            <NavLink
                              to={item.url}
                              end={['/ventas', '/servicios'].includes(item.url)}
                                className="flex items-center gap-2 rounded px-2 py-1 pl-4 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5 shrink-0" />
                                {!collapsed && <span className="text-sm">{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            );
          })}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {user?.nombre.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-foreground">{user?.nombre}</span>
              <span className="text-xs capitalize text-muted-foreground">{user?.rol}</span>
            </div>
          )}
        </div>
        <SidebarMenu className="mt-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => setShowLogoutDialog(true)}
              tooltip="Cerrar Sesión"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="mt-1.5 pt-1.5 border-t border-sidebar-border">
            <p className="text-xs text-center text-muted-foreground">
              Versión {APP_VERSION}
            </p>
          </div>
        )}
      </SidebarFooter>

      {/* Diálogo de confirmación para cerrar sesión */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que iniciar sesión nuevamente para acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cerrar Sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
