import { useState, useMemo, useEffect } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Package, 
  Edit, 
  MoreHorizontal, 
  Trash2,
  PackageX,
  Loader,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useAdjustStock,
  useToggleProductStatus
} from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts';
import { Product } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { storageService } from '@/services/storage.service';
import { cn } from '@/lib/utils';

// Esquemas de validación
const createProductSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
  precio_venta: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  codigo: z.string().min(1, 'El código es requerido'),
  id_categoria: z.string().optional(),
  stock_actual: z.number().min(0, 'El stock no puede ser negativo').default(0),
  stock_minimo: z.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

const updateProductSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  descripcion: z.string().optional(),
  precio_venta: z.number().min(0.01, 'El precio debe ser mayor a 0').optional(),
  codigo: z.string().min(1, 'El código es requerido').optional(),
  id_categoria: z.string().optional(),
  stock_minimo: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

const adjustStockSchema = z.object({
  nuevoStock: z.number().min(0, 'El stock no puede ser negativo'),
});

type CreateProductForm = z.infer<typeof createProductSchema>;
type UpdateProductForm = z.infer<typeof updateProductSchema>;
type AdjustStockForm = z.infer<typeof adjustStockSchema>;

export default function Products() {
  const { user } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const adjustStockMutation = useAdjustStock();
  const toggleStatusMutation = useToggleProductStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [editCategorySearchTerm, setEditCategorySearchTerm] = useState('');

  // Filtrar categorías por término de búsqueda
  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return categories;
    return categories.filter((cat) =>
      cat.nombre.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  }, [categories, categorySearchTerm]);

  const filteredEditCategories = useMemo(() => {
    if (!editCategorySearchTerm) return categories;
    return categories.filter((cat) =>
      cat.nombre.toLowerCase().includes(editCategorySearchTerm.toLowerCase())
    );
  }, [categories, editCategorySearchTerm]);
  
  // Estados para imagen en creación
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Estados para imagen en edición
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);

  const createForm = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      precio_venta: 0,
      codigo: '',
      id_categoria: undefined,
      stock_actual: 0,
      stock_minimo: 0,
      estado: 'activo',
    },
  });

  const updateForm = useForm<UpdateProductForm>({
    resolver: zodResolver(updateProductSchema),
  });

  const stockForm = useForm<AdjustStockForm>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      nuevoStock: 0,
    },
  });

  const filteredProducts = useMemo(() => 
    products.filter(product =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    ), [products, searchTerm]
  );

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = {
    total: products.length,
    activos: products.filter(p => p.estado === 'activo').length,
    stockBajo: products.filter(p => p.stock_actual <= p.stock_minimo && p.estado === 'activo').length,
  };

  const handleCreateProduct = async (data: CreateProductForm) => {
    try {
      setIsUploadingImage(true);
      
      // Primero crear el producto sin imagen para obtener el ID
      const newProduct = await createProductMutation.mutateAsync({
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        precio_venta: data.precio_venta,
        codigo: data.codigo,
        id_categoria: data.id_categoria || undefined,
        stock_actual: data.stock_actual,
        stock_minimo: data.stock_minimo,
        estado: data.estado || 'activo',
      });

      // Si hay una imagen seleccionada, subirla después de crear el producto
      if (selectedImage && newProduct.id) {
        try {
          const imagenUrl = await storageService.uploadProductImage(selectedImage, newProduct.id);
          
          // Actualizar el producto con la URL de la imagen
          await updateProductMutation.mutateAsync({
            id: newProduct.id,
            updates: { imagen_url: imagenUrl },
          });
        } catch (uploadError: any) {
          console.error('Error al subir imagen:', uploadError);
          toast.error(`Producto creado pero error al subir imagen: ${uploadError.message || 'Error desconocido'}`);
        }
      }

      toast.success('Producto creado exitosamente');
      setIsCreateDialogOpen(false);
      createForm.reset();
      setSelectedImage(null);
      setImagePreview(null);
      setIsUploadingImage(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear producto');
      setIsUploadingImage(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }

      setSelectedImage(file);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleUpdateProduct = async (data: UpdateProductForm) => {
    if (!selectedProduct) return;
    try {
      setIsUploadingEditImage(true);
      
      let imagenUrl: string | undefined = undefined;
      let imagenAnterior: string | null = null;

      // Si hay una nueva imagen seleccionada, subirla
      if (editSelectedImage) {
        try {
          imagenUrl = await storageService.uploadProductImage(editSelectedImage, selectedProduct.id);
          imagenAnterior = selectedProduct.imagen_url || null;
        } catch (uploadError: any) {
          console.error('Error al subir imagen:', uploadError);
          toast.error(`Error al subir imagen: ${uploadError.message || 'Error desconocido'}`);
          setIsUploadingEditImage(false);
          return;
        }
      }

      // Actualizar el producto
      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        updates: {
          ...data,
          ...(imagenUrl && { imagen_url: imagenUrl }),
        },
      });

      // Si se subió una nueva imagen y había una anterior, eliminar la anterior
      if (imagenUrl && imagenAnterior) {
        try {
          await storageService.deleteProductImage(imagenAnterior);
        } catch (deleteError) {
          console.error('Error al eliminar imagen anterior:', deleteError);
          // No es crítico, solo registramos el error
        }
      }

      toast.success('Producto actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      updateForm.reset();
      setEditSelectedImage(null);
      setEditImagePreview(null);
      setIsUploadingEditImage(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar producto');
      setIsUploadingEditImage(false);
    }
  };

  const handleEditImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }

      setEditSelectedImage(file);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveEditImage = () => {
    setEditSelectedImage(null);
    // Si hay una imagen existente, restaurar la vista previa a la original
    if (selectedProduct?.imagen_url) {
      setEditImagePreview(selectedProduct.imagen_url);
    } else {
      setEditImagePreview(null);
    }
  };

  const handleDeleteEditImage = async () => {
    if (!selectedProduct) return;
    
    try {
      // Eliminar imagen del storage si existe
      if (selectedProduct.imagen_url) {
        await storageService.deleteProductImage(selectedProduct.imagen_url);
      }
      
      // Actualizar producto para eliminar la URL de la imagen
      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        updates: { imagen_url: null },
      });
      
      toast.success('Imagen eliminada exitosamente');
      setEditImagePreview(null);
      setEditSelectedImage(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar imagen');
    }
  };

  const handleAdjustStock = async (data: AdjustStockForm) => {
    if (!selectedProduct) return;
    try {
      await adjustStockMutation.mutateAsync({
        id: selectedProduct.id,
        nuevoStock: data.nuevoStock,
        idUsuario: user?.id,
      });
      toast.success('Stock actualizado exitosamente');
      setIsStockDialogOpen(false);
      setSelectedProduct(null);
      stockForm.reset();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar stock');
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProductMutation.mutateAsync(selectedProduct.id);
      toast.success('Producto eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar producto');
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      await toggleStatusMutation.mutateAsync(product.id);
      toast.success(`Producto ${product.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`);
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    updateForm.reset({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio_venta: product.precio_venta,
      codigo: product.codigo,
      id_categoria: product.id_categoria || '',
      stock_minimo: product.stock_minimo,
      estado: product.estado,
    });
    // Inicializar vista previa con la imagen existente si hay
    setEditImagePreview(product.imagen_url || null);
    setEditSelectedImage(null);
    setIsEditDialogOpen(true);
  };

  const openStockDialog = (product: Product) => {
    setSelectedProduct(product);
    stockForm.reset({
      nuevoStock: product.stock_actual,
    });
    setIsStockDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout title="Productos">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Productos</p>
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
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Activos</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.activos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={stats.stockBajo > 0 ? 'border-warning/30 bg-warning/5' : ''}>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-warning/10 shrink-0">
                  <PackageX className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stats.stockBajo}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="font-display">Lista de Productos</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
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
                <span className="hidden sm:inline">Nuevo Producto</span>
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
            ) : paginatedProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Imagen</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.imagen_url ? (
                            <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted border border-border flex items-center justify-center">
                              <img 
                                src={product.imagen_url} 
                                alt={product.nombre}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.nombre}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {product.codigo}
                              {product.descripcion && ` • ${product.descripcion}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          Bs. {product.precio_venta.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.stock_actual <= product.stock_minimo ? 'destructive' : 'secondary'}
                          >
                            {product.stock_actual} / {product.stock_minimo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.estado === 'activo' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {product.estado}
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
                              <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openStockDialog(product)}>
                                <Package className="mr-2 h-4 w-4" />
                                Ajustar Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(product)}
                                disabled={toggleStatusMutation.isPending}
                              >
                                {product.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(product)}
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
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} productos
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

        {/* Create Product Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setCategorySearchTerm('');
            setCategoryOpen(false);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={createForm.handleSubmit(handleCreateProduct)}>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Producto</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear un nuevo producto en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre del Producto *</Label>
                    <Input
                      id="nombre"
                      {...createForm.register('nombre')}
                      placeholder="Ej: Coca Cola 2L"
                    />
                    {createForm.formState.errors.nombre && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.nombre.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      {...createForm.register('codigo')}
                      placeholder="Ej: BEB001"
                    />
                    {createForm.formState.errors.codigo && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.codigo.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    {...createForm.register('descripcion')}
                    placeholder="Descripción del producto (opcional)"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="precio_venta">Precio de Venta (Bs.) *</Label>
                    <Input
                      id="precio_venta"
                      type="number"
                      step="0.01"
                      {...createForm.register('precio_venta', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {createForm.formState.errors.precio_venta && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.precio_venta.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="id_categoria">Categoría</Label>
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-10"
                        >
                          {createForm.watch('id_categoria') ? (
                            categories.find((cat) => cat.id === createForm.watch('id_categoria'))?.nombre || 'Seleccionar categoría'
                          ) : (
                            <span className="text-muted-foreground">Sin categoría</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10001]" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Buscar categoría..." 
                            value={categorySearchTerm}
                            onValueChange={setCategorySearchTerm}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  createForm.setValue('id_categoria', undefined);
                                  setCategoryOpen(false);
                                  setCategorySearchTerm('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !createForm.watch('id_categoria') ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Sin categoría
                              </CommandItem>
                              {filteredCategories.length === 0 ? (
                                <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                              ) : (
                                filteredCategories.map((cat) => (
                                  <CommandItem
                                    key={cat.id}
                                    value={cat.id}
                                    onSelect={() => {
                                      createForm.setValue('id_categoria', cat.id);
                                      setCategoryOpen(false);
                                      setCategorySearchTerm('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        createForm.watch('id_categoria') === cat.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat.nombre}
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock_actual">Stock Actual *</Label>
                    <Input
                      id="stock_actual"
                      type="number"
                      {...createForm.register('stock_actual', { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {createForm.formState.errors.stock_actual && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.stock_actual.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      {...createForm.register('stock_minimo', { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {createForm.formState.errors.stock_minimo && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.stock_minimo.message}
                      </p>
                    )}
                  </div>
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
                
                {/* Campo de imagen */}
                <div className="grid gap-2">
                  <Label htmlFor="imagen">Imagen del Producto</Label>
                  <div className="space-y-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Vista previa" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <Label 
                          htmlFor="imagen" 
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <span className="text-sm text-muted-foreground">
                            Haz clic para seleccionar una imagen
                          </span>
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Seleccionar Imagen
                            </span>
                          </Button>
                        </Label>
                        <input
                          id="imagen"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    createForm.reset();
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProductMutation.isPending || isUploadingImage}
                >
                  {(createProductMutation.isPending || isUploadingImage) ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      {isUploadingImage ? 'Subiendo imagen...' : 'Creando...'}
                    </>
                  ) : (
                    'Crear Producto'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditCategorySearchTerm('');
            setEditCategoryOpen(false);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={updateForm.handleSubmit(handleUpdateProduct)}>
              <DialogHeader>
                <DialogTitle>Editar Producto</DialogTitle>
                <DialogDescription>
                  Modifica los datos del producto.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-nombre">Nombre del Producto *</Label>
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
                    <Label htmlFor="edit-codigo">Código *</Label>
                    <Input
                      id="edit-codigo"
                      {...updateForm.register('codigo')}
                    />
                    {updateForm.formState.errors.codigo && (
                      <p className="text-sm text-destructive">
                        {updateForm.formState.errors.codigo?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-descripcion">Descripción</Label>
                  <Textarea
                    id="edit-descripcion"
                    {...updateForm.register('descripcion')}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-precio_venta">Precio de Venta (Bs.) *</Label>
                    <Input
                      id="edit-precio_venta"
                      type="number"
                      step="0.01"
                      {...updateForm.register('precio_venta', { valueAsNumber: true })}
                    />
                    {updateForm.formState.errors.precio_venta && (
                      <p className="text-sm text-destructive">
                        {updateForm.formState.errors.precio_venta?.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-id_categoria">Categoría</Label>
                    <Popover open={editCategoryOpen} onOpenChange={setEditCategoryOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-10"
                        >
                          {updateForm.watch('id_categoria') || selectedProduct?.id_categoria ? (
                            categories.find((cat) => cat.id === (updateForm.watch('id_categoria') || selectedProduct?.id_categoria))?.nombre || 'Seleccionar categoría'
                          ) : (
                            <span className="text-muted-foreground">Sin categoría</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10001]" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Buscar categoría..." 
                            value={editCategorySearchTerm}
                            onValueChange={setEditCategorySearchTerm}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  updateForm.setValue('id_categoria', undefined);
                                  setEditCategoryOpen(false);
                                  setEditCategorySearchTerm('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !(updateForm.watch('id_categoria') || selectedProduct?.id_categoria) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Sin categoría
                              </CommandItem>
                              {filteredEditCategories.length === 0 ? (
                                <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                              ) : (
                                filteredEditCategories.map((cat) => (
                                  <CommandItem
                                    key={cat.id}
                                    value={cat.id}
                                    onSelect={() => {
                                      updateForm.setValue('id_categoria', cat.id);
                                      setEditCategoryOpen(false);
                                      setEditCategorySearchTerm('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        (updateForm.watch('id_categoria') || selectedProduct?.id_categoria) === cat.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat.nombre}
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-stock_minimo">Stock Mínimo *</Label>
                  <Input
                    id="edit-stock_minimo"
                    type="number"
                    {...updateForm.register('stock_minimo', { valueAsNumber: true })}
                  />
                  {updateForm.formState.errors.stock_minimo && (
                    <p className="text-sm text-destructive">
                      {updateForm.formState.errors.stock_minimo?.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-estado">Estado</Label>
                  <Select
                    value={updateForm.watch('estado') || selectedProduct?.estado}
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
                
                {/* Campo de imagen para edición */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-imagen">Imagen del Producto</Label>
                  <div className="space-y-2">
                    {editImagePreview ? (
                      <div className="relative">
                        <img 
                          src={editImagePreview} 
                          alt="Vista previa" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleRemoveEditImage}
                            title="Cancelar cambio"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {selectedProduct?.imagen_url && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteEditImage}
                              title="Eliminar imagen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {editSelectedImage && (
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Nueva imagen seleccionada
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <Label 
                          htmlFor="edit-imagen" 
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <span className="text-sm text-muted-foreground">
                            Haz clic para seleccionar una imagen
                          </span>
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Seleccionar Imagen
                            </span>
                          </Button>
                        </Label>
                        <input
                          id="edit-imagen"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleEditImageSelect}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedProduct(null);
                    updateForm.reset();
                    setEditSelectedImage(null);
                    setEditImagePreview(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProductMutation.isPending || isUploadingEditImage}
                >
                  {(updateProductMutation.isPending || isUploadingEditImage) ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      {isUploadingEditImage ? 'Subiendo imagen...' : 'Guardando...'}
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Adjust Stock Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={stockForm.handleSubmit(handleAdjustStock)}>
              <DialogHeader>
                <DialogTitle>Ajustar Stock</DialogTitle>
                <DialogDescription>
                  Actualiza el stock actual del producto <strong>{selectedProduct?.nombre}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nuevoStock">Stock Actual</Label>
                  <Input
                    id="nuevoStock"
                    type="number"
                    {...stockForm.register('nuevoStock', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {stockForm.formState.errors.nuevoStock && (
                    <p className="text-sm text-destructive">
                      {stockForm.formState.errors.nuevoStock.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Stock mínimo: {selectedProduct?.stock_minimo || 0}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStockDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={adjustStockMutation.isPending}>
                  {adjustStockMutation.isPending ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Stock'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Product Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el producto{' '}
                <strong>{selectedProduct?.nombre}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProduct}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? (
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
