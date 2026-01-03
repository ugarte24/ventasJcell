import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Search, 
  DollarSign,
  MoreHorizontal, 
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Loader,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PagoMayorista } from '@/types';
import { pagosMayoristasService } from '@/services/pagos-mayoristas.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

export default function PagosMayoristas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [showVerificarDialog, setShowVerificarDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPago, setSelectedPago] = useState<PagoMayorista | null>(null);
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr' | 'transferencia'>('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Solo administradores pueden acceder
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      toast.error('No tienes permisos para acceder a esta página');
    }
  }, [user]);

  // Obtener pagos
  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ['pagos-mayoristas', estadoFilter],
    queryFn: async () => {
      const estado = estadoFilter === 'todos' ? undefined : estadoFilter;
      return await pagosMayoristasService.getAll(undefined, estado);
    },
    enabled: user?.rol === 'admin',
  });

  // Mutación para verificar pago
  const verificarPagoMutation = useMutation({
    mutationFn: async ({ id, montoRecibido, observaciones }: { id: string; montoRecibido: number; observaciones?: string }) => {
      if (!user) throw new Error('Usuario no autenticado');
      return await pagosMayoristasService.verificar(id, user.id, montoRecibido, observaciones);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-mayoristas'] });
      toast.success('Pago verificado exitosamente');
      setShowVerificarDialog(false);
      setSelectedPago(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al verificar el pago');
    },
  });

  // Mutación para actualizar pago
  const updatePagoMutation = useMutation({
    mutationFn: async ({ id, montoRecibido, observaciones }: { id: string; montoRecibido: number; observaciones?: string }) => {
      return await pagosMayoristasService.update(id, montoRecibido, observaciones);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-mayoristas'] });
      toast.success('Pago actualizado exitosamente');
      setShowEditDialog(false);
      setSelectedPago(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el pago');
    },
  });

  const resetForm = () => {
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setObservaciones('');
  };

  const filteredPagos = useMemo(() => 
    pagos.filter(pago =>
      pago.mayorista?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pago.venta?.id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [pagos, searchTerm]
  );

  // Paginación
  const totalPages = Math.ceil(filteredPagos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPagos = filteredPagos.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredPagos.length, currentPage, totalPages]);

  const handleOpenVerificarDialog = (pago: PagoMayorista) => {
    setSelectedPago(pago);
    setMontoRecibido(pago.monto_esperado.toFixed(2));
    setMetodoPago(pago.metodo_pago);
    setObservaciones(pago.observaciones || '');
    setShowVerificarDialog(true);
  };

  const handleOpenEditDialog = (pago: PagoMayorista) => {
    setSelectedPago(pago);
    setMontoRecibido(pago.monto_recibido.toFixed(2));
    setMetodoPago(pago.metodo_pago);
    setObservaciones(pago.observaciones || '');
    setShowEditDialog(true);
  };

  const handleOpenDetailsDialog = (pago: PagoMayorista) => {
    setSelectedPago(pago);
    setShowDetailsDialog(true);
  };

  const handleVerificarPago = () => {
    if (!selectedPago) return;
    
    const monto = parseFloat(montoRecibido);
    if (isNaN(monto) || monto < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    verificarPagoMutation.mutate({
      id: selectedPago.id,
      montoRecibido: monto,
      observaciones: observaciones.trim() || undefined,
    });
  };

  const handleUpdatePago = () => {
    if (!selectedPago) return;
    
    const monto = parseFloat(montoRecibido);
    if (isNaN(monto) || monto < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    updatePagoMutation.mutate({
      id: selectedPago.id,
      montoRecibido: monto,
      observaciones: observaciones.trim() || undefined,
    });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'verificado':
        return <Badge className="bg-success text-success-foreground">Verificado</Badge>;
      case 'pendiente':
        return <Badge variant="outline" className="border-warning text-warning">Pendiente</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getDiferenciaColor = (diferencia: number) => {
    if (diferencia === 0) return 'text-success';
    if (diferencia > 0) return 'text-warning';
    return 'text-destructive';
  };

  if (user?.rol !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Pagos de Mayoristas</h1>
            <p className="text-muted-foreground mt-1">
              Verifica y gestiona los pagos recibidos de mayoristas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pagos.filter(p => p.estado === 'pendiente').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagos por verificar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Verificados</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {pagos.filter(p => p.estado === 'verificado').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagos verificados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total Pendiente</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Bs. {pagos
                  .filter(p => p.estado === 'pendiente')
                  .reduce((sum, p) => sum + p.monto_esperado, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por verificar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por mayorista o ID de venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="verificado">Verificado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedPagos.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay pagos registrados</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mayorista</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto Esperado</TableHead>
                        <TableHead className="text-right">Monto Recibido</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPagos.map((pago) => (
                        <TableRow key={pago.id}>
                          <TableCell className="font-medium">
                            {pago.mayorista?.nombre || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            Bs. {pago.monto_esperado.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {pago.monto_recibido > 0 ? (
                              <span>Bs. {pago.monto_recibido.toFixed(2)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${getDiferenciaColor(pago.diferencia)}`}>
                            {pago.monto_recibido > 0 ? (
                              <>
                                {pago.diferencia > 0 && '+'}
                                Bs. {pago.diferencia.toFixed(2)}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {pago.metodo_pago}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getEstadoBadge(pago.estado)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDetailsDialog(pago)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                {pago.estado === 'pendiente' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenVerificarDialog(pago)}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Verificar Pago
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {pago.estado === 'verificado' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(pago)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar Monto
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
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
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
      </div>

      {/* Verificar Pago Dialog */}
      <Dialog open={showVerificarDialog} onOpenChange={(open) => {
        setShowVerificarDialog(open);
        if (!open) {
          setSelectedPago(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verificar Pago</DialogTitle>
            <DialogDescription>
              Ingresa el monto recibido y verifica el pago del mayorista
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPago && (
              <>
                <div className="space-y-2">
                  <Label>Mayorista</Label>
                  <Input value={selectedPago.mayorista?.nombre || 'N/A'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Monto Esperado</Label>
                  <Input value={`Bs. ${selectedPago.monto_esperado.toFixed(2)}`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Monto Recibido *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select value={metodoPago} onValueChange={(value: 'efectivo' | 'qr' | 'transferencia') => setMetodoPago(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="qr">QR</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observaciones (opcional)</Label>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas adicionales sobre el pago..."
                    rows={3}
                  />
                </div>
                {montoRecibido && !isNaN(parseFloat(montoRecibido)) && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Diferencia:</span>
                      <span className={`font-semibold ${getDiferenciaColor(parseFloat(montoRecibido) - selectedPago.monto_esperado)}`}>
                        {parseFloat(montoRecibido) - selectedPago.monto_esperado > 0 ? '+' : ''}
                        Bs. {(parseFloat(montoRecibido) - selectedPago.monto_esperado).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVerificarDialog(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleVerificarPago}
              disabled={verificarPagoMutation.isPending || !montoRecibido || isNaN(parseFloat(montoRecibido))}
            >
              {verificarPagoMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Pago Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setSelectedPago(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Monto Recibido</DialogTitle>
            <DialogDescription>
              Actualiza el monto recibido del pago
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPago && (
              <>
                <div className="space-y-2">
                  <Label>Mayorista</Label>
                  <Input value={selectedPago.mayorista?.nombre || 'N/A'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Monto Esperado</Label>
                  <Input value={`Bs. ${selectedPago.monto_esperado.toFixed(2)}`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Monto Recibido *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observaciones (opcional)</Label>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas adicionales sobre el pago..."
                    rows={3}
                  />
                </div>
                {montoRecibido && !isNaN(parseFloat(montoRecibido)) && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Diferencia:</span>
                      <span className={`font-semibold ${getDiferenciaColor(parseFloat(montoRecibido) - selectedPago.monto_esperado)}`}>
                        {parseFloat(montoRecibido) - selectedPago.monto_esperado > 0 ? '+' : ''}
                        Bs. {(parseFloat(montoRecibido) - selectedPago.monto_esperado).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdatePago}
              disabled={updatePagoMutation.isPending || !montoRecibido || isNaN(parseFloat(montoRecibido))}
            >
              {updatePagoMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalles Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
          </DialogHeader>
          {selectedPago && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mayorista</Label>
                  <p className="font-medium">{selectedPago.mayorista?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha de Pago</Label>
                  <p className="font-medium">
                    {format(new Date(selectedPago.fecha_pago), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monto Esperado</Label>
                  <p className="font-medium">Bs. {selectedPago.monto_esperado.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monto Recibido</Label>
                  <p className="font-medium">
                    {selectedPago.monto_recibido > 0 
                      ? `Bs. ${selectedPago.monto_recibido.toFixed(2)}`
                      : 'No registrado'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Diferencia</Label>
                  <p className={`font-medium ${getDiferenciaColor(selectedPago.diferencia)}`}>
                    {selectedPago.monto_recibido > 0 ? (
                      <>
                        {selectedPago.diferencia > 0 && '+'}
                        Bs. {selectedPago.diferencia.toFixed(2)}
                      </>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Método de Pago</Label>
                  <p className="font-medium capitalize">{selectedPago.metodo_pago}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    {getEstadoBadge(selectedPago.estado)}
                  </div>
                </div>
                {selectedPago.fecha_verificacion && (
                  <div>
                    <Label className="text-muted-foreground">Fecha de Verificación</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPago.fecha_verificacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                )}
                {selectedPago.administrador && (
                  <div>
                    <Label className="text-muted-foreground">Verificado por</Label>
                    <p className="font-medium">{selectedPago.administrador.nombre}</p>
                  </div>
                )}
              </div>
              {selectedPago.observaciones && (
                <div>
                  <Label className="text-muted-foreground">Observaciones</Label>
                  <p className="font-medium mt-1">{selectedPago.observaciones}</p>
                </div>
              )}
              {selectedPago.venta && (
                <div>
                  <Label className="text-muted-foreground">ID de Venta</Label>
                  <p className="font-mono text-sm">{selectedPago.venta.id}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

