import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  inventoryMovementsService, 
  InventoryMovement, 
  CreateInventoryMovementData 
} from '@/services/inventory-movements.service';

export function useInventoryMovements(filters?: {
  fechaDesde?: string;
  fechaHasta?: string;
  id_producto?: string;
  tipo_movimiento?: 'entrada' | 'salida';
  motivo?: 'venta' | 'ajuste' | 'compra' | 'devolución';
}) {
  return useQuery({
    queryKey: ['inventoryMovements', filters],
    queryFn: () => inventoryMovementsService.getAll(filters),
  });
}

export function useInventoryMovement(id: string) {
  return useQuery({
    queryKey: ['inventoryMovement', id],
    queryFn: () => inventoryMovementsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (movementData: CreateInventoryMovementData) =>
      inventoryMovementsService.create(movementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Actualizar stock
      queryClient.invalidateQueries({ queryKey: ['product'] }); // Actualizar producto individual
    },
  });
}

export function useUpdateInventoryMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateInventoryMovementData> }) =>
      inventoryMovementsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovement'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Actualizar stock
      queryClient.invalidateQueries({ queryKey: ['product'] }); // Actualizar producto individual
    },
  });
}

export function useCancelInventoryMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { 
      id: string; 
      idUsuarioAnulacion?: string; 
      motivoAnulacion?: string;
    }) => inventoryMovementsService.cancel(
      params.id, 
      params.idUsuarioAnulacion, 
      params.motivoAnulacion
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovement'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Actualizar stock
      queryClient.invalidateQueries({ queryKey: ['product'] }); // Actualizar producto individual
    },
  });
}

