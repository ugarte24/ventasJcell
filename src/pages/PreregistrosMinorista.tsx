import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Loader, Check, ChevronsUpDown } from 'lucide-react';
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
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [cantidad, setCantidad] = useState<string>('1');
  const [minoristaSearchOpen, setMinoristaSearchOpen] = useState(false);
  const [minoristaSearchTerm, setMinoristaSearchTerm] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const minoristas = users.filter(u => u.rol === 'minorista' && u.estado === 'activo');
  const filteredMinoristas = minoristas.filter(m =>
    m.nombre.toLowerCase().includes(minoristaSearchTerm.toLowerCase()) ||
    m.usuario.toLowerCase().includes(minoristaSearchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

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

    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await preregistrosService.createPreregistroMinorista(
        selectedMinorista,
        selectedProduct,
        cantidadNum
      );
      toast.success('Preregistro creado exitosamente');
      setIsDialogOpen(false);
      setSelectedMinorista('');
      setSelectedProduct('');
      setCantidad('1');
      setMinoristaSearchTerm('');
      setProductSearchTerm('');
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear preregistro');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await preregistrosService.deletePreregistroMinorista(id);
      toast.success('Preregistro eliminado exitosamente');
      loadPreregistros();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar preregistro');
    } finally {
      setIsDeleting(null);
    }
  };

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
            ) : preregistros.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay preregistros registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minorista</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preregistros.map((preregistro) => (
                    <TableRow key={preregistro.id}>
                      <TableCell>
                        {preregistro.minorista?.nombre || 'N/A'}
                      </TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(preregistro.id)}
                          disabled={isDeleting === preregistro.id}
                        >
                          {isDeleting === preregistro.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
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
              <DialogTitle>Nuevo Preregistro Minorista</DialogTitle>
              <DialogDescription>
                Registra un producto y cantidad para un minorista específico. Este preregistro será reutilizable todos los días.
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
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedProduct
                        ? products.find(p => p.id === selectedProduct)?.nombre || 'Seleccionar producto'
                        : 'Seleccionar producto'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10002]" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar producto..."
                        value={productSearchTerm}
                        onValueChange={setProductSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.nombre} ${product.codigo} ${product.id}`}
                              onSelect={(currentValue) => {
                                const selected = filteredProducts.find(
                                  p => p.id === product.id
                                );
                                if (selected) {
                                  setSelectedProduct(selected.id);
                                  setProductSearchOpen(false);
                                  setProductSearchTerm('');
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProduct === product.id ? "opacity-100" : "opacity-0"
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
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>
                Crear Preregistro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

