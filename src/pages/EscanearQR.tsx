import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  QrCode, 
  Scan, 
  CheckCircle, 
  XCircle, 
  Loader,
  Copy,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { transferenciasService } from '@/services/transferencias.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransferenciaSaldo } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EscanearQR() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [codigoQR, setCodigoQR] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferenciaEncontrada, setTransferenciaEncontrada] = useState<TransferenciaSaldo | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Solo minoristas pueden acceder
  if (user?.rol !== 'minorista') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Solo los minoristas pueden escanear códigos QR</p>
        </div>
      </DashboardLayout>
    );
  }

  // Mutación para escanear QR
  const escanearQRMutation = useMutation({
    mutationFn: async (codigo: string) => {
      if (!user) throw new Error('Usuario no autenticado');
      return await transferenciasService.escanearQR(codigo, user.id);
    },
    onSuccess: (transferencia) => {
      setTransferenciaEncontrada(transferencia);
      setShowConfirmDialog(true);
      queryClient.invalidateQueries({ queryKey: ['transferencias-saldos'] });
      queryClient.invalidateQueries({ queryKey: ['preregistros-minorista'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al escanear el código QR');
      setIsValidating(false);
    },
  });

  const handleValidarQR = async () => {
    if (!codigoQR.trim()) {
      toast.error('Ingresa un código QR');
      return;
    }

    setIsValidating(true);
    escanearQRMutation.mutate(codigoQR.trim());
  };

  const handleConfirmarTransferencia = () => {
    if (!transferenciaEncontrada) return;

    // La transferencia ya se completó al escanear, solo cerramos el diálogo
    toast.success('Saldos restantes recibidos exitosamente');
    setShowConfirmDialog(false);
    setCodigoQR('');
    setTransferenciaEncontrada(null);
    setIsValidating(false);
  };

  const handlePegarCodigo = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCodigoQR(text);
      toast.success('Código QR pegado desde el portapapeles');
    } catch (error) {
      toast.error('No se pudo leer el portapapeles');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Escanear Código QR</h1>
            <p className="text-muted-foreground mt-1">
              Escanea un código QR para recibir saldos restantes de otro minorista
            </p>
          </div>
        </div>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Solicita el código QR al minorista que desea transferir sus saldos restantes</li>
              <li>Ingresa o pega el código QR en el campo de abajo</li>
              <li>El sistema validará que el código corresponda a la última venta del minorista</li>
              <li>Una vez validado, recibirás los saldos restantes en tus preregistros</li>
            </ol>
          </CardContent>
        </Card>

        {/* QR Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Escanear Código QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo-qr">Código QR</Label>
              <div className="flex gap-2">
                <Input
                  id="codigo-qr"
                  placeholder="TRF-1234567890-ABC..."
                  value={codigoQR}
                  onChange={(e) => setCodigoQR(e.target.value.toUpperCase())}
                  className="font-mono text-sm"
                  disabled={isValidating || escanearQRMutation.isPending}
                />
                <Button
                  variant="outline"
                  onClick={handlePegarCodigo}
                  disabled={isValidating || escanearQRMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Pegar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa o pega el código QR proporcionado por el minorista
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleValidarQR}
              disabled={!codigoQR.trim() || isValidating || escanearQRMutation.isPending}
            >
              {isValidating || escanearQRMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Escanear y Validar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Importante</p>
                <p className="text-xs text-muted-foreground">
                  Solo puedes escanear códigos QR que correspondan a la última venta del minorista que los generó. 
                  Si el código no es válido o ya fue utilizado, recibirás un mensaje de error.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmación Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <DialogTitle className="text-center">Transferencia Exitosa</DialogTitle>
            <DialogDescription className="text-center">
              Los saldos restantes han sido transferidos correctamente
            </DialogDescription>
          </DialogHeader>
          {transferenciaEncontrada && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Minorista Origen:</span>
                  <span className="font-medium">{transferenciaEncontrada.minorista_origen?.nombre || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fecha de Transferencia:</span>
                  <span className="font-medium">
                    {format(new Date(transferenciaEncontrada.fecha_transferencia), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <Badge className="bg-success text-success-foreground">Completada</Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Saldos Restantes Recibidos:</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Array.isArray(transferenciaEncontrada.saldos_transferidos) && transferenciaEncontrada.saldos_transferidos.length > 0 ? (
                    transferenciaEncontrada.saldos_transferidos.map((saldo: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">
                          {saldo.nombre || `Producto ${index + 1}`}
                        </span>
                        <Badge variant="outline">
                          {saldo.cantidad_restante} unidades
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay saldos para mostrar</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleConfirmarTransferencia} className="w-full">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

