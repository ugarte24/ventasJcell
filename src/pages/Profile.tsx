import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts';
import { useUpdateUserPassword } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { Loader, Lock, User as UserIcon } from 'lucide-react';

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function Profile() {
  const { user } = useAuth();
  const updatePasswordMutation = useUpdateUserPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleChangePassword = async (data: ChangePasswordForm) => {
    if (!user) {
      toast.error('No se pudo obtener la información del usuario');
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        id: user.id,
        newPassword: data.newPassword,
      });
      toast.success('Contraseña actualizada exitosamente');
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar contraseña');
    }
  };

  return (
    <DashboardLayout title="Mi Perfil">
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Información del Usuario */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-lg">
                {user?.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>Información del Usuario</CardTitle>
                <CardDescription>Datos de tu cuenta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user?.nombre}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Usuario</Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user?.usuario}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                <span className="text-sm capitalize">{user?.rol}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu nueva contraseña"
                    {...passwordForm.register('newPassword')}
                    className={passwordForm.formState.errors.newPassword ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <span className="text-xs text-muted-foreground">Ocultar</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mostrar</span>
                    )}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite tu nueva contraseña"
                    {...passwordForm.register('confirmPassword')}
                    className={passwordForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <span className="text-xs text-muted-foreground">Ocultar</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mostrar</span>
                    )}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => passwordForm.reset()}
                  disabled={updatePasswordMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatePasswordMutation.isPending}>
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Actualizar Contraseña
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
