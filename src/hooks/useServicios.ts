import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviciosService } from '@/services/servicios.service';
import { Servicio, CreateMovimientoServicioData, CreateRegistroServicioData } from '@/types';
import { toast } from 'sonner';

// ============ SERVICIOS ============

export function useServicios(includeInactive = false) {
  return useQuery({
    queryKey: ['servicios', includeInactive],
    queryFn: () => serviciosService.getAllServicios(includeInactive),
  });
}

export function useServicio(id: string) {
  return useQuery({
    queryKey: ['servicio', id],
    queryFn: () => serviciosService.getServicioById(id),
    enabled: !!id,
  });
}

export function useCreateServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (servicio: Omit<Servicio, 'id' | 'created_at' | 'updated_at'>) =>
      serviciosService.createServicio(servicio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      toast.success('Servicio creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear el servicio');
    },
  });
}

export function useUpdateServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Servicio, 'id' | 'created_at' | 'updated_at'>> }) =>
      serviciosService.updateServicio(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      queryClient.invalidateQueries({ queryKey: ['servicio', variables.id] });
      toast.success('Servicio actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el servicio');
    },
  });
}

export function useDeleteServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => serviciosService.deleteServicio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      toast.success('Servicio eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el servicio');
    },
  });
}

// ============ MOVIMIENTOS ============

export function useMovimientosServicios(filters?: {
  id_servicio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  return useQuery({
    queryKey: ['movimientos-servicios', filters],
    queryFn: () => serviciosService.getAllMovimientos(filters),
  });
}

export function useMovimientoServicio(id: string) {
  return useQuery({
    queryKey: ['movimiento-servicio', id],
    queryFn: () => serviciosService.getMovimientoById(id),
    enabled: !!id,
  });
}

export function useCreateMovimientoServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movimientoData: CreateMovimientoServicioData) =>
      serviciosService.createMovimiento(movimientoData),
    onSuccess: async (_, variables) => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['movimientos-servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['servicio', variables.id_servicio], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de movimientos y registros
      await queryClient.refetchQueries({ queryKey: ['movimientos-servicios'] });
      await queryClient.refetchQueries({ queryKey: ['registros-servicios'] });
      
      toast.success('Saldo aumentado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al aumentar el saldo');
    },
  });
}

export function useUpdateMovimientoServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { monto: number; observacion?: string } }) =>
      serviciosService.updateMovimiento(id, updates),
    onSuccess: async (_, variables) => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['movimientos-servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de movimientos
      await queryClient.refetchQueries({ queryKey: ['movimientos-servicios'] });
      
      toast.success('Movimiento actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el movimiento');
    },
  });
}

export function useDeleteMovimientoServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => serviciosService.deleteMovimiento(id),
    onSuccess: async () => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['movimientos-servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de movimientos y registros
      await queryClient.refetchQueries({ queryKey: ['movimientos-servicios'] });
      await queryClient.refetchQueries({ queryKey: ['registros-servicios'] });
      
      toast.success('Movimiento eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el movimiento');
    },
  });
}

// ============ REGISTROS ============

export function useRegistrosServicios(filters?: {
  id_servicio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  return useQuery({
    queryKey: ['registros-servicios', filters],
    queryFn: () => serviciosService.getAllRegistros(filters),
  });
}

export function useRegistroServicio(id: string) {
  return useQuery({
    queryKey: ['registro-servicio', id],
    queryFn: () => serviciosService.getRegistroById(id),
    enabled: !!id,
  });
}

export function useRegistroServicioPorFecha(id_servicio: string, fecha: string) {
  return useQuery({
    queryKey: ['registro-servicio-fecha', id_servicio, fecha],
    queryFn: () => serviciosService.getRegistroPorFecha(id_servicio, fecha),
    enabled: !!id_servicio && !!fecha,
  });
}

export function useCreateRegistroServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registroData: CreateRegistroServicioData) =>
      serviciosService.createRegistro(registroData),
    onSuccess: async (_, variables) => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['registro-servicio-fecha', variables.id_servicio, variables.fecha], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de registros
      await queryClient.refetchQueries({ queryKey: ['registros-servicios'] });
      
      toast.success('Registro creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear el registro');
    },
  });
}

export function useUpdateRegistroServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<any, 'id' | 'created_at' | 'updated_at'>> }) =>
      serviciosService.updateRegistro(id, updates),
    onSuccess: async () => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de registros
      await queryClient.refetchQueries({ queryKey: ['registros-servicios'] });
      
      toast.success('Registro actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el registro');
    },
  });
}

export function useDeleteRegistroServicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => serviciosService.deleteRegistro(id),
    onSuccess: async () => {
      // Invalidar y refetch todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['registros-servicios'], refetchType: 'active' });
      
      // Forzar refetch de todas las queries de registros
      await queryClient.refetchQueries({ queryKey: ['registros-servicios'] });
      
      toast.success('Registro eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el registro');
    },
  });
}

