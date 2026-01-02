import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Users as UsersIcon, 
  Shield, 
  User, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Key,
  Search,
  Loader,
  X
} from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus, useUpdateUserPassword } from '@/hooks/useUsers';
import { usersService } from '@/services/users.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserType, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Esquemas de validación
const createUserSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['admin', 'vendedor', 'minorista', 'mayorista']),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

const updateUserSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  rol: z.enum(['admin', 'vendedor', 'minorista', 'mayorista']).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();
  const updatePasswordMutation = useUpdateUserPassword();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nombre: '',
      usuario: '',
      email: '',
      password: '',
      rol: 'vendedor',
      estado: 'activo',
    },
  });

  const updateForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  const passwordForm = useForm<{ newPassword: string; confirmPassword: string }>({
    resolver: zodResolver(z.object({
      newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
      confirmPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    })),
  });

  const filteredUsers = useMemo(() => 
    users.filter(u =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.usuario.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]
  );

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = {
    total: users.length,
    admins: users.filter(u => u.rol === 'admin').length,
    vendedores: users.filter(u => u.rol === 'vendedor').length,
    activos: users.filter(u => u.estado === 'activo').length,
  };

  const handleCreateUser = async (data: CreateUserForm) => {
    try {
      await createUserMutation.mutateAsync({
        nombre: data.nombre,
        usuario: data.usuario,
        email: data.email,
        password: data.password,
        rol: data.rol,
        estado: data.estado || 'activo',
      });
      toast.success('Usuario creado exitosamente');
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      // Verificar si el error es de permisos
      if (error.message?.includes('permission') || error.message?.includes('permiso') || error.message?.includes('403') || error.message?.includes('406')) {
        toast.error('No tienes permisos para realizar esta acción. Verifica que seas administrador.');
      } else if (error.message?.includes('already exists') || error.message?.includes('ya existe')) {
        toast.error('El usuario o email ya existe');
      } else {
        toast.error(error.message || 'Error al crear usuario');
      }
    }
  };

  const handleUpdateUser = async (data: UpdateUserForm) => {
    if (!selectedUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        updates: data,
      });
      toast.success('Usuario actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      updateForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUserMutation.mutateAsync(selectedUser.id);
      toast.success('Usuario eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario');
    }
  };

  const handleToggleStatus = async (user: UserType) => {
    try {
      await toggleStatusMutation.mutateAsync(user.id);
      toast.success(`Usuario ${user.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`);
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const handleUpdatePassword = async (data: { newPassword: string; confirmPassword: string }) => {
    if (!selectedUser) return;
    try {
      await updatePasswordMutation.mutateAsync({
        id: selectedUser.id,
        newPassword: data.newPassword,
      });
      toast.success('Contraseña actualizada exitosamente');
      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar contraseña');
    }
  };

  const openEditDialog = async (user: UserType) => {
    setSelectedUser(user);
    // Intentar obtener el email del usuario
    let userEmail = user.email || '';
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        updateForm.reset({
          nombre: user.nombre,
          usuario: user.usuario,
          email: userEmail,
          rol: user.rol,
          estado: user.estado,
        });
        setIsEditDialogOpen(true);
        return;
      }

      // Obtener rol del usuario actual
      const { data: currentUserData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', currentUser.id)
        .single();

      const isAdmin = currentUserData?.rol === 'admin';
      const isOwnUser = currentUser.id === user.id;
      
      // Si es el usuario actual, usar su email directamente
      if (isOwnUser && currentUser.email) {
        userEmail = currentUser.email;
      } 
      // Si es administrador, usar la Edge Function para obtener el email de cualquier usuario
      else if (isAdmin) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('get-user-email', {
            body: {
              userId: user.id,
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!functionError && functionData?.email) {
            userEmail = functionData.email;
          } else {
            console.warn('No se pudo obtener el email mediante Edge Function:', functionError);
          }
        }
      }
      // Si no es admin ni el usuario actual, intentar obtener con getById (solo funcionará para el usuario actual)
      else {
        const userWithEmail = await usersService.getById(user.id);
        if (userWithEmail?.email) {
          userEmail = userWithEmail.email;
        }
      }
    } catch (error) {
      // Si no se puede obtener el email, usar el que ya está en el objeto o dejar vacío
      console.warn('No se pudo obtener el email del usuario:', error);
    }
    
    updateForm.reset({
      nombre: user.nombre,
      usuario: user.usuario,
      email: userEmail,
      rol: user.rol,
      estado: user.estado,
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: UserType) => {
    setSelectedUser(user);
    passwordForm.reset();
    setIsPasswordDialogOpen(true);
  };

  const openDeleteDialog = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout title="Gestión de Usuarios">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4 animate-fade-in">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usuarios</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.admins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedores Tienda</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.vendedores}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.activos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="font-display">Lista de Usuarios</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button 
                className="gap-2 w-full sm:w-auto"
                onClick={() => {
                  createForm.reset();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Usuario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {user.nombre.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.nombre}</p>
                              <p className="text-sm text-muted-foreground">@{user.usuario}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.rol === 'admin' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {user.rol === 'admin' ? (
                              <><Shield className="mr-1 h-3 w-3" /> Admin</>
                            ) : user.rol === 'vendedor' ? (
                              <><User className="mr-1 h-3 w-3" /> Vendedor Tienda</>
                            ) : user.rol === 'minorista' ? (
                              <><User className="mr-1 h-3 w-3" /> Minorista</>
                            ) : (
                              <><User className="mr-1 h-3 w-3" /> Mayorista</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.estado === 'activo' ? 'default' : 'secondary'}
                            className={user.estado === 'activo' ? 'bg-success' : ''}
                          >
                            {user.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Cambiar Contraseña
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(user)}
                                disabled={toggleStatusMutation.isPending}
                              >
                                {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(user)}
                                className="text-destructive"
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} usuarios
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Mostrar primera página, última página, página actual y páginas adyacentes
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={createForm.handleSubmit(handleCreateUser)}>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear un nuevo usuario en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    {...createForm.register('nombre')}
                    placeholder="Juan Pérez"
                  />
                  {createForm.formState.errors.nombre && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.nombre.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="usuario">Nombre de Usuario</Label>
                  <Input
                    id="usuario"
                    {...createForm.register('usuario')}
                    placeholder="juan.perez"
                  />
                  {createForm.formState.errors.usuario && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.usuario.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...createForm.register('email')}
                    placeholder="juan@example.com"
                  />
                  {createForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    {...createForm.register('password')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {createForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select
                    value={createForm.watch('rol')}
                    onValueChange={(value) => createForm.setValue('rol', value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor Tienda</SelectItem>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={createForm.watch('estado') || 'activo'}
                    onValueChange={(value) => createForm.setValue('estado', value as 'activo' | 'inactivo')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={updateForm.handleSubmit(handleUpdateUser)}>
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                  Modifica los datos del usuario.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nombre">Nombre Completo</Label>
                  <Input
                    id="edit-nombre"
                    {...updateForm.register('nombre')}
                  />
                  {updateForm.formState.errors.nombre && (
                    <p className="text-sm text-destructive">
                      {updateForm.formState.errors.nombre?.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-usuario">Nombre de Usuario</Label>
                  <Input
                    id="edit-usuario"
                    {...updateForm.register('usuario')}
                  />
                  {updateForm.formState.errors.usuario && (
                    <p className="text-sm text-destructive">
                      {updateForm.formState.errors.usuario?.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    {...updateForm.register('email')}
                    placeholder="usuario@example.com"
                    disabled={currentUser?.rol !== 'admin' && selectedUser?.id !== currentUser?.id}
                  />
                  {updateForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {updateForm.formState.errors.email?.message}
                    </p>
                  )}
                  {currentUser?.rol !== 'admin' && selectedUser?.id !== currentUser?.id && (
                    <p className="text-xs text-muted-foreground">
                      Solo los administradores pueden editar el email de otros usuarios
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-rol">Rol</Label>
                  <Select
                    value={updateForm.watch('rol') || selectedUser?.rol}
                    onValueChange={(value) => updateForm.setValue('rol', value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor Tienda</SelectItem>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-estado">Estado</Label>
                  <Select
                    value={updateForm.watch('estado') || selectedUser?.estado}
                    onValueChange={(value) => updateForm.setValue('estado', value as 'activo' | 'inactivo')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}>
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogDescription>
                  Ingresa la nueva contraseña para {selectedUser?.nombre}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register('newPassword')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    placeholder="Repite la contraseña"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatePasswordMutation.isPending}>
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Contraseña'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{' '}
                <strong>{selectedUser?.nombre}</strong> y todos sus datos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
