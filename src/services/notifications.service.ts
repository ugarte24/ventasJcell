/**
 * Servicio de Notificaciones Push
 * Maneja las notificaciones del navegador usando Web Push API
 */

export type NotificationType = 
  | 'nueva_venta'
  | 'venta_anulada'
  | 'stock_bajo'
  | 'caja_abierta'
  | 'caja_cerrada'
  | 'producto_agotado'
  | 'movimiento_inventario';

export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean;
  private readonly STORAGE_KEY = 'ventaplus_notifications_enabled';

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Verifica si las notificaciones están habilitadas por el usuario
   */
  isEnabled(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === null) {
      // Si no hay preferencia guardada, usar el estado del permiso
      return this.hasPermission();
    }
    return stored === 'true';
  }

  /**
   * Habilita las notificaciones
   */
  enable(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  /**
   * Deshabilita las notificaciones
   */
  disable(): void {
    localStorage.setItem(this.STORAGE_KEY, 'false');
  }

  /**
   * Solicita permiso para mostrar notificaciones
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return 'denied';
    }

    if (this.permission === 'granted') {
      // Si ya tiene permiso, habilitar las notificaciones
      this.enable();
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      if (permission === 'granted') {
        this.enable();
      }
      return permission;
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
      return 'denied';
    }
  }

  /**
   * Verifica si se tienen permisos para mostrar notificaciones
   */
  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Verifica si las notificaciones están soportadas
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Muestra una notificación
   */
  async showNotification(data: NotificationData): Promise<void> {
    if (!this.isSupported) {
      console.warn('Las notificaciones no están soportadas');
      return;
    }

    // Verificar si las notificaciones están habilitadas por el usuario
    if (!this.isEnabled()) {
      return; // No mostrar notificación si están deshabilitadas
    }

    if (this.permission !== 'granted') {
      // Intentar solicitar permiso si aún no se ha concedido
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permiso de notificaciones denegado');
        return;
      }
    }

    try {
      const options: NotificationOptions = {
        body: data.body,
        icon: data.icon || '/vite.svg',
        badge: data.badge || '/vite.svg',
        tag: data.tag || data.type,
        data: data.data || {},
        requireInteraction: data.type === 'stock_bajo' || data.type === 'producto_agotado' ? true : undefined,
        silent: false,
      };

      const notification = new Notification(data.title, options);

      // Cerrar automáticamente después de 5 segundos (excepto para alertas importantes)
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Manejar clic en la notificación
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();

        // Navegar según el tipo de notificación
        if (data.data?.url) {
          window.location.href = data.data.url;
        }
      };
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  }

  /**
   * Notificación para nueva venta
   */
  async notifyNewSale(saleData: { id: string; total: number; vendedor?: string }): Promise<void> {
    await this.showNotification({
      type: 'nueva_venta',
      title: '💰 Nueva Venta',
      body: `Venta registrada: Bs. ${saleData.total.toFixed(2)}${saleData.vendedor ? ` - ${saleData.vendedor}` : ''}`,
      icon: '/vite.svg',
      tag: `venta-${saleData.id}`,
      data: {
        url: '/ventas',
        saleId: saleData.id,
      },
    });
  }

  /**
   * Notificación para venta anulada
   */
  async notifyCancelledSale(saleData: { id: string; total: number }): Promise<void> {
    await this.showNotification({
      type: 'venta_anulada',
      title: '⚠️ Venta Anulada',
      body: `Venta #${saleData.id.slice(0, 8)} por Bs. ${saleData.total.toFixed(2)} ha sido anulada`,
      icon: '/vite.svg',
      tag: `venta-anulada-${saleData.id}`,
      data: {
        url: '/ventas',
        saleId: saleData.id,
      },
    });
  }

  /**
   * Notificación para stock bajo
   */
  async notifyLowStock(productData: { nombre: string; stock: number; stockMinimo: number }): Promise<void> {
    await this.showNotification({
      type: 'stock_bajo',
      title: '📦 Stock Bajo',
      body: `${productData.nombre}: ${productData.stock} unidades (mínimo: ${productData.stockMinimo})`,
      icon: '/vite.svg',
      tag: `stock-bajo-${productData.nombre}`,
      requireInteraction: true,
      data: {
        url: '/productos',
        productName: productData.nombre,
      },
    });
  }

  /**
   * Notificación para producto agotado
   */
  async notifyOutOfStock(productData: { nombre: string }): Promise<void> {
    await this.showNotification({
      type: 'producto_agotado',
      title: '🚨 Producto Agotado',
      body: `${productData.nombre} se ha quedado sin stock`,
      icon: '/vite.svg',
      tag: `producto-agotado-${productData.nombre}`,
      requireInteraction: true,
      data: {
        url: '/productos',
        productName: productData.nombre,
      },
    });
  }

  /**
   * Notificación para caja abierta
   */
  async notifyCashRegisterOpened(data: { montoInicial: number }): Promise<void> {
    await this.showNotification({
      type: 'caja_abierta',
      title: '💵 Caja Abierta',
      body: `Caja abierta con monto inicial: Bs. ${data.montoInicial.toFixed(2)}`,
      icon: '/vite.svg',
      tag: 'caja-abierta',
      data: {
        url: '/arqueo',
      },
    });
  }

  /**
   * Notificación para caja cerrada
   */
  async notifyCashRegisterClosed(data: { totalVentas: number; diferencia: number }): Promise<void> {
    await this.showNotification({
      type: 'caja_cerrada',
      title: '💵 Caja Cerrada',
      body: `Caja cerrada. Ventas: Bs. ${data.totalVentas.toFixed(2)}${data.diferencia !== 0 ? ` | Diferencia: Bs. ${data.diferencia.toFixed(2)}` : ''}`,
      icon: '/vite.svg',
      tag: 'caja-cerrada',
      data: {
        url: '/arqueo',
      },
    });
  }

  /**
   * Notificación genérica
   */
  async notifyGeneric(title: string, body: string, type: NotificationType = 'movimiento_inventario'): Promise<void> {
    await this.showNotification({
      type,
      title,
      body,
      icon: '/vite.svg',
    });
  }
}

// Exportar instancia única
export const notificationService = new NotificationService();

