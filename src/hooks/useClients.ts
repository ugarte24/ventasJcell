import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsService } from '@/services/clients.service';
import { Client } from '@/types';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsService.getAll(),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsService.getById(id),
    enabled: !!id,
  });
}

export function useSearchClients(query: string) {
  return useQuery({
    queryKey: ['clients', 'search', query],
    queryFn: () => clientsService.search(query),
    enabled: query.length > 0,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (client: Omit<Client, 'id' | 'fecha_registro'>) =>
      clientsService.create(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Client> }) =>
      clientsService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}


