import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts";
import { CartProvider } from "@/contexts/CartContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";
import SalesHistory from "./pages/SalesHistory";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Clients from "./pages/Clients";
import CashRegister from "./pages/CashRegister";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import InventoryMovements from "./pages/InventoryMovements";
import CreditSales from "./pages/CreditSales";
import Servicios from "./pages/Servicios";
import ServiciosRegistro from "./pages/ServiciosRegistro";
import ServiciosHistorial from "./pages/ServiciosHistorial";
import PreregistrosMinorista from "./pages/PreregistrosMinorista";
import PreregistrosMayorista from "./pages/PreregistrosMayorista";
import ControlVentas from "./pages/ControlVentas";
import EscanearQR from "./pages/EscanearQR";
import Pedidos from "./pages/Pedidos";
import AdminPedidos from "./pages/AdminPedidos";
import ArqueosMinoristas from "./pages/ArqueosMinoristas";
import ArqueosMayoristas from "./pages/ArqueosMayoristas";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster key="shadcn-toaster" />
          <Sonner key="sonner-toaster" />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ventas/nueva" element={<NewSale />} />
              <Route path="/ventas" element={<SalesHistory />} />
              <Route path="/productos" element={<Products />} />
              <Route path="/categorias" element={<Categories />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/arqueo" element={<CashRegister />} />
              <Route path="/inventario/movimientos" element={<InventoryMovements />} />
              <Route path="/creditos" element={<CreditSales />} />
              <Route path="/servicios" element={<Servicios />} />
              <Route path="/servicios/registro" element={<ServiciosRegistro />} />
              <Route path="/servicios/historial" element={<ServiciosHistorial />} />
              <Route path="/reportes" element={<Reports />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/preregistros/minorista" element={<PreregistrosMinorista />} />
              <Route path="/preregistros/mayorista" element={<PreregistrosMayorista />} />
              <Route path="/control-ventas" element={<ControlVentas />} />
              <Route path="/pagos-mayoristas" element={<Navigate to="/control-ventas" replace />} />
              <Route path="/escanear-qr" element={<EscanearQR />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/admin/pedidos" element={<AdminPedidos />} />
              <Route path="/arqueos/minorista" element={<ArqueosMinoristas />} />
              <Route path="/arqueos/mayorista" element={<ArqueosMayoristas />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
