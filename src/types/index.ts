// J-Cell Type Definitions

export type UserRole = 'admin' | 'vendedor' | 'minorista' | 'mayorista';

export interface User {
  id: string;
  nombre: string;
  usuario: string;
  email?: string;
  rol: UserRole;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_por_unidad: number;
  precio_por_mayor?: number;
  codigo: string;
  id_categoria?: string;
  stock_actual: number;
  stock_minimo: number;
  imagen_url?: string;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
}

export interface Client {
  id: string;
  nombre: string;
  ci_nit?: string;
  telefono?: string;
  direccion?: string;
  fecha_registro: string;
}

export type PaymentMethod = 'efectivo' | 'qr' | 'transferencia' | 'credito';

export interface Sale {
  id: string;
  fecha: string;
  hora: string;
  total: number;
  metodo_pago: PaymentMethod;
  id_cliente?: string;
  id_vendedor: string;
  estado: 'completada' | 'anulada';
  fecha_vencimiento?: string;   // Calculado automáticamente desde meses_credito
  meses_credito?: number;        // Cantidad de cuotas para el crédito
  monto_pagado?: number;
  saldo_pendiente?: number;
  estado_credito?: 'pendiente' | 'pagado' | 'parcial' | 'vencido';
  tasa_interes?: number;        // Tasa de interés mensual en porcentaje (ej: 5.5 para 5.5%)
  cuota_inicial?: number;       // Cuota inicial pagada al momento de la venta
  monto_interes?: number;       // Monto calculado de interés acumulado (mes a mes)
  interes_eximido?: boolean;     // Indica si el administrador eximió el interés
  total_con_interes?: number;   // Total original + monto_interes (si no está eximido)
}

export interface CreditPayment {
  id: string;
  id_venta: string;
  monto_pagado: number;
  fecha_pago: string;
  metodo_pago: 'efectivo' | 'qr' | 'transferencia';
  numero_cuota?: number; // Número de cuota que se está pagando
  observacion?: string;
  id_usuario?: string;
  created_at: string;
  updated_at?: string;
}

export interface SaleDetail {
  id: string;
  id_venta: string;
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PreregistroMinorista {
  id: string;
  id_minorista?: string;
  id_producto: string;
  cantidad: number;
  aumento?: number; // Cantidad adicional recibida de pedidos
  fecha?: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  producto?: Product;
  minorista?: User;
}

export interface PreregistroMayorista {
  id: string;
  id_mayorista: string;
  id_producto: string;
  cantidad: number;
  aumento?: number; // Cantidad adicional recibida de pedidos
  fecha: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  producto?: Product;
  mayorista?: User;
}

export interface PreregistroVentaItem {
  id: string;
  nombre: string;
  cantidad: number;
  aumento: number; // Campo para aumentar cantidad
  cantidadRestante: number; // Saldo que queda después de la jornada
  subtotal: number;
  precio_unitario: number;
  id_producto: string;
  codigo?: string;
  id_categoria?: string; // Categoría del producto para agrupar en resumen
}

export interface Pedido {
  id: string;
  id_usuario: string;
  tipo_usuario: 'minorista' | 'mayorista';
  estado: 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
  fecha_pedido: string;
  fecha_entrega?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  usuario?: User;
  detalles?: DetallePedido[];
}

export interface DetallePedido {
  id: string;
  id_pedido: string;
  id_producto: string;
  cantidad: number;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  producto?: Product;
}

export interface TransferenciaSaldo {
  id: string;
  id_venta_origen: string;
  id_minorista_origen: string;
  id_minorista_destino: string;
  codigo_qr: string;
  saldos_transferidos: Array<{ id_producto: string; cantidad_restante: number }>;
  fecha_transferencia: string;
  fecha_escaneo?: string;
  estado: 'pendiente' | 'completada' | 'expirada' | 'cancelada';
  created_at: string;
  updated_at: string;
  // Datos relacionados
  venta_origen?: Sale;
  minorista_origen?: User;
  minorista_destino?: User;
}

export interface PagoMayorista {
  id: string;
  id_venta: string;
  id_mayorista: string;
  monto_esperado: number;
  monto_recibido: number;
  diferencia: number;
  metodo_pago: 'efectivo' | 'qr' | 'transferencia';
  observaciones?: string;
  id_administrador?: string;
  fecha_pago: string;
  fecha_verificacion?: string;
  estado: 'pendiente' | 'verificado' | 'rechazado';
  created_at: string;
  updated_at: string;
  // Datos relacionados
  venta?: Sale;
  mayorista?: User;
  administrador?: User;
}

export interface SaldoRestanteMayorista {
  id: string;
  id_venta: string;
  id_mayorista: string;
  id_producto: string;
  cantidad_restante: number;
  fecha: string;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  venta?: Sale;
  mayorista?: User;
  producto?: Product;
}

export interface CashRegister {
  id: string;
  fecha: string;
  hora_apertura: string;
  hora_cierre?: string;
  monto_inicial: number;
  total_ventas: number;
  efectivo_real?: number;
  diferencia: number;
  id_administrador: string;
  observacion?: string;
  estado: 'abierto' | 'cerrado';
  created_at?: string;
  updated_at?: string;
}

export interface CartItem extends Product {
  cantidad: number;
  subtotal: number;
}

// Servicios
export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
  created_at?: string;
  updated_at?: string;
}

