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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  FolderTree, 
  Edit, 
  MoreHorizontal, 
  Trash2,
  Loader,
  X
} from 'lucide-react';
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
  useCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  useToggleCategoryStatus
} from '@/hooks/useCategories';
import { Category } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Esquemas de validación
const createCategorySchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

const updateCategorySchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

type CreateCategoryForm = z.infer<typeof createCategorySchema>;
type UpdateCategoryForm = z.infer<typeof updateCategorySchema>;

export default function Categories() {
  const { data: categories = [], isLoading } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const toggleStatusMutation = useToggleCategoryStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const createForm = useForm<CreateCategoryForm>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      estado: 'activo',
    },
  });

  const updateForm = useForm<UpdateCategoryForm>({
    resolver: zodResolver(updateCategorySchema),
  });

  const filteredCategories = categories.filter(category =>
    category.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.descripcion && category.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginación
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Resetear página cuando cambien las categorías o el término de búsqueda
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredCategories.length, currentPage, totalPages]);

  const stats = {
    total: categories.length,
    activos: categories.filter(c => c.estado === 'activo').length,
    inactivos: categories.filter(c => c.estado === 'inactivo').length,
  };

  const handleCreateCategory = async (data: CreateCategoryForm) => {
    try {
      await createCategoryMutation.mutateAsync({
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        estado: data.estado || 'activo',
      });
      toast.success('Categoría creada exitosamente');
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (data: UpdateCategoryForm) => {
    if (!selectedCategory) return;
    try {
      await updateCategoryMutation.mutateAsync({
        id: selectedCategory.id,
        updates: data,
      });
      toast.success('Categoría actualizada exitosamente');
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      updateForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategoryMutation.mutateAsync(selectedCategory.id);
      toast.success('Categoría eliminada exitosamente');
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar categoría');
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      await toggleStatusMutation.mutateAsync(category.id);
      toast.success(`Categoría ${category.estado === 'activo' ? 'desactivada' : 'activada'} exitosamente`);
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    updateForm.reset({
      nombre: category.nombre,
      descripcion: category.descripcion || '',
      estado: category.estado,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout title="Categorías">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FolderTree className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Categorías</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-success/10 shrink-0">
                  <FolderTree className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Activas</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.activos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <FolderTree className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Inactivas</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.inactivos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="font-display">Lista de Categorías</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
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
                <span className="hidden sm:inline">Nueva Categoría</span>
                <span className="sm:hidden">Nueva</span>
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
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <div className="min-w-[500px]">
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
                    {paginatedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.descripcion || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={category.estado === 'activo' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {category.estado}
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
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(category)}
                                disabled={toggleStatusMutation.isPending}
                              >
                                {category.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(category)}
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
            )}
            {filteredCategories.length > itemsPerPage && (
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

        {/* Create Category Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={createForm.handleSubmit(handleCreateCategory)}>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear una nueva categoría en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre de la Categoría *</Label>
                  <Input
                    id="nombre"
                    {...createForm.register('nombre')}
                    placeholder="Ej: Bebidas"
                  />
                  {createForm.formState.errors.nombre && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.nombre.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    {...createForm.register('descripcion')}
                    placeholder="Descripción de la categoría (opcional)"
                    rows={3}
                  />
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
                <Button type="submit" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Categoría'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={updateForm.handleSubmit(handleUpdateCategory)}>
              <DialogHeader>
                <DialogTitle>Editar Categoría</DialogTitle>
                <DialogDescription>
                  Modifica los datos de la categoría.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nombre">Nombre de la Categoría *</Label>
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
                  <Label htmlFor="edit-descripcion">Descripción</Label>
                  <Textarea
                    id="edit-descripcion"
                    {...updateForm.register('descripcion')}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-estado">Estado</Label>
                  <Select
                    value={updateForm.watch('estado') || selectedCategory?.estado}
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
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? (
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

        {/* Delete Category Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la categoría{' '}
                <strong>{selectedCategory?.nombre}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteCategoryMutation.isPending}
              >
                {deleteCategoryMutation.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
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

