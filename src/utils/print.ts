import { Sale, SaleDetail, CartItem } from '@/types';

export interface PrintTicketData {
  sale: Sale;
  items: (SaleDetail & { producto?: { nombre: string; codigo: string } })[] | CartItem[];
  vendedor?: string;
  cliente?: string;
  creditPayment?: {
    numero_cuota?: number;
    monto_pagado: number;
    fecha_pago: string;
    metodo_pago: string;
  };
}

/**
 * Imprime un ticket de venta
 */
export function printTicket(data: PrintTicketData) {
  // Crear ventana de impresión
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresión');
  }

  const fecha = new Date(data.sale.fecha + 'T' + data.sale.hora);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'qr': 'QR',
      'transferencia': 'Transferencia',
      'credito': 'Crédito',
    };
    return labels[method] || method;
  };

  // Generar HTML del ticket
  const ticketHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Venta</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        
        body {
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        
        .header p {
          font-size: 10px;
          margin: 0;
        }
        
        .info {
          margin-bottom: 10px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
          padding-top: 10px;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-weight: bold;
          font-size: 11px;
        }
        
        .item {
          margin-bottom: 8px;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 5px;
        }
        
        .item-name {
          margin-bottom: 3px;
          font-weight: bold;
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        
        .total-section {
          margin-top: 10px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .total-final {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
          margin-top: 5px;
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        
        .footer {
          margin-top: 15px;
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 10px;
          font-size: 10px;
        }
        
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>J-CELL</h1>
        <p>Sistema de Punto de Venta</p>
      </div>
      
      <div class="info">
        <div class="info-row">
          <span>Ticket #:</span>
          <span style="font-weight: bold;">${data.sale.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span>Fecha:</span>
          <span>${fechaFormateada}</span>
        </div>
        ${data.vendedor ? `
        <div class="info-row">
          <span>Vendedor Tienda:</span>
          <span>${data.vendedor}</span>
        </div>
        ` : ''}
        ${data.cliente ? `
        <div class="info-row">
          <span>Cliente:</span>
          <span>${data.cliente}</span>
        </div>
        ` : ''}
      </div>
      
      ${data.creditPayment ? `
      <div class="info" style="margin-top:8px;">
        <div class="info-row">
          <span>Pago de Crédito</span>
          <span>${data.creditPayment.numero_cuota === 0 
            ? 'Cuota Inicial' 
            : `Cuota ${data.creditPayment.numero_cuota ?? '-'}${data.sale.meses_credito ? `/${data.sale.meses_credito}` : ''}`}</span>
        </div>
        <div class="info-row">
          <span>Monto pagado:</span>
          <span>Bs. ${Number(data.creditPayment.monto_pagado).toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span>Método de pago:</span>
          <span>Crédito</span>
        </div>
        <div class="info-row">
          <span>Fecha pago:</span>
          <span>${data.creditPayment.fecha_pago}</span>
        </div>
      </div>
      ` : ''}

      ${data.sale.metodo_pago === 'credito' && !data.creditPayment ? `
      <div class="info" style="margin-top:8px;">
        <div class="info-row">
          <span>Venta a Crédito</span>
          <span>${data.sale.cuota_inicial ? `Cuota inicial: Bs. ${Number(data.sale.cuota_inicial).toFixed(2)}` : ''}</span>
        </div>
      </div>
      ` : ''}

      ${!data.creditPayment ? `
      <div class="divider">
        <div class="items-header">
          <span>PRODUCTO</span>
          <span style="text-align: right;">CANT. PRECIO</span>
        </div>
      </div>
      
      <div class="items">
        ${data.items.map((item) => {
          const nombre = 'producto' in item && item.producto 
            ? item.producto.nombre 
            : 'nombre' in item 
            ? item.nombre 
            : 'N/A';
          const cantidad = item.cantidad;
          const precio = 'precio_unitario' in item ? item.precio_unitario : item.precio_por_unidad;
          const subtotal = 'subtotal' in item ? item.subtotal : cantidad * precio;
          
          return `
            <div class="item">
              <div class="item-name">${nombre}</div>
              <div class="item-details">
                <span>${cantidad} x Bs. ${precio.toFixed(2)}</span>
                <span style="font-weight: bold;">Bs. ${subtotal.toFixed(2)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="divider"></div>
      ` : `
      <div class="info" style="margin-top:4px; margin-bottom:4px;">
        ${data.items.map((item) => {
          const nombre = 'producto' in item && item.producto 
            ? item.producto.nombre 
            : 'nombre' in item 
            ? item.nombre 
            : 'N/A';
          return `
            <div class="info-row">
              <span>Producto:</span>
              <span>${nombre}</span>
            </div>
          `;
        }).join('')}
      </div>
      `}
      
      ${!data.creditPayment ? `
      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>Bs. ${data.sale.total.toFixed(2)}</span>
        </div>
        <div class="total-final">
          <span>TOTAL:</span>
          <span>Bs. ${data.sale.total.toFixed(2)}</span>
        </div>
        <div class="total-row" style="margin-top: 5px; font-size: 11px;">
          <span>Método de Pago:</span>
          <span style="font-weight: bold;">${getPaymentMethodLabel(data.sale.metodo_pago)}</span>
        </div>
      </div>
      ` : `
      <div class="total-section">
        <div class="total-final">
          <span>MONTO PAGADO:</span>
          <span>Bs. ${Number(data.creditPayment.monto_pagado).toFixed(2)}</span>
        </div>
        <div class="total-row" style="margin-top: 5px; font-size: 11px;">
          <span>${data.creditPayment.numero_cuota === 0 
            ? 'Cuota Inicial' 
            : `Cuota ${data.creditPayment.numero_cuota ?? '-'}${data.sale.meses_credito ? `/${data.sale.meses_credito}` : ''}`}</span>
        </div>
        <div class="total-row" style="font-size: 11px;">
          <span>Método de pago:</span>
          <span style="font-weight: bold;">Crédito</span>
        </div>
      </div>
      `}
      
      <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p>J-Cell - Sistema de Ventas</p>
      </div>
    </body>
    </html>
  `;

  // Escribir HTML y abrir diálogo de impresión
  printWindow.document.write(ticketHTML);
  printWindow.document.close();
  
  // Esperar a que se cargue el contenido antes de imprimir
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Cerrar ventana después de imprimir (opcional)
      // printWindow.close();
    }, 250);
  };
}