export interface MovimientoServicio {
  id: string;
  id_servicio: string;
  tipo: 'aumento' | 'ajuste';
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  fecha: string;
  hora: string;
  id_usuario: string;
  observacion?: string;
  created_at?: string;
}

export interface RegistroServicio {
  id: string;
  id_servicio: string;
  fecha: string;
  saldo_inicial: number;
  saldo_final: number;
  total: number;
  monto_aumentado: number;
  id_usuario: string;
  observacion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMovimientoServicioData {
  id_servicio: string;
  tipo?: 'aumento' | 'ajuste';
  monto: number;
  fecha: string;
  hora: string;
  id_usuario: string;
  observacion?: string;
}

export interface CreateRegistroServicioData {
  id_servicio: string;
  fecha: string;
  saldo_inicial: number;
  saldo_final: number;
  monto_aumentado?: number;
  id_usuario: string;
  observacion?: string;
}

// Mock data for MVP
export const mockProducts: Product[] = [
  {
    id: '1',
    nombre: 'Coca Cola 2L',
    descripcion: 'Bebida gaseosa',
    precio_por_unidad: 15,
    codigo: 'BEB001',
    stock_actual: 50,
    stock_minimo: 10,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '2',
    nombre: 'Pan de Molde',
    descripcion: 'Pan blanco',
    precio_por_unidad: 12,
    codigo: 'PAN001',
    stock_actual: 25,
    stock_minimo: 5,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '3',
    nombre: 'Leche Gloria 1L',
    descripcion: 'Leche evaporada',
    precio_por_unidad: 8.5,
    codigo: 'LAC001',
    stock_actual: 40,
    stock_minimo: 10,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '4',
    nombre: 'Arroz Grano de Oro 1kg',
    descripcion: 'Arroz extra',
    precio_por_unidad: 9,
    codigo: 'ARR001',
    stock_actual: 60,
    stock_minimo: 15,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '5',
    nombre: 'Aceite Fino 1L',
    descripcion: 'Aceite vegetal',
    precio_por_unidad: 18,
    codigo: 'ACE001',
    stock_actual: 30,
    stock_minimo: 8,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '6',
    nombre: 'Azúcar Bermejo 1kg',
    descripcion: 'Azúcar refinada',
    precio_por_unidad: 8,
    codigo: 'AZU001',
    stock_actual: 45,
    stock_minimo: 10,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '7',
    nombre: 'Fideos Coronilla 400g',
    descripcion: 'Fideos spaghetti',
    precio_por_unidad: 6,
    codigo: 'FID001',
    stock_actual: 55,
    stock_minimo: 12,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
  {
    id: '8',
    nombre: 'Atún Real 170g',
    descripcion: 'Atún en lata',
    precio_por_unidad: 14,
    codigo: 'ATU001',
    stock_actual: 35,
    stock_minimo: 8,
    estado: 'activo',
    fecha_creacion: '2024-01-01'
  },
];

export const mockSales: (Sale & { items: number })[] = [
  {
    id: '1',
    fecha: '2024-01-15',
    hora: '09:30',
    total: 45.50,
    metodo_pago: 'efectivo',
    id_vendedor: '1',
    estado: 'completada',
    items: 3
  },
  {
    id: '2',
    fecha: '2024-01-15',
    hora: '10:15',
    total: 120.00,
    metodo_pago: 'qr',
    id_vendedor: '1',
    estado: 'completada',
    items: 5
  },
  {
    id: '3',
    fecha: '2024-01-15',
    hora: '11:45',
    total: 78.30,
    metodo_pago: 'efectivo',
    id_vendedor: '1',
    estado: 'completada',
    items: 4
  },
];
