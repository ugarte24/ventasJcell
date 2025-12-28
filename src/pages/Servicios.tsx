import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Plus, 
  Edit, 
  Loader,
  X,
  Search
} from 'lucide-react';
import { 
  useServicios, 
  useCreateServicio, 
  useUpdateServicio
} from '@/hooks/useServicios';
import { useAuth } from '@/contexts';
import { Servicio } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Esquemas de validación
const createServicioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
});

const editServicioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']),
});

type CreateServicioForm = z.infer<typeof createServicioSchema>;
type EditServicioForm = z.infer<typeof editServicioSchema>;

export default function Servicios() {
  const { user } = useAuth();
  const { data: servicios, isLoading } = useServicios(user?.rol === 'admin');
  const createServicio = useCreateServicio();
  const updateServicio = useUpdateServicio();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const createForm = useForm<CreateServicioForm>({
    resolver: zodResolver(createServicioSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

  const editForm = useForm<EditServicioForm>({
    resolver: zodResolver(editServicioSchema),
  });

  // Filtrar servicios por término de búsqueda
  const filteredServicios = servicios?.filter((servicio) =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);

  // Resetear página cuando cambien los servicios o el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredServicios.length, currentPage, totalPages]);

  const handleCreateServicio = async (data: CreateServicioForm) => {
    try {
      // Solo enviar nombre y descripción, el estado será 'activo' por defecto
      await createServicio.mutateAsync({
        nombre: data.nombre,
        descripcion: data.descripcion,
        estado: 'activo',
      });
      setShowCreateDialog(false);
      createForm.reset();
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  const handleEditServicio = async (data: EditServicioForm) => {
    if (!selectedServicio) return;

    try {
      await updateServicio.mutateAsync({
        id: selectedServicio.id,
        updates: {
          nombre: data.nombre,
          descripcion: data.descripcion,
          estado: data.estado,
        },
      });
      setShowEditDialog(false);
      setSelectedServicio(null);
      editForm.reset();
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };


  const handleOpenEditDialog = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    editForm.reset({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      estado: servicio.estado,
    });
    setShowEditDialog(true);
  };

  const isAdmin = user?.rol === 'admin';

  return (
    <DashboardLayout title="Servicios">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Servicios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona los servicios y sus saldos
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Servicio
            </Button>
          )}
        </div>

        {/* Buscador */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Servicios */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredServicios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No se encontraron servicios' : 'No hay servicios registrados'}
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedServicios.map((servicio) => (
                      <TableRow key={servicio.id}>
                        <TableCell className="font-medium">{servicio.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {servicio.descripcion || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={servicio.estado === 'activo' ? 'default' : 'secondary'}>
                            {servicio.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditDialog(servicio)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredServicios.length > itemsPerPage && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
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
                        onClick={() => {
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Crear Servicio */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Servicio</DialogTitle>
            <DialogDescription>
              Crea un nuevo tipo de servicio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateServicio)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                {...createForm.register('nombre')}
                placeholder="Ej: Recarga, Agente BCP"
              />
              {createForm.formState.errors.nombre && (
                <p className="text-sm text-destructive">
                  {createForm.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                {...createForm.register('descripcion')}
                placeholder="Descripción del servicio"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  createForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createServicio.isPending}>
                {createServicio.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Crear Servicio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Servicio */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
            <DialogDescription>
              Modifica la información del servicio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditServicio)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                {...editForm.register('nombre')}
              />
              {editForm.formState.errors.nombre && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                {...editForm.register('descripcion')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-estado">Estado</Label>
              <select
                id="edit-estado"
                {...editForm.register('estado')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedServicio(null);
                  editForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateServicio.isPending}>
                {updateServicio.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

