import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegisterService } from '@/services/cash-register.service';
import { CashRegister } from '@/types';

export function useOpenRegister() {
  return useQuery({
    queryKey: ['cashRegister', 'open'],
    queryFn: () => cashRegisterService.getOpenRegister(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useCashRegisters() {
  return useQuery({
    queryKey: ['cashRegisters'],
    queryFn: () => cashRegisterService.getAll(),
  });
}

export function useCashRegister(id: string) {
  return useQuery({
    queryKey: ['cashRegister', id],
    queryFn: () => cashRegisterService.getById(id),
    enabled: !!id,
  });
}

export function useTodayCashSales() {
  return useQuery({
    queryKey: ['todayCashSales'],
    queryFn: () => cashRegisterService.getTodayCashSales(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useTodayTotalSales() {
  return useQuery({
    queryKey: ['todayTotalSales'],
    queryFn: () => cashRegisterService.getTodayTotalSales(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useTodaySalesByMethod() {
  return useQuery({
    queryKey: ['todaySalesByMethod'],
    queryFn: () => cashRegisterService.getTodaySalesByMethod(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useTodayCreditReceipts() {
  return useQuery({
    queryKey: ['todayCreditReceipts'],
    queryFn: () => cashRegisterService.getTodayCreditReceipts(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useTodayServicesTotal() {
  return useQuery({
    queryKey: ['todayServicesTotal'],
    queryFn: () => cashRegisterService.getTodayServicesTotal(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

export function useOpenCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ montoInicial, idAdministrador }: { montoInicial: number; idAdministrador: string }) =>
      cashRegisterService.openRegister(montoInicial, idAdministrador),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister'] });
      queryClient.invalidateQueries({ queryKey: ['todayCashSales'] });
      queryClient.invalidateQueries({ queryKey: ['todayTotalSales'] });
    },
  });
}

export function useCloseCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, efectivoReal, observacion }: { id: string; efectivoReal: number; observacion?: string }) =>
      cashRegisterService.closeRegister(id, efectivoReal, observacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister'] });
      queryClient.invalidateQueries({ queryKey: ['cashRegisters'] });
      queryClient.invalidateQueries({ queryKey: ['todayCashSales'] });
      queryClient.invalidateQueries({ queryKey: ['todayTotalSales'] });
    },
  });
}

export function useUpdateSalesTotal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cashRegisterService.updateSalesTotal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister'] });
    },
  });
}

export function useUpdateCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof cashRegisterService.update>[1] }) =>
      cashRegisterService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister'] });
      queryClient.invalidateQueries({ queryKey: ['cashRegisters'] });
      queryClient.invalidateQueries({ queryKey: ['cashRegister', variables.id] });
    },
  });
}

