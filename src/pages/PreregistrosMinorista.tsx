import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { Plus, Trash2, Loader, Check, ChevronsUpDown, Edit, Package } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useUsers } from '@/hooks/useUsers';
import { preregistrosService } from '@/services/preregistros.service';
import { PreregistroMinorista } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PreregistrosMinorista() {
  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const [preregistros, setPreregistros] = useState<PreregistroMinorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMinorista, setSelectedMinorista] = useState<string>('');
  const [minoristaSearchOpen, setMinoristaSearchOpen] = useState(false);
  const [minoristaSearchTerm, setMinoristaSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingPreregistro, setEditingPreregistro] = useState<PreregistroMinorista | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<string>('');
  const [editCantidad, setEditCantidad] = useState<string>('1');
  const [editProductSearchOpen, setEditProductSearchOpen] = useState(false);
  const [editProductSearchTerm, setEditProductSearchTerm] = useState('');
  // Estados para el diálogo de gestión de productos
  const [selectedMinoristaForManage, setSelectedMinoristaForManage] = useState<string | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [preregistrosDelMinorista, setPreregistrosDelMinorista] = useState<PreregistroMinorista[]>([]);
  // Estados para agregar producto desde el diálogo de gestión
  const [newProductForManage, setNewProductForManage] = useState<string>('');
  const [newCantidadForManage, setNewCantidadForManage] = useState<string>('1');
  const [newProductSearchOpen, setNewProductSearchOpen] = useState(false);
  const [newProductSearchTerm, setNewProductSearchTerm] = useState('');

  const minoristas = users.filter(u => u.rol === 'minorista' && u.estado === 'activo');
  const filteredMinoristas = minoristas.filter(m =>
    m.nombre.toLowerCase().includes(minoristaSearchTerm.toLowerCase()) ||
    m.usuario.toLowerCase().includes(minoristaSearchTerm.toLowerCase())
  );

  // Productos filtrados para el diálogo de gestión (usa newProductSearchTerm)
  const filteredProductsForManage = products.filter(p =>
    p.nombre.toLowerCase().includes(newProductSearchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(newProductSearchTerm.toLowerCase())
  );

  // Productos filtrados para el diálogo de edición (usa editProductSearchTerm)
  const filteredProductsForEdit = products.filter(p =>
    p.nombre.toLowerCase().includes(editProductSearchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(editProductSearchTerm.toLowerCase())
  );

  // Agrupar preregistros por minorista único
  const minoristasUnicos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    preregistros.forEach((preregistro) => {
      if (preregistro.id_minorista && preregistro.minorista) {
        if (!map.has(preregistro.id_minorista)) {
          map.set(preregistro.id_minorista, {
            id: preregistro.id_minorista,
            nombre: preregistro.minorista.nombre,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [preregistros]);

  const loadPreregistros = async () => {
    try {
      setIsLoading(true);
      // Si hay un minorista seleccionado, filtrar por él, sino cargar todos
      const data = await preregistrosService.getPreregistrosMinorista(selectedMinorista || undefined);
      setPreregistros(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar preregistros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreregistros();
  }, [selectedMinorista]);

  const handleCreate = async () => {
    if (!selectedMinorista) {
      toast.error('Selecciona un minorista');
      return;
    }

    // Cerrar el diálogo de creación y abrir el diálogo de gestión de productos
    setIsDialogOpen(false);
    setSelectedMinorista('');
    setMinoristaSearchTerm('');
    // Abrir el diálogo de gestión de productos para este minorista
    await handleManageProducts(selectedMinorista);
  };

  const handleEdit = (preregistro: PreregistroMinorista) => {
    setEditingPreregistro(preregistro);
    setEditProduct(preregistro.id_producto);
    setEditCantidad(preregistro.cantidad.toString());
    setEditProductSearchTerm('');
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingPreregistro) return;

    if (!editProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    const cantidadNum = parseInt(editCantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await preregistrosService.updatePreregistroMinorista(editingPreregistro.id, {
        id_producto: editProduct,
        cantidad: cantidadNum,
      });
      toast.success('Preregistro actualizado exitosamente');
      setIsEditDialogOpen(false);
      setEditingPreregistro(null);
      setEditProduct('');
      setEditCantidad('1');
      setEditProductSearchTerm('');
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar preregistro');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await preregistrosService.deletePreregistroMinorista(id);
      toast.success('Preregistro eliminado exitosamente');
      loadPreregistros();
      // Recargar productos del minorista si el diálogo de gestión está abierto
      if (selectedMinoristaForManage) {
        loadPreregistrosDelMinorista(selectedMinoristaForManage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar preregistro');
    } finally {
      setIsDeleting(null);
    }
  };

  // Abrir diálogo de gestión de productos para un minorista
  const handleManageProducts = async (idMinorista: string) => {
    setSelectedMinoristaForManage(idMinorista);
    setIsManageDialogOpen(true);
    await loadPreregistrosDelMinorista(idMinorista);
  };

  // Cargar preregistros de un minorista específico
  const loadPreregistrosDelMinorista = async (idMinorista: string) => {
    try {
      const data = await preregistrosService.getPreregistrosMinorista(idMinorista);
      setPreregistrosDelMinorista(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar productos');
    }
  };

  // Agregar producto desde el diálogo de gestión
  const handleAddProductFromManage = async () => {
    if (!selectedMinoristaForManage) return;
    if (!newProductForManage) {
      toast.error('Selecciona un producto');
      return;
    }
    const cantidadNum = parseInt(newCantidadForManage);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    try {
      await preregistrosService.createPreregistroMinorista(
        selectedMinoristaForManage,
        newProductForManage,
        cantidadNum
      );
      toast.success('Producto agregado exitosamente');
      setNewProductForManage('');
      setNewCantidadForManage('1');
      setNewProductSearchTerm('');
      await loadPreregistrosDelMinorista(selectedMinoristaForManage);
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar producto');
    }
  };

  // Editar producto desde el diálogo de gestión
  const handleEditProductFromManage = (preregistro: PreregistroMinorista) => {
    setEditingPreregistro(preregistro);
    setEditProduct(preregistro.id_producto);
    setEditCantidad(preregistro.cantidad.toString());
    setEditProductSearchTerm('');
    setIsEditDialogOpen(true);
  };

  // Eliminar producto desde el diálogo de gestión
  const handleDeleteProductFromManage = async (id: string) => {
    try {
      setIsDeleting(id);
      await preregistrosService.deletePreregistroMinorista(id);
      toast.success('Producto eliminado exitosamente');
      if (selectedMinoristaForManage) {
        await loadPreregistrosDelMinorista(selectedMinoristaForManage);
      }
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar producto');
    } finally {
      setIsDeleting(null);
    }
  };

  // Actualizar después de editar
  useEffect(() => {
    if (!isEditDialogOpen && editingPreregistro === null && selectedMinoristaForManage) {
      // Si el diálogo de edición se cerró y había un minorista seleccionado, recargar sus productos
      loadPreregistrosDelMinorista(selectedMinoristaForManage);
    }
  }, [isEditDialogOpen, editingPreregistro, selectedMinoristaForManage]);

  return (
    <DashboardLayout title="Preregistros Minorista">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preregistros Minorista</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Preregistro
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            ) : minoristasUnicos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay preregistros registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minorista</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {minoristasUnicos.map((minorista) => (
                    <TableRow key={minorista.id}>
                      <TableCell>
                        {minorista.nombre}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleManageProducts(minorista.id)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Gestionar Productos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog para crear preregistro */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Minorista</DialogTitle>
              <DialogDescription>
                Selecciona un minorista para gestionar sus productos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-visible">
              <div className="space-y-2">
                <Label>Minorista *</Label>
                <Popover open={minoristaSearchOpen} onOpenChange={setMinoristaSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedMinorista
                        ? minoristas.find(m => m.id === selectedMinorista)?.nombre || 'Seleccionar minorista'
                        : 'Seleccionar minorista'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10002]" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar minorista..."
                        value={minoristaSearchTerm}
                        onValueChange={setMinoristaSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron minoristas.</CommandEmpty>
                        <CommandGroup>
                          {filteredMinoristas.map((minorista) => (
                            <CommandItem
                              key={minorista.id}
                              value={`${minorista.nombre} ${minorista.usuario} ${minorista.id}`}
                              onSelect={(currentValue) => {
                                const selected = filteredMinoristas.find(
                                  m => m.id === minorista.id
                                );
                                if (selected) {
                                  setSelectedMinorista(selected.id);
                                  setMinoristaSearchOpen(false);
                                  setMinoristaSearchTerm('');
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedMinorista === minorista.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {minorista.nombre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>
                Continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar preregistro */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Preregistro Minorista</DialogTitle>
              <DialogDescription>
                Modifica el producto y cantidad del preregistro.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-visible">
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Popover open={editProductSearchOpen} onOpenChange={setEditProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editProduct
                        ? products.find(p => p.id === editProduct)?.nombre || 'Seleccionar producto'
                        : 'Seleccionar producto'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10002]" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar producto..."
                        value={editProductSearchTerm}
                        onValueChange={setEditProductSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {filteredProductsForEdit.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.nombre} ${product.codigo} ${product.id}`}
                              onSelect={(currentValue) => {
                                const selected = filteredProductsForEdit.find(
                                  p => p.id === product.id
                                );
                                if (selected) {
                                  setEditProduct(selected.id);
                                  setEditProductSearchOpen(false);
                                  setEditProductSearchTerm('');
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editProduct === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.nombre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCantidad">Cantidad *</Label>
                <Input
                  id="editCantidad"
                  type="number"
                  min="1"
                  value={editCantidad}
                  onChange={(e) => setEditCantidad(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate}>
                Actualizar Preregistro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para gestionar productos de un minorista */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gestionar Productos - {minoristasUnicos.find(m => m.id === selectedMinoristaForManage)?.nombre || 'N/A'}
              </DialogTitle>
              <DialogDescription>
                Agrega, edita o elimina productos de este minorista.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Formulario para agregar nuevo producto */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Agregar Nuevo Producto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Producto *</Label>
                    <Popover open={newProductSearchOpen} onOpenChange={setNewProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {newProductForManage
                            ? products.find(p => p.id === newProductForManage)?.nombre || 'Seleccionar producto'
                            : 'Seleccionar producto'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10002]" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Buscar producto..."
                            value={newProductSearchTerm}
                            onValueChange={setNewProductSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron productos.</CommandEmpty>
                            <CommandGroup>
                              {filteredProductsForManage.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.nombre} ${product.codigo} ${product.id}`}
                                  onSelect={(currentValue) => {
                                    const selected = filteredProductsForManage.find(
                                      p => p.id === product.id
                                    );
                                    if (selected) {
                                      setNewProductForManage(selected.id);
                                      setNewProductSearchOpen(false);
                                      setNewProductSearchTerm('');
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newProductForManage === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {product.nombre}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCantidadForManage">Cantidad *</Label>
                    <Input
                      id="newCantidadForManage"
                      type="number"
                      min="1"
                      value={newCantidadForManage}
                      onChange={(e) => setNewCantidadForManage(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <Button onClick={handleAddProductFromManage} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              {/* Tabla de productos del minorista */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preregistrosDelMinorista.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No hay productos registrados para este minorista
                        </TableCell>
                      </TableRow>
                    ) : (
                      preregistrosDelMinorista.map((preregistro) => (
                        <TableRow key={preregistro.id}>
                          <TableCell>
                            {preregistro.producto?.nombre || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {preregistro.producto?.codigo || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {preregistro.cantidad}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProductFromManage(preregistro)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProductFromManage(preregistro.id)}
                                disabled={isDeleting === preregistro.id}
                              >
                                {isDeleting === preregistro.id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

