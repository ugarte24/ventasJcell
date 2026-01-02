import { Sale, SaleDetail, CartItem } from '@/types';
import { format } from 'date-fns';

interface TicketProps {
  sale: Sale;
  items: (SaleDetail & { producto?: { nombre: string; codigo: string } })[] | CartItem[];
  vendedor?: string;
  cliente?: string;
}

export function Ticket({ sale, items, vendedor, cliente }: TicketProps) {
  const fecha = format(new Date(sale.fecha + 'T' + sale.hora), 'dd/MM/yyyy HH:mm');
  
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'qr': 'QR',
      'transferencia': 'Transferencia',
    };
    return labels[method] || method;
  };

  return (
    <div className="ticket-container" style={{ 
      width: '80mm', 
      maxWidth: '80mm',
      margin: '0 auto',
      padding: '10mm',
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.4',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>J-CELL</h1>
        <p style={{ fontSize: '10px', margin: '0' }}>Sistema de Punto de Venta</p>
      </div>

      {/* Sale Info */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Ticket #:</span>
          <span style={{ fontWeight: 'bold' }}>{sale.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Fecha:</span>
          <span>{fecha}</span>
        </div>
        {vendedor && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Vendedor Tienda:</span>
            <span>{vendedor}</span>
          </div>
        )}
        {cliente && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Cliente:</span>
            <span>{cliente}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontWeight: 'bold', fontSize: '11px' }}>
          <span>PRODUCTO</span>
          <span style={{ textAlign: 'right' }}>CANT. PRECIO</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '10px' }}>
        {items.map((item, index) => {
          const nombre = 'producto' in item && item.producto 
            ? item.producto.nombre 
            : 'nombre' in item 
            ? item.nombre 
            : 'N/A';
          const cantidad = item.cantidad;
          const precio = 'precio_unitario' in item ? item.precio_unitario : item.precio_por_unidad;
          const subtotal = 'subtotal' in item ? item.subtotal : cantidad * precio;

          return (
            <div key={index} style={{ marginBottom: '8px', borderBottom: '1px dotted #ccc', paddingBottom: '5px' }}>
              <div style={{ marginBottom: '3px', fontWeight: 'bold' }}>{nombre}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>{cantidad} x Bs. {precio.toFixed(2)}</span>
                <span style={{ fontWeight: 'bold' }}>Bs. {subtotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0', paddingTop: '10px' }}></div>

      {/* Total */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Subtotal:</span>
          <span>Bs. {sale.total.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '5px', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <span>TOTAL:</span>
          <span>Bs. {sale.total.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '11px' }}>
          <span>Método de Pago:</span>
          <span style={{ fontWeight: 'bold' }}>{getPaymentMethodLabel(sale.metodo_pago)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '15px', textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '10px' }}>
        <p style={{ margin: '5px 0' }}>¡Gracias por su compra!</p>
        <p style={{ margin: '5px 0' }}>J-Cell - Sistema de Ventas</p>
      </div>
    </div>
  );
}

// Estilos para impresión
export const ticketPrintStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    body * {
      visibility: hidden;
    }
    
    .ticket-container,
    .ticket-container * {
      visibility: visible;
    }
    
    .ticket-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      max-width: 80mm;
    }
    
    .no-print {
      display: none !important;
    }
  }
`;

