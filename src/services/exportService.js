import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// تصدير إلى Excel (XLSX)
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير');
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// تصدير إلى PDF (جدول)
export const exportToPDF = (data, title, filename, columns = null) => {
  if (!data || data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // عنوان التقرير
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55); // لون ذهبي
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // التاريخ
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleString('ar-EG');
  doc.text(`تاريخ التقرير: ${dateStr}`, pageWidth - 20, 25, { align: 'right' });

  // تحديد الأعمدة والعناوين
  let tableColumns = columns;
  if (!tableColumns && data.length > 0) {
    tableColumns = Object.keys(data[0]).map(key => ({ header: key, dataKey: key }));
  }

  // تنسيق عربي
  autoTable(doc, {
    columns: tableColumns,
    body: data,
    startY: 35,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'right' },
    headStyles: { fillColor: [6, 38, 77], textColor: 255, fontStyle: 'bold', halign: 'right' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { right: 10, left: 10 },
    tableWidth: 'auto',
  });

  doc.save(`${filename}.pdf`);
};

// تصدير CSV (كبديل بسيط)
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير');
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] || '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

