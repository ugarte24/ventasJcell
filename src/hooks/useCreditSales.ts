import { useQuery } from '@tanstack/react-query';
import { salesService } from '@/services/sales.service';
import { Sale } from '@/types';

export function useCreditSales(filters?: {
  estado_credito?: 'pendiente' | 'pagado' | 'parcial' | 'vencido';
  id_cliente?: string;
}) {
  return useQuery<Sale[]>({
    queryKey: ['creditSales', filters],
    queryFn: () => salesService.getCreditSales(filters),
  });
}

