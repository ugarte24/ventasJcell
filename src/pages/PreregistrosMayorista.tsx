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
import { PreregistroMayorista } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getLocalDateISO } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

export default function PreregistrosMayorista() {
  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const [preregistros, setPreregistros] = useState<PreregistroMayorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMayorista, setSelectedMayorista] = useState<string>('');
  const [mayoristaSearchOpen, setMayoristaSearchOpen] = useState(false);
  const [mayoristaSearchTerm, setMayoristaSearchTerm] = useState('');
  const [fecha, setFecha] = useState<string>(getLocalDateISO());
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingPreregistro, setEditingPreregistro] = useState<PreregistroMayorista | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<string>('');
  const [editCantidad, setEditCantidad] = useState<string>('1');
  const [editProductSearchOpen, setEditProductSearchOpen] = useState(false);
  const [editProductSearchTerm, setEditProductSearchTerm] = useState('');
  // Estados para el diálogo de gestión de productos
  const [selectedMayoristaForManage, setSelectedMayoristaForManage] = useState<string | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [preregistrosDelMayorista, setPreregistrosDelMayorista] = useState<PreregistroMayorista[]>([]);
  // Estados para agregar producto desde el diálogo de gestión
  const [newProductForManage, setNewProductForManage] = useState<string>('');
  const [newCantidadForManage, setNewCantidadForManage] = useState<string>('1');
  const [newProductSearchOpen, setNewProductSearchOpen] = useState(false);
  const [newProductSearchTerm, setNewProductSearchTerm] = useState('');

  const mayoristas = users.filter(u => u.rol === 'mayorista' && u.estado === 'activo');
  const filteredMayoristas = mayoristas.filter(m =>
    m.nombre.toLowerCase().includes(mayoristaSearchTerm.toLowerCase()) ||
    m.usuario.toLowerCase().includes(mayoristaSearchTerm.toLowerCase())
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

  // Agrupar preregistros por mayorista único
  const mayoristasUnicos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    preregistros.forEach((preregistro) => {
      if (preregistro.id_mayorista && preregistro.mayorista) {
        if (!map.has(preregistro.id_mayorista)) {
          map.set(preregistro.id_mayorista, {
            id: preregistro.id_mayorista,
            nombre: preregistro.mayorista.nombre,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [preregistros]);

  const loadPreregistros = async () => {
    try {
      setIsLoading(true);
      const data = await preregistrosService.getPreregistrosMayorista(undefined, fecha);
      setPreregistros(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar preregistros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreregistros();
  }, [fecha]);

  const handleCreate = async () => {
    if (!selectedMayorista) {
      toast.error('Selecciona un mayorista');
      return;
    }

    // Cerrar el diálogo de creación y abrir el diálogo de gestión de productos
    setIsDialogOpen(false);
    setSelectedMayorista('');
    setMayoristaSearchTerm('');
    // Abrir el diálogo de gestión de productos para este mayorista
    await handleManageProducts(selectedMayorista);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await preregistrosService.deletePreregistroMayorista(id);
      toast.success('Preregistro eliminado exitosamente');
      loadPreregistros();
      // Recargar productos del mayorista si el diálogo de gestión está abierto
      if (selectedMayoristaForManage) {
        loadPreregistrosDelMayorista(selectedMayoristaForManage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar preregistro');
    } finally {
      setIsDeleting(null);
    }
  };

  // Abrir diálogo de gestión de productos para un mayorista
  const handleManageProducts = async (idMayorista: string) => {
    setSelectedMayoristaForManage(idMayorista);
    setIsManageDialogOpen(true);
    await loadPreregistrosDelMayorista(idMayorista);
  };

  // Cargar preregistros de un mayorista específico
  const loadPreregistrosDelMayorista = async (idMayorista: string) => {
    try {
      const data = await preregistrosService.getPreregistrosMayorista(idMayorista, fecha);
      setPreregistrosDelMayorista(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar productos');
    }
  };

  // Agregar producto desde el diálogo de gestión
  const handleAddProductFromManage = async () => {
    if (!selectedMayoristaForManage) return;
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
      await preregistrosService.createPreregistroMayorista(
        selectedMayoristaForManage,
        newProductForManage,
        cantidadNum,
        fecha
      );
      toast.success('Producto agregado exitosamente');
      setNewProductForManage('');
      setNewCantidadForManage('1');
      setNewProductSearchTerm('');
      await loadPreregistrosDelMayorista(selectedMayoristaForManage);
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar producto');
    }
  };

  // Editar producto desde el diálogo de gestión
  const handleEditProductFromManage = (preregistro: PreregistroMayorista) => {
    setEditingPreregistro(preregistro);
    setEditProduct(preregistro.id_producto);
    setEditCantidad(preregistro.cantidad.toString());
    setEditProductSearchTerm('');
    setIsEditDialogOpen(true);
  };

  // Actualizar preregistro (para el diálogo de edición)
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
      await preregistrosService.updatePreregistroMayorista(editingPreregistro.id, {
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
      if (selectedMayoristaForManage) {
        await loadPreregistrosDelMayorista(selectedMayoristaForManage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar preregistro');
    }
  };

  // Eliminar producto desde el diálogo de gestión
  const handleDeleteProductFromManage = async (id: string) => {
    try {
      setIsDeleting(id);
      await preregistrosService.deletePreregistroMayorista(id);
      toast.success('Producto eliminado exitosamente');
      if (selectedMayoristaForManage) {
        await loadPreregistrosDelMayorista(selectedMayoristaForManage);
      }
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar producto');
    } finally {
      setIsDeleting(null);
    }
  };

  // Actualizar productos del mayorista cuando cambia la fecha o se cierra el diálogo de edición
  useEffect(() => {
    if (selectedMayoristaForManage && isManageDialogOpen) {
      loadPreregistrosDelMayorista(selectedMayoristaForManage);
    }
  }, [fecha, selectedMayoristaForManage, isManageDialogOpen]);

  useEffect(() => {
    if (!isEditDialogOpen && editingPreregistro === null && selectedMayoristaForManage) {
      loadPreregistrosDelMayorista(selectedMayoristaForManage);
    }
  }, [isEditDialogOpen, editingPreregistro, selectedMayoristaForManage]);

  return (
    <DashboardLayout title="Preregistros Mayorista">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preregistros del Día</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="fecha">Fecha:</Label>
                <DatePicker
                  id="fecha"
                  value={fecha}
                  onChange={setFecha}
                  placeholder="dd/mm/yyyy"
                  className="w-auto"
                />
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
            ) : mayoristasUnicos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay preregistros para esta fecha
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mayorista</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mayoristasUnicos.map((mayorista) => (
                    <TableRow key={mayorista.id}>
                      <TableCell>
                        {mayorista.nombre}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleManageProducts(mayorista.id)}
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
              <DialogTitle>Agregar Mayorista</DialogTitle>
              <DialogDescription>
                Selecciona un mayorista para gestionar sus productos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-visible">
              <div className="space-y-2">
                <Label>Mayorista *</Label>
                <Popover open={mayoristaSearchOpen} onOpenChange={setMayoristaSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedMayorista
                        ? mayoristas.find(m => m.id === selectedMayorista)?.nombre || 'Seleccionar mayorista'
                        : 'Seleccionar mayorista'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10002]" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar mayorista..."
                        value={mayoristaSearchTerm}
                        onValueChange={setMayoristaSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron mayoristas.</CommandEmpty>
                        <CommandGroup>
                          {filteredMayoristas.map((mayorista) => (
                            <CommandItem
                              key={mayorista.id}
                              value={`${mayorista.nombre} ${mayorista.usuario} ${mayorista.id}`}
                              onSelect={(currentValue) => {
                                const selected = filteredMayoristas.find(
                                  m => m.id === mayorista.id
                                );
                                if (selected) {
                                  setSelectedMayorista(selected.id);
                                  setMayoristaSearchOpen(false);
                                  setMayoristaSearchTerm('');
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedMayorista === mayorista.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {mayorista.nombre}
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
              <DialogTitle>Editar Preregistro Mayorista</DialogTitle>
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

        {/* Dialog para gestionar productos de un mayorista */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gestionar Productos - {mayoristasUnicos.find(m => m.id === selectedMayoristaForManage)?.nombre || 'N/A'}
              </DialogTitle>
              <DialogDescription>
                Agrega, edita o elimina productos de este mayorista para la fecha {fecha ? (() => {
                  const [year, month, day] = fecha.split('-');
                  return `${day}/${month}/${year}`;
                })() : ''}.
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

              {/* Tabla de productos del mayorista */}
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
                    {preregistrosDelMayorista.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No hay productos registrados para este mayorista en esta fecha
                        </TableCell>
                      </TableRow>
                    ) : (
                      preregistrosDelMayorista.map((preregistro) => (
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

