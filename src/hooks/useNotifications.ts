import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts';
import { notificationService } from '@/services/notifications.service';
import { supabase } from '@/lib/supabase';

/**
 * Hook para manejar notificaciones push
 * Se suscribe a eventos de Supabase Realtime para notificaciones en tiempo real
 */
export function useNotifications() {
  const { user } = useAuth();

  /**
   * Solicita permiso para notificaciones
   */
  const requestPermission = useCallback(async () => {
    return await notificationService.requestPermission();
  }, []);

  /**
   * Verifica si tiene permisos
   */
  const hasPermission = useCallback(() => {
    return notificationService.hasPermission();
  }, []);

  /**
   * Verifica si está soportado
   */
  const isSupported = useCallback(() => {
    return notificationService.isNotificationSupported();
  }, []);

  /**
   * Verifica si las notificaciones están habilitadas
   */
  const isEnabled = useCallback(() => {
    return notificationService.isEnabled();
  }, []);

  /**
   * Habilita las notificaciones
   */
  const enable = useCallback(() => {
    notificationService.enable();
  }, []);

  /**
   * Deshabilita las notificaciones
   */
  const disable = useCallback(() => {
    notificationService.disable();
  }, []);

  /**
   * Configura suscripciones a eventos en tiempo real
   * NOTA: Desactivado - Solo se usan toasts dentro de la aplicación
   */
  useEffect(() => {
    // Desactivar notificaciones push - solo usar toasts
    return;
    
    // Código comentado - notificaciones push desactivadas
    /*
    if (!user || !notificationService.isNotificationSupported()) {
      return;
    }

    // Solo configurar suscripciones si el usuario es admin, tiene permisos y las notificaciones están habilitadas
    const isEnabled = notificationService.isEnabled();
    if (user.rol !== 'admin' || !notificationService.hasPermission() || !isEnabled) {
      return;
    }

    // Suscripción a nuevas ventas (solo para admins con permisos)
    let ventasChannel: any = null;
    let productosChannel: any = null;
    let arqueosChannel: any = null;

    try {
      ventasChannel = supabase
        .channel(`ventas-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ventas',
            filter: `estado=eq.completada`,
          },
          (payload) => {
            const venta = payload.new as any;
            notificationService.notifyNewSale({
              id: venta.id,
              total: venta.total,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ventas',
            filter: `estado=eq.anulada`,
          },
          (payload) => {
            const venta = payload.new as any;
            const ventaAnterior = payload.old as any;
            // Solo notificar si cambió de completada a anulada
            if (ventaAnterior?.estado === 'completada' && venta.estado === 'anulada') {
              notificationService.notifyCancelledSale({
                id: venta.id,
                total: venta.total,
              });
            }
          }
        )
        .subscribe();

      // Suscripción a cambios en productos (stock bajo)
      productosChannel = supabase
        .channel(`productos-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'productos',
          },
          (payload) => {
            const producto = payload.new as any;
            const productoAnterior = payload.old as any;

            // Notificar si el stock bajó y está por debajo del mínimo
            if (
              producto.estado === 'activo' &&
              producto.stock_actual <= producto.stock_minimo &&
              productoAnterior?.stock_actual > producto.stock_actual
            ) {
              if (producto.stock_actual === 0) {
                notificationService.notifyOutOfStock({
                  nombre: producto.nombre,
                });
              } else {
                notificationService.notifyLowStock({
                  nombre: producto.nombre,
                  stock: producto.stock_actual,
                  stockMinimo: producto.stock_minimo,
                });
              }
            }
          }
        )
        .subscribe();

      // Suscripción a cambios en arqueos de caja
      arqueosChannel = supabase
        .channel(`arqueos-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'arqueos_caja',
            filter: `estado=eq.abierto`,
          },
          (payload) => {
            const arqueo = payload.new as any;
            notificationService.notifyCashRegisterOpened({
              montoInicial: arqueo.monto_inicial,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'arqueos_caja',
            filter: `estado=eq.cerrado`,
          },
          (payload) => {
            const arqueo = payload.new as any;
            const arqueoAnterior = payload.old as any;
            // Solo notificar si cambió de abierto a cerrado
            if (arqueoAnterior?.estado === 'abierto' && arqueo.estado === 'cerrado') {
              notificationService.notifyCashRegisterClosed({
                totalVentas: arqueo.total_ventas || 0,
                diferencia: arqueo.diferencia || 0,
              });
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error al configurar suscripciones de notificaciones:', error);
    }

    // Limpiar suscripciones al desmontar
    return () => {
      if (ventasChannel) {
        supabase.removeChannel(ventasChannel);
      }
      if (productosChannel) {
        supabase.removeChannel(productosChannel);
      }
      if (arqueosChannel) {
        supabase.removeChannel(arqueosChannel);
      }
    };
    */
  }, [user]);

  return {
    requestPermission,
    hasPermission,
    isSupported,
    isEnabled,
    enable,
    disable,
    notificationService,
  };
}

