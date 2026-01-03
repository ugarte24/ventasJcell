import { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Camera,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { transferenciasService } from '@/services/transferencias.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransferenciaSaldo } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsQR from 'jsqr';

export default function EscanearQR() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [codigoQR, setCodigoQR] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferenciaEncontrada, setTransferenciaEncontrada] = useState<TransferenciaSaldo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Estados para cámara y galería
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Funciones para cámara
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Cámara trasera en móviles
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error: any) {
      console.error('Error al acceder a la cámara:', error);
      toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setSelectedImage(null);
  };

  // Efecto para iniciar el video cuando se abre la cámara
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, cameraStream]);

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setSelectedImage(imageData);
      closeCamera();
      // Procesar la imagen inmediatamente
      await processImageForQR(imageData);
    }
  };

  // Seleccionar imagen de galería
  const handleSelectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      try {
        const reader = new FileReader();
        reader.onloadend = async (e) => {
          const imageData = e.target?.result as string;
          setSelectedImage(imageData);
          await processImageForQR(imageData);
        };
        reader.readAsDataURL(file);
      } catch (error: any) {
        toast.error(error.message || 'Error al procesar la imagen');
      }
    }
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Procesar imagen para extraer código QR
  const processImageForQR = async (imageData: string) => {
    setIsProcessingImage(true);
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageDataFromCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Usar jsQR para detectar el código QR
          const code = jsQR(imageDataFromCanvas.data, imageDataFromCanvas.width, imageDataFromCanvas.height);
          
          if (code) {
            setCodigoQR(code.data);
            toast.success('Código QR detectado correctamente');
            setSelectedImage(null);
          } else {
            toast.error('No se pudo detectar un código QR en la imagen. Intenta con otra imagen.');
          }
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        toast.error('Error al cargar la imagen');
        setIsProcessingImage(false);
      };
      img.src = imageData;
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la imagen');
      setIsProcessingImage(false);
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
              <li>Puedes escanear el código QR de tres formas:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Tomar una foto con la cámara</li>
                  <li>Seleccionar una imagen desde la galería</li>
                  <li>Ingresar o pegar el código manualmente</li>
                </ul>
              </li>
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
                  disabled={isValidating || escanearQRMutation.isPending || isProcessingImage}
                />
                <Button
                  variant="outline"
                  onClick={handlePegarCodigo}
                  disabled={isValidating || escanearQRMutation.isPending || isProcessingImage}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Pegar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa o pega el código QR, o escanéalo desde una foto
              </p>
            </div>

            {/* Botones de cámara y galería */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={openCamera}
                disabled={isValidating || escanearQRMutation.isPending || isProcessingImage || isCameraOpen}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
              <Button
                variant="outline"
                onClick={handleSelectFromGallery}
                disabled={isValidating || escanearQRMutation.isPending || isProcessingImage || isCameraOpen}
                className="w-full"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Desde Galería
              </Button>
            </div>

            {/* Input oculto para seleccionar archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Vista previa de imagen seleccionada */}
            {selectedImage && !isCameraOpen && (
              <div className="relative">
                <img 
                  src={selectedImage} 
                  alt="Vista previa" 
                  className="w-full rounded-lg border max-h-64 object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                {isProcessingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleValidarQR}
              disabled={!codigoQR.trim() || isValidating || escanearQRMutation.isPending || isProcessingImage}
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

      {/* Diálogo de Cámara */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tomar Foto del Código QR</DialogTitle>
            <DialogDescription>
              Asegúrate de que el código QR esté bien enfocado y visible
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {cameraStream && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
              {!cameraStream && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={closeCamera}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={!cameraStream}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

