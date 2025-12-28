import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService, CreateSaleData } from '@/services/sales.service';
import { Sale } from '@/types';

export function useSales(filters?: {
  fechaDesde?: string;
  fechaHasta?: string;
  id_vendedor?: string;
}) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => salesService.getAll(filters),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesService.getById(id),
    enabled: !!id,
  });
}

export function useSaleDetails(id_venta: string) {
  return useQuery({
    queryKey: ['sale-details', id_venta],
    queryFn: () => salesService.getDetails(id_venta),
    enabled: !!id_venta,
  });
}

export function useTodaySales() {
  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: () => salesService.getTodaySales(),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saleData: CreateSaleData) => salesService.create(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Actualizar stock
    },
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { 
      id: string; 
      idUsuarioAnulacion?: string; 
      motivoAnulacion?: string;
    }) => salesService.cancel(params.id, params.idUsuarioAnulacion, params.motivoAnulacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Revertir stock
      queryClient.invalidateQueries({ queryKey: ['cash-register'] }); // Actualizar arqueo
    },
  });
}

export function useEximirInteres() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; eximir: boolean }) => 
      salesService.eximirInteres(params.id, params.eximir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['creditSales'] });
    },
  });
}


