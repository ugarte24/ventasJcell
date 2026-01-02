import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Obtiene la fecha y hora actual en hora local del cliente (navegador)
 * y la devuelve como string ISO en formato que preserve la fecha local
 * 
 * IMPORTANTE: PostgreSQL almacena timestamps en UTC. Para preservar la fecha local,
 * enviamos el timestamp como si fuera UTC pero con los valores de hora local.
 * Esto evita que PostgreSQL convierta y cambie el día cuando hay diferencia de zona horaria.
 * 
 * @returns String ISO con fecha y hora en formato UTC (pero preservando fecha local)
 */
export function getLocalDateTimeISO(): string {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  const milisegundos = String(ahora.getMilliseconds()).padStart(3, '0');
  
  // Enviar como UTC (offset +00:00) pero con los valores de hora local
  // Esto hace que PostgreSQL almacene exactamente estos valores sin conversión
  // Cuando se lea, se mostrará con la fecha correcta
  return `${año}-${mes}-${dia}T${horas}:${minutos}:${segundos}.${milisegundos}+00:00`;
}

/**
 * Obtiene solo la fecha actual en hora local del cliente (navegador)
 * @returns String en formato YYYY-MM-DD en hora local
 */
export function getLocalDateISO(): string {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * Obtiene solo la hora actual en hora local del cliente (navegador)
 * @returns String en formato HH:mm en hora local
 */
export function getLocalTimeISO(): string {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Comprime una imagen si excede el tamaño máximo especificado
 * Usa parámetros conservadores para mantener buena calidad visual
 * @param file Archivo de imagen a comprimir
 * @param maxSizeMB Tamaño máximo en MB (por defecto 5MB)
 * @param maxWidth Ancho máximo de la imagen (por defecto 1600px - recomendado para productos)
 * @param maxHeight Alto máximo de la imagen (por defecto 1600px - recomendado para productos)
 * @returns Promise<File> Archivo comprimido o el original si ya era menor al límite
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 5,
  maxWidth: number = 1600,
  maxHeight: number = 1600
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // Si el archivo ya es menor al límite, devolverlo tal cual
  // Las imágenes que excedan el límite se comprimirán gradualmente
  if (file.size < maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo la proporción
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Crear canvas con las nuevas dimensiones
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Función para comprimir con calidad específica
        const compressWithQuality = (quality: number): Promise<File> => {
          return new Promise((resolveQuality, rejectQuality) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  rejectQuality(new Error('Error al comprimir la imagen'));
                  return;
                }

                // Si el tamaño es aceptable, crear el File
                if (blob.size <= maxSizeBytes) {
                  const compressedFile = new File(
                    [blob],
                    file.name,
                    { type: 'image/jpeg', lastModified: Date.now() }
                  );
                  resolveQuality(compressedFile);
                } else if (quality > 0.6) {
                  // Si aún es muy grande y la calidad es mayor a 0.6 (mínimo recomendado), reducir calidad gradualmente
                  compressWithQuality(quality - 0.05).then(resolveQuality).catch(rejectQuality);
                } else if (width > 800 && height > 800) {
                  // Si la calidad ya está en el mínimo (0.6) y las dimensiones son grandes, reducir tamaño
                  const newWidth = width * 0.9;
                  const newHeight = height * 0.9;
                  canvas.width = newWidth;
                  canvas.height = newHeight;
                  ctx.drawImage(img, 0, 0, newWidth, newHeight);
                  // Mantener calidad en 0.6 (mínimo recomendado)
                  compressWithQuality(0.6).then(resolveQuality).catch(rejectQuality);
                } else {
                  // Si ya está en el mínimo de calidad (0.6) y dimensiones razonables, aceptar el archivo
                  // (aunque sea ligeramente mayor al límite, es mejor que perder más calidad visual)
                  const compressedFile = new File(
                    [blob],
                    file.name,
                    { type: 'image/jpeg', lastModified: Date.now() }
                  );
                  resolveQuality(compressedFile);
                }
              },
              'image/jpeg',
              quality
            );
          });
        };

        // Empezar con calidad 0.8 (80% - balance óptimo) y reducir si es necesario
        // Nunca bajar de 0.6 (60% - mínimo recomendado para mantener calidad visual)
        compressWithQuality(0.8)
          .then(resolve)
          .catch(reject);
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}