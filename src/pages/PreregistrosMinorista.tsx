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
import { Plus, Trash2, Loader, Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { preregistrosService } from '@/services/preregistros.service';
import { PreregistroMinorista } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getLocalDateISO } from '@/lib/utils';

export default function PreregistrosMinorista() {
  const { data: products = [] } = useProducts();
  const [preregistros, setPreregistros] = useState<PreregistroMinorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [cantidad, setCantidad] = useState<string>('1');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [fecha, setFecha] = useState<string>(getLocalDateISO());
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const loadPreregistros = async () => {
    try {
      setIsLoading(true);
      const data = await preregistrosService.getPreregistrosMinorista(fecha);
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
        selectedProduct,
        cantidadNum,
        fecha
      );
      toast.success('Preregistro creado exitosamente');
      setIsDialogOpen(false);
      setSelectedProduct('');
      setCantidad('1');
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
              <CardTitle>Preregistros del Día</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="fecha">Fecha:</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
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
            ) : preregistros.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay preregistros para esta fecha
              </div>
            ) : (
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
                  {preregistros.map((preregistro) => (
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
                Registra un producto y cantidad para los minoristas del día {fecha}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                              value={product.id}
                              onSelect={() => {
                                setSelectedProduct(product.id);
                                setProductSearchOpen(false);
                                setProductSearchTerm('');
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProduct === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.nombre} ({product.codigo})
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

