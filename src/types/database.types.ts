export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          estado: 'activo' | 'inactivo'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          estado?: 'activo' | 'inactivo'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          estado?: 'activo' | 'inactivo'
          created_at?: string
          updated_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          nombre: string
          usuario: string
          rol: 'admin' | 'vendedor'
          estado: 'activo' | 'inactivo'
          fecha_creacion: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre: string
          usuario: string
          rol: 'admin' | 'vendedor'
          estado?: 'activo' | 'inactivo'
          fecha_creacion?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          usuario?: string
          rol?: 'admin' | 'vendedor'
          estado?: 'activo' | 'inactivo'
          fecha_creacion?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          ci_nit: string | null
          telefono: string | null
          direccion: string | null
          fecha_registro: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          ci_nit?: string | null
          telefono?: string | null
          direccion?: string | null
          fecha_registro?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          ci_nit?: string | null
          telefono?: string | null
          direccion?: string | null
          fecha_registro?: string
          created_at?: string
          updated_at?: string
        }
      }
      productos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio_venta: number
          codigo: string
          id_categoria: string | null
          stock_actual: number
          stock_minimo: number
          imagen_url: string | null
          estado: 'activo' | 'inactivo'
          fecha_creacion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio_venta: number
          codigo: string
          id_categoria?: string | null
          stock_actual?: number
          stock_minimo?: number
          imagen_url?: string | null
          estado?: 'activo' | 'inactivo'
          fecha_creacion?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio_venta?: number
          codigo?: string
          id_categoria?: string | null
          stock_actual?: number
          stock_minimo?: number
          imagen_url?: string | null
          estado?: 'activo' | 'inactivo'
          fecha_creacion?: string
          created_at?: string
          updated_at?: string
        }
      }
      ventas: {
        Row: {
          id: string
          fecha: string
          hora: string
          total: number
          metodo_pago: 'efectivo' | 'qr' | 'transferencia' | 'credito'
          id_cliente: string | null
          id_vendedor: string
          estado: 'completada' | 'anulada'
          fecha_vencimiento: string | null
          monto_pagado: number | null
          estado_credito: string | null
          tasa_interes: number | null
          monto_interes: number | null
          interes_eximido: boolean | null
          total_con_interes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha?: string
          hora?: string
          total: number
          metodo_pago: 'efectivo' | 'qr' | 'transferencia' | 'credito'
          id_cliente?: string | null
          id_vendedor: string
          estado?: 'completada' | 'anulada'
          fecha_vencimiento?: string | null
          monto_pagado?: number | null
          estado_credito?: string | null
          tasa_interes?: number | null
          monto_interes?: number | null
          interes_eximido?: boolean | null
          total_con_interes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          hora?: string
          total?: number
          metodo_pago?: 'efectivo' | 'qr' | 'transferencia' | 'credito'
          id_cliente?: string | null
          id_vendedor?: string
          estado?: 'completada' | 'anulada'
          fecha_vencimiento?: string | null
          monto_pagado?: number | null
          estado_credito?: string | null
          tasa_interes?: number | null
          monto_interes?: number | null
          interes_eximido?: boolean | null
          total_con_interes?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      pagos_credito: {
        Row: {
          id: string
          id_venta: string
          monto_pagado: number
          fecha_pago: string
          metodo_pago: 'efectivo' | 'qr' | 'transferencia'
          observacion: string | null
          id_usuario: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          id_venta: string
          monto_pagado: number
          fecha_pago: string
          metodo_pago: 'efectivo' | 'qr' | 'transferencia'
          observacion?: string | null
          id_usuario?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          id_venta?: string
          monto_pagado?: number
          fecha_pago?: string
          metodo_pago?: 'efectivo' | 'qr' | 'transferencia'
          observacion?: string | null
          id_usuario?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      detalle_venta: {
        Row: {
          id: string
          id_venta: string
          id_producto: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          id_venta: string
          id_producto: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          id_venta?: string
          id_producto?: string
          cantidad?: number
          precio_unitario?: number
          subtotal?: number
          created_at?: string
        }
      }
      arqueos_caja: {
        Row: {
          id: string
          fecha: string
          hora_apertura: string
          hora_cierre: string | null
          monto_inicial: number
          total_ventas: number
          efectivo_real: number | null
          diferencia: number
          id_administrador: string
          observacion: string | null
          estado: 'abierto' | 'cerrado'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha?: string
          hora_apertura?: string
          hora_cierre?: string | null
          monto_inicial?: number
          total_ventas?: number
          efectivo_real?: number | null
          diferencia?: number
          id_administrador: string
          observacion?: string | null
          estado?: 'abierto' | 'cerrado'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          hora_apertura?: string
          hora_cierre?: string | null
          monto_inicial?: number
          total_ventas?: number
          efectivo_real?: number | null
          diferencia?: number
          id_administrador?: string
          observacion?: string | null
          estado?: 'abierto' | 'cerrado'
          created_at?: string
          updated_at?: string
        }
      }
      movimientos_inventario: {
        Row: {
          id: string
          id_producto: string
          tipo_movimiento: 'entrada' | 'salida'
          cantidad: number
          motivo: 'venta' | 'ajuste' | 'compra' | 'devolución'
          fecha: string
          id_usuario: string | null
          observacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          id_producto: string
          tipo_movimiento: 'entrada' | 'salida'
          cantidad: number
          motivo: 'venta' | 'ajuste' | 'compra' | 'devolución'
          fecha?: string
          id_usuario?: string | null
          observacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          id_producto?: string
          tipo_movimiento?: 'entrada' | 'salida'
          cantidad?: number
          motivo?: 'venta' | 'ajuste' | 'compra' | 'devolución'
          fecha?: string
          id_usuario?: string | null
          observacion?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      calcular_total_ventas_arqueo: {
        Args: {
          arqueo_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}


