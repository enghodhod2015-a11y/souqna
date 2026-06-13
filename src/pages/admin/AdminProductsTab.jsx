import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Send } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { SkeletonText, Skeleton } from '../../components/ui/Skeleton';

export default function AdminProductsTab({ sellerFilterId, setSellerFilterId, navigate }) {
  const [productFilterStatus, setProductFilterStatus] = useState('all');
  const orderStatusOptions = [
    { value: 'all', label: 'جميع الطلبات' },
    { value: 'pending_payment', label: 'منتظرة الدفع' },
    { value: 'payment_approved', label: 'تم تأكيد الدفع' },
    { value: 'processing', label: 'قيد التجهيز' },
    { value: 'shipped', label: 'تم الشحن' },
    { value: 'delivered', label: 'تم التسليم' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'cancelled', label: 'ملغي' },
    { value: 'returned', label: 'مسترجع' },
  ];

  const { data: orderItems = [], refetch: refetchOrderItems, isLoading } = useQuery({
    queryKey: ['adminOrderItems', sellerFilterId, productFilterStatus],
    queryFn: async () => {
      // ... نفس الكود الأصلي ...
      // (محذوف للاختصار، لكنه موجود مسبقاً)
    },
    staleTime: 2 * 60 * 1000,
  });

  // ... باقي الدوال (sendNotificationToUser, sendNotificationForOrderItem) ...

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="w-48 h-10 rounded-lg" />
          <Skeleton className="w-48 h-10 rounded-lg" />
        </div>
        <Skeleton className="w-full h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <label className="text-gold font-medium">فلترة حسب حالة الطلب:</label>
        <select
          value={productFilterStatus}
          onChange={e => setProductFilterStatus(e.target.value)}
          className="bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gold focus:border-gold"
        >
          {orderStatusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {sellerFilterId && (
          <Button variant="secondary" onClick={() => setSellerFilterId(null)} className="bg-gray-700 hover:bg-gray-600 text-white shadow">
            إلغاء فلتر البائع
          </Button>
        )}
      </div>

      <div className="bg-primary-card rounded-2xl shadow-lg border border-gold/20 overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-gold/30 bg-secondary-blue/30">
              <th className="p-3 text-gold">اسم المنتج</th><th className="p-3 text-gold">البائع</th>
              <th className="p-3 text-gold">تاريخ العملية</th><th className="p-3 text-gold">سعر الوحدة</th>
              <th className="p-3 text-gold">الكمية</th><th className="p-3 text-gold">الإجمالي</th>
              <th className="p-3 text-gold">المشتري</th><th className="p-3 text-gold">حالة الطلب</th>
              <th className="p-3 text-gold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orderItems?.map(item => (
              // ... عرض الصفوف ...
            ))}
            {(!orderItems || orderItems.length === 0) && (
              <tr><td colSpan="9" className="text-center p-6 text-text-secondary">لا توجد عناصر طلبات</td>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}


