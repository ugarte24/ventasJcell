import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditPaymentsService, CreateCreditPaymentData, UpdateCreditPaymentData } from '@/services/credit-payments.service';
import { CreditPayment } from '@/types';

export function useCreditPayments(id_venta?: string) {
  return useQuery({
    queryKey: ['creditPayments', id_venta],
    queryFn: () => creditPaymentsService.getAll(id_venta),
  });
}

export function useCreditPayment(id: string) {
  return useQuery({
    queryKey: ['creditPayment', id],
    queryFn: () => creditPaymentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditPaymentData) => creditPaymentsService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['creditPayments', variables.id_venta] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['creditSales'] });
    },
  });
}

export function useUpdateCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, idUsuario }: { id: string; updates: UpdateCreditPaymentData; idUsuario?: string }) => 
      creditPaymentsService.update(id, updates, idUsuario),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['creditPayment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['creditSales'] });
    },
  });
}

export function useDeleteCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditPaymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['creditSales'] });
    },
  });
}

export function useCreditPaymentsBySale(id_venta: string) {
  return useQuery({
    queryKey: ['creditPayments', id_venta],
    queryFn: () => creditPaymentsService.getBySaleId(id_venta),
    enabled: !!id_venta,
  });
}

