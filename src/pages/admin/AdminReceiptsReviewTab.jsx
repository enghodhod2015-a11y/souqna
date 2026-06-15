import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingAdminReceipts, reviewReceiptByAdmin } from '../../services/orderService';
import { Button } from '../../components/ui/Button';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminReceiptsReviewTab() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['pendingAdminReceipts'],
    queryFn: getPendingAdminReceipts,
    staleTime: 30 * 1000,
  });

  const handleApprove = async (orderId) => {
    if (window.confirm('هل أنت متأكد من قبول هذا الإيصال؟ سيتم إرسال الطلب للبائع.')) {
      try {
        await reviewReceiptByAdmin(orderId, true);
        toast.success('تم قبول الإيصال، أصبح الطلب قيد التجهيز للبائع');
        refetch();
        queryClient.invalidateQueries(['adminDashboard']);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleReject = async (orderId) => {
    const reason = prompt('أدخل سبب الرفض (سيظهر للمشتري):');
    if (reason === null) return;
    if (window.confirm('هل أنت متأكد من رفض هذا الإيصال؟ سيتم إلغاء الطلب.')) {
      try {
        await reviewReceiptByAdmin(orderId, false, reason);
        toast.success('تم رفض الإيصال وتم إلغاء الطلب');
        refetch();
        queryClient.invalidateQueries(['adminDashboard']);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (orders.length === 0) {
    return <div className="text-center p-8 text-text-secondary">لا توجد إيصالات معلقة للمراجعة</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gold">مراجعة إيصالات الدفع</h2>
      {orders.map(order => (
        <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p><strong className="text-gold">رقم الطلب:</strong> {order.id}</p>
              <p><strong className="text-gold">المشتري:</strong> {order.buyer?.full_name} ({order.buyer?.phone || 'لا يوجد'})</p>
              <p><strong className="text-gold">المبلغ:</strong> {formatCurrency(order.total_amount)}</p>
              <p><strong className="text-gold">رقم الحوالة:</strong> {order.transfer_number || 'غير مدخل'}</p>
              <p><strong className="text-gold">اسم المحول:</strong> {order.transfer_name || 'غير مدخل'}</p>
              <p><strong className="text-gold">تاريخ الرفع:</strong> {formatDate(order.receipt_uploaded_at)}</p>
            </div>
            <div className="flex flex-col gap-2">
              {order.receipt_image && (
                <a href={order.receipt_image} target="_blank" rel="noreferrer" className="text-gold underline flex items-center gap-1">
                  <Eye size={16} /> عرض الإيصال
                </a>
              )}
              <div className="flex gap-2 mt-2">
                <Button onClick={() => handleApprove(order.id)} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                  <CheckCircle size={16} /> قبول
                </Button>
                <Button onClick={() => handleReject(order.id)} variant="danger" className="flex items-center gap-1">
                  <XCircle size={16} /> رفض
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-text-secondary">
            <strong>المنتجات:</strong> {order.order_items?.map(i => i.product_name).join(', ') || 'غير معروف'}
          </div>
        </div>
      ))}
    </div>
  );
}

