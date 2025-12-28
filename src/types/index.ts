// J-Cell Type Definitions

export type UserRole = 'admin' | 'vendedor';

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
  precio_venta: number;
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
    precio_venta: 15,
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
    precio_venta: 12,
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
    precio_venta: 8.5,
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
    precio_venta: 9,
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
    precio_venta: 18,
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
    precio_venta: 8,
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
    precio_venta: 6,
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
    precio_venta: 14,
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
