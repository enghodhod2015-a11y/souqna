import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel, exportToPDF, exportToCSV } from '../../services/exportService';
import toast from 'react-hot-toast';

export const ExportButtons = ({ data, filename, title, columns, showCSV = false }) => {
  const handleExport = (type) => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    try {
      switch (type) {
        case 'excel':
          exportToExcel(data, filename);
          toast.success('تم تصدير ملف Excel بنجاح');
          break;
        case 'pdf':
          exportToPDF(data, title, filename, columns);
          toast.success('تم تصدير ملف PDF بنجاح');
          break;
        case 'csv':
          exportToCSV(data, filename);
          toast.success('تم تصدير ملف CSV بنجاح');
          break;
        default:
          break;
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={() => handleExport('excel')} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1" size="sm">
        <FileSpreadsheet size={16} /> Excel
      </Button>
      <Button onClick={() => handleExport('pdf')} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1" size="sm">
        <FileText size={16} /> PDF
      </Button>
      {showCSV && (
        <Button onClick={() => handleExport('csv')} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1" size="sm">
          <Download size={16} /> CSV
        </Button>
      )}
    </div>
  );
};

