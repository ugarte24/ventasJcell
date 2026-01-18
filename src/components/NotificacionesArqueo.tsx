import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bell, CheckCircle, X } from 'lucide-react';
import { notificacionesArqueoService } from '@/services/notificaciones-arqueo.service';
import { toast } from 'sonner';
import { useMemo } from 'react';

export function NotificacionesArqueo() {
  const queryClient = useQueryClient();

  // Obtener notificaciones pendientes
  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones-arqueo-pendientes'],
    queryFn: async () => {
      return await notificacionesArqueoService.getPendientes();
    },
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
  });

  // Marcar como vista
  const marcarVistaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await notificacionesArqueoService.marcarComoVista(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-arqueo-pendientes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al marcar notificación');
    },
  });

  // Marcar como resuelta
  const marcarResueltaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await notificacionesArqueoService.marcarComoResuelta(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-arqueo-pendientes'] });
      toast.success('Notificación marcada como resuelta');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al marcar notificación');
    },
  });

  // Agrupar notificaciones por mayorista
  const notificacionesPorMayorista = useMemo(() => {
    const agrupadas = new Map<string, typeof notificaciones>();
    notificaciones.forEach(notif => {
      const key = notif.id_mayorista;
      if (!agrupadas.has(key)) {
        agrupadas.set(key, []);
      }
      agrupadas.get(key)!.push(notif);
    });
    return Array.from(agrupadas.entries()).map(([idMayorista, notifs]) => ({
      idMayorista,
      mayorista: notifs[0].mayorista,
      notificaciones: notifs,
      diasMaximos: Math.max(...notifs.map(n => n.dias_sin_arqueo)),
    }));
  }, [notificaciones]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Arqueo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (notificaciones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Arqueo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No hay notificaciones pendientes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Arqueo
            <Badge variant="destructive">{notificaciones.length}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificacionesPorMayorista.map(({ idMayorista, mayorista, notificaciones: notifs, diasMaximos }) => (
          <div
            key={idMayorista}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-semibold">
                    {mayorista?.nombre || 'Mayorista desconocido'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Último arqueo: {notifs[0].fecha_ultimo_arqueo 
                      ? new Date(notifs[0].fecha_ultimo_arqueo).toLocaleDateString('es-BO')
                      : 'Nunca'}
                  </p>
                </div>
              </div>
              <Badge variant={diasMaximos > 3 ? 'destructive' : 'default'}>
                {diasMaximos} {diasMaximos === 1 ? 'día' : 'días'} sin arqueo
              </Badge>
            </div>
            <div className="flex gap-2 mt-3">
              {notifs.map(notif => (
                <div key={notif.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>• {notif.dias_sin_arqueo} {notif.dias_sin_arqueo === 1 ? 'día' : 'días'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => marcarVistaMutation.mutate(notifs[0].id)}
                disabled={marcarVistaMutation.isPending}
              >
                Marcar como vista
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => marcarResueltaMutation.mutate(notifs[0].id)}
                disabled={marcarResueltaMutation.isPending}
              >
                Marcar como resuelta
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
