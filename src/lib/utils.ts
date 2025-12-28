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