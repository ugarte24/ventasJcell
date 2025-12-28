import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product, PaymentMethod } from '@/types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product) => {
    // Validar que el producto esté activo
    if (product.estado !== 'activo') {
      throw new Error(`El producto "${product.nombre}" está inactivo`);
    }

    setItems(current => {
      const existingItem = current.find(item => item.id === product.id);
      const newQuantity = existingItem ? existingItem.cantidad + 1 : 1;

      // Validar stock disponible
      if (newQuantity > product.stock_actual) {
        throw new Error(
          `Stock insuficiente para "${product.nombre}". Stock disponible: ${product.stock_actual}`
        );
      }

      if (existingItem) {
        return current.map(item =>
          item.id === product.id
            ? { ...item, cantidad: newQuantity, subtotal: newQuantity * item.precio_venta }
            : item
        );
      }
      return [...current, { ...product, cantidad: 1, subtotal: product.precio_venta }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(current => current.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(current => {
      const item = current.find(i => i.id === productId);
      if (!item) return current;

      // Validar stock disponible
      if (quantity > item.stock_actual) {
        throw new Error(
          `Stock insuficiente para "${item.nombre}". Stock disponible: ${item.stock_actual}`
        );
      }

      return current.map(i =>
        i.id === productId
          ? { ...i, cantidad: quantity, subtotal: quantity * i.precio_venta }
          : i
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
