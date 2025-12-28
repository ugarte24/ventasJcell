import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Users, 
  Edit, 
  MoreHorizontal, 
  Trash2,
  Loader,
  X
} from 'lucide-react';
import { 
  useClients, 
  useCreateClient, 
  useUpdateClient, 
  useDeleteClient
} from '@/hooks/useClients';
import { Client } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Esquemas de validación
const createClientSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  ci_nit: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

const updateClientSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  ci_nit: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

type CreateClientForm = z.infer<typeof createClientSchema>;
type UpdateClientForm = z.infer<typeof updateClientSchema>;

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const createForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      nombre: '',
      ci_nit: '',
      telefono: '',
      direccion: '',
    },
  });

  const updateForm = useForm<UpdateClientForm>({
    resolver: zodResolver(updateClientSchema),
  });

  const filteredClients = useMemo(() => 
    clients.filter(client =>
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.ci_nit && client.ci_nit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.telefono && client.telefono.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [clients, searchTerm]
  );

  // Paginación
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = {
    total: clients.length,
  };

  const handleCreateClient = async (data: CreateClientForm) => {
    try {
      await createClientMutation.mutateAsync({
        nombre: data.nombre,
        ci_nit: data.ci_nit || undefined,
        telefono: data.telefono || undefined,
        direccion: data.direccion || undefined,
      });
      toast.success('Cliente creado exitosamente');
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cliente');
    }
  };

  const handleUpdateClient = async (data: UpdateClientForm) => {
    if (!selectedClient) return;
    try {
      await updateClientMutation.mutateAsync({
        id: selectedClient.id,
        updates: data,
      });
      toast.success('Cliente actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      updateForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar cliente');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      await deleteClientMutation.mutateAsync(selectedClient.id);
      toast.success('Cliente eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar cliente');
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    updateForm.reset({
      nombre: client.nombre,
      ci_nit: client.ci_nit || '',
      telefono: client.telefono || '',
      direccion: client.direccion || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout title="Gestión de Clientes">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Clientes</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="font-display">Lista de Clientes</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CI/NIT o teléfono..."
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
                <span className="hidden sm:inline">Nuevo Cliente</span>
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
            ) : paginatedClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>CI/NIT</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                              {client.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{client.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                Registrado: {new Date(client.fecha_registro).toLocaleDateString('es-BO')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.ci_nit || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.telefono || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.direccion || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(client)}
                                className="text-destructive"
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
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredClients.length)} de {filteredClients.length} clientes
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

        {/* Create Client Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Ingresa la información del nuevo cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(handleCreateClient)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  {...createForm.register('nombre')}
                  placeholder="Nombre completo del cliente"
                />
                {createForm.formState.errors.nombre && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.nombre.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci_nit">CI/NIT</Label>
                <Input
                  id="ci_nit"
                  {...createForm.register('ci_nit')}
                  placeholder="Cédula de identidad o NIT"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  {...createForm.register('telefono')}
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Textarea
                  id="direccion"
                  {...createForm.register('direccion')}
                  placeholder="Dirección del cliente"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    createForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Cliente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Modifica la información del cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateForm.handleSubmit(handleUpdateClient)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  {...updateForm.register('nombre')}
                  placeholder="Nombre completo del cliente"
                />
                {updateForm.formState.errors.nombre && (
                  <p className="text-sm text-destructive">
                    {updateForm.formState.errors.nombre.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ci_nit">CI/NIT</Label>
                <Input
                  id="edit-ci_nit"
                  {...updateForm.register('ci_nit')}
                  placeholder="Cédula de identidad o NIT"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  {...updateForm.register('telefono')}
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-direccion">Dirección</Label>
                <Textarea
                  id="edit-direccion"
                  {...updateForm.register('direccion')}
                  placeholder="Dirección del cliente"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedClient(null);
                    updateForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Client Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el cliente{' '}
                <strong>{selectedClient?.nombre}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClient}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteClientMutation.isPending}
              >
                {deleteClientMutation.isPending && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

