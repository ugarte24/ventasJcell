import QRCode from 'qrcode';

const PNG_NAME = 'qr-transferencia-saldos-jcell.png';

export async function generarArchivoPngQrTransferencia(codigo: string): Promise<File> {
  const c = codigo.trim();
  if (!c) throw new Error('Código vacío');
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, c, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png', 1);
  });
  return new File([blob], PNG_NAME, { type: 'image/png' });
}

export function descargarArchivo(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
