import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { APP_NAME } from '@/lib/constants';

export interface ExportColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface ExportOptions {
  title: string;
  filename?: string;
  columns: ExportColumn[];
  data: any[];
  dateRange?: {
    desde?: string;
    hasta?: string;
  };
  summary?: {
    totalVentas?: number;
    cantidadVentas?: number;
    ticketPromedio?: number;
  };
  usuario?: string;
  entity?: string;
  reportType?: string;
}

export const exportService = {
  /**
   * Exporta datos a PDF
   */
  async exportToPDF(options: ExportOptions): Promise<void> {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;

    // Colores del diseño (similar a RUAT)
    const headerBgColor = [20, 120, 130]; // Teal oscuro
    const accentColor = [255, 140, 0]; // Naranja
    const titleColor = [34, 139, 34]; // Verde
    const headerTextColor = [255, 255, 255]; // Blanco

    // ===== ENCABEZADO CON FONDO OSCURO =====
    doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Línea decorativa naranja
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 20, pageWidth, 2, 'F');

    // Logo/Nombre del sistema (izquierda)
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(APP_NAME, margin, 12);

    // Usuario conectado (izquierda, debajo del logo)
    if (options.usuario) {
      doc.setFontSize(9);
      doc.text(`USUARIO CONECTADO: ${options.usuario.toUpperCase()}`, margin, 18);
    }

    // Fecha del reporte (derecha)
    const fecha = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
    doc.setFontSize(9);
    const fechaText = `FECHA REPORTE: ${fecha}`;
    const fechaWidth = doc.getTextWidth(fechaText);
    doc.text(fechaText, pageWidth - margin - fechaWidth, 18);

    // ===== TÍTULO DEL REPORTE (Centrado, Verde) =====
    let yPos = 35;
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(options.title);
    doc.text(options.title, (pageWidth - titleWidth) / 2, yPos);
    yPos += 8;

    // Entidad/Empresa (centrado)
    if (options.entity) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const entityWidth = doc.getTextWidth(options.entity);
      doc.text(options.entity, (pageWidth - entityWidth) / 2, yPos);
      yPos += 6;
    }

    // Tipo de reporte (centrado)
    if (options.reportType) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const reportTypeWidth = doc.getTextWidth(options.reportType);
      doc.text(options.reportType, (pageWidth - reportTypeWidth) / 2, yPos);
      yPos += 6;
    }

    // Rango de fechas (centrado)
    if (options.dateRange?.desde || options.dateRange?.hasta) {
      let rangeText = 'DESDE: ';
      if (options.dateRange.desde && options.dateRange.hasta) {
        const desdeFormatted = options.dateRange.desde.includes('/') 
          ? options.dateRange.desde 
          : format(new Date(options.dateRange.desde + 'T00:00:00'), 'dd/MM/yyyy');
        const hastaFormatted = options.dateRange.hasta.includes('/') 
          ? options.dateRange.hasta 
          : format(new Date(options.dateRange.hasta + 'T00:00:00'), 'dd/MM/yyyy');
        rangeText += `${desdeFormatted} HASTA: ${hastaFormatted}`;
      } else if (options.dateRange.desde) {
        const desdeFormatted = options.dateRange.desde.includes('/') 
          ? options.dateRange.desde 
          : format(new Date(options.dateRange.desde + 'T00:00:00'), 'dd/MM/yyyy');
        rangeText += `${desdeFormatted}`;
      } else if (options.dateRange.hasta) {
        const hastaFormatted = options.dateRange.hasta.includes('/') 
          ? options.dateRange.hasta 
          : format(new Date(options.dateRange.hasta + 'T00:00:00'), 'dd/MM/yyyy');
        rangeText += `HASTA: ${hastaFormatted}`;
      }
      doc.setFontSize(10);
      const rangeWidth = doc.getTextWidth(rangeText);
      doc.text(rangeText, (pageWidth - rangeWidth) / 2, yPos);
      yPos += 8;
    }

    // Preparar datos para la tabla
    const headers = options.columns.map(col => col.header);
    const rows = options.data.map(item =>
      options.columns.map(col => {
        const value = this.getNestedValue(item, col.dataKey);
        return value !== null && value !== undefined ? String(value) : '-';
      })
    );

    // Calcular ancho total de la tabla para centrarla
    const totalTableWidth = options.columns.reduce((sum, col) => {
      return sum + (col.width || 30); // Usar ancho por defecto de 30mm si no está definido
    }, 0);

    // Calcular margen izquierdo para centrar la tabla
    const leftMargin = (pageWidth - totalTableWidth) / 2;

    // Crear tabla con estilo similar a RUAT
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: yPos + 3,
      margin: { left: Math.max(leftMargin, margin), right: Math.max(leftMargin, margin) },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: headerTextColor,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: options.columns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        return acc;
      }, {} as Record<number, { cellWidth: number }>),
    });

    // Guardar PDF
    const filename = options.filename || `${options.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    doc.save(filename);
  },

  /**
   * Exporta datos a Excel
   */
  async exportToExcel(options: ExportOptions): Promise<void> {
    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Preparar datos
    const headers = options.columns.map(col => col.header);
    const rows = options.data.map(item =>
      options.columns.map(col => {
        const value = this.getNestedValue(item, col.dataKey);
        return value !== null && value !== undefined ? value : '';
      })
    );

    // Crear worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar ancho de columnas
    const colWidths = options.columns.map(col => ({
      wch: col.width ? col.width / 5 : 15, // Convertir de mm a caracteres aproximados
    }));
    ws['!cols'] = colWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Crear hoja de información
    const infoData = [
      ['Información del Reporte'],
      [''],
      ['Título:', options.title],
      ['Fecha de Generación:', format(new Date(), 'dd/MM/yyyy HH:mm')],
    ];

    if (options.dateRange?.desde || options.dateRange?.hasta) {
      if (options.dateRange.desde && options.dateRange.hasta) {
        const desdeFormatted = options.dateRange.desde.includes('/') 
          ? options.dateRange.desde 
          : format(new Date(options.dateRange.desde + 'T00:00:00'), 'dd/MM/yyyy');
        const hastaFormatted = options.dateRange.hasta.includes('/') 
          ? options.dateRange.hasta 
          : format(new Date(options.dateRange.hasta + 'T00:00:00'), 'dd/MM/yyyy');
        infoData.push(['Período:', `${desdeFormatted} - ${hastaFormatted}`]);
      } else if (options.dateRange.desde) {
        const desdeFormatted = options.dateRange.desde.includes('/') 
          ? options.dateRange.desde 
          : format(new Date(options.dateRange.desde + 'T00:00:00'), 'dd/MM/yyyy');
        infoData.push(['Desde:', desdeFormatted]);
      } else if (options.dateRange.hasta) {
        const hastaFormatted = options.dateRange.hasta.includes('/') 
          ? options.dateRange.hasta 
          : format(new Date(options.dateRange.hasta + 'T00:00:00'), 'dd/MM/yyyy');
        infoData.push(['Hasta:', hastaFormatted]);
      }
    }

    // Agregar resumen estadístico si está disponible
    if (options.summary) {
      infoData.push(['']);
      infoData.push(['Resumen Estadístico']);
      if (options.summary.cantidadVentas !== undefined) {
        infoData.push(['Total de Ventas:', options.summary.cantidadVentas]);
      }
      if (options.summary.totalVentas !== undefined) {
        infoData.push(['Total Vendido:', `Bs. ${options.summary.totalVentas.toFixed(2)}`]);
      }
      if (options.summary.ticketPromedio !== undefined) {
        infoData.push(['Promedio de Ventas:', `Bs. ${options.summary.ticketPromedio.toFixed(2)}`]);
      }
    }

    const infoWs = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, infoWs, 'Información', 0); // Insertar al inicio

    // Guardar archivo
    const filename = options.filename || `${options.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  /**
   * Obtiene un valor anidado de un objeto usando una ruta de claves
   */
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  },
};

