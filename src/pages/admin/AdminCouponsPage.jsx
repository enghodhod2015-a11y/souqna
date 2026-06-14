import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../services/couponService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 0,
    max_discount: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    usage_limit: 1,
    is_active: true
  });

  const { data: coupons, isLoading, refetch } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: getAllCoupons,
    staleTime: 1 * 60 * 1000,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        usage_limit: parseInt(formData.usage_limit) || 1,
        is_active: formData.is_active
      };
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, dataToSend);
        toast.success('تم تحديث القسيمة');
      } else {
        await createCoupon(dataToSend);
        toast.success('تم إنشاء القسيمة');
      }
      setShowModal(false);
      setEditingCoupon(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذه القسيمة؟')) {
      try {
        await deleteCoupon(id);
        toast.success('تم حذف القسيمة');
        refetch();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount || '',
      start_date: new Date(coupon.start_date).toISOString().slice(0, 16),
      end_date: coupon.end_date ? new Date(coupon.end_date).toISOString().slice(0, 16) : '',
      usage_limit: coupon.usage_limit,
      is_active: coupon.is_active
    });
    setShowModal(true);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">إدارة القسائم الترويجية</h1>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-white">
            <RefreshCw size={16} className="inline ml-1" /> تحديث
          </Button>
          <Button onClick={() => { setEditingCoupon(null); setFormData({ code: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_discount: '', start_date: new Date().toISOString().slice(0, 16), end_date: '', usage_limit: 1, is_active: true }); setShowModal(true); }} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus size={16} className="inline ml-1" /> إضافة قسيمة
          </Button>
        </div>
      </div>

      <div className="bg-primary-card rounded-2xl shadow-lg border border-gold/20 overflow-x-auto">
        <table className="w-full text-right">
          <thead className="border-b border-gold/30 bg-secondary-blue/30">
            <tr>
              <th className="p-3 text-gold">الكود</th>
              <th className="p-3 text-gold">النوع</th>
              <th className="p-3 text-gold">القيمة</th>
              <th className="p-3 text-gold">الحد الأدنى</th>
              <th className="p-3 text-gold">الحد الأقصى للخصم</th>
              <th className="p-3 text-gold">الصلاحية</th>
              <th className="p-3 text-gold">الاستخدامات</th>
              <th className="p-3 text-gold">الحالة</th>
              <th className="p-3 text-gold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {coupons?.map(coupon => (
              <tr key={coupon.id} className="border-b border-gold/20 hover:bg-secondary-blue/10">
                <td className="p-3 text-white font-mono">{coupon.code}</td>
                <td className="p-3 text-white">{coupon.discount_type === 'percentage' ? 'نسبة مئوية' : 'قيمة ثابتة'}</td>
                <td className="p-3 text-white">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} ريال`}</td>
                <td className="p-3 text-white">{coupon.min_order_amount || 0} ريال</td>
                <td className="p-3 text-white">{coupon.max_discount ? `${coupon.max_discount} ريال` : 'لا يوجد'}</td>
                <td className="p-3 text-white">
                  {formatDate(coupon.start_date)}<br/>
                  {coupon.end_date ? `→ ${formatDate(coupon.end_date)}` : 'دائم'}
                </td>
                <td className="p-3 text-white">{coupon.used_count} / {coupon.usage_limit}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${coupon.is_active ? 'bg-green-600' : 'bg-red-600'}`}>
                    {coupon.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => openEditModal(coupon)} className="text-gold hover:text-gold/80"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(coupon.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {(!coupons || coupons.length === 0) && (
              <tr><td colSpan="9" className="text-center p-6 text-text-secondary">لا توجد قسائم</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* تحسين الـ Modal: أزرار واضحة وزر إغلاق يعمل */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gold/30 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gold">{editingCoupon ? 'تعديل قسيمة' : 'إضافة قسيمة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="الكود" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">نوع الخصم</label>
                  <select value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900">
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">قيمة ثابتة (ريال)</option>
                  </select>
                </div>
                <Input label="قيمة الخصم" type="number" step="0.01" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="الحد الأدنى للطلب (ريال)" type="number" step="0.01" value={formData.min_order_amount} onChange={e => setFormData({...formData, min_order_amount: e.target.value})} />
                <Input label="الحد الأقصى للخصم (ريال)" type="number" step="0.01" value={formData.max_discount} onChange={e => setFormData({...formData, max_discount: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">تاريخ البدء</label>
                  <input type="datetime-local" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
                  <input type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="عدد مرات الاستخدام المسموحة" type="number" min="1" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} required />
                <div>
                  <label className="block text-gray-700 mb-1">الحالة</label>
                  <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900">
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="bg-gray-500 hover:bg-gray-600 text-white">
                  إلغاء
                </Button>
                <Button type="submit" className="bg-gold text-primary-blue hover:bg-gold/90">
                  {editingCoupon ? 'حفظ التغييرات' : 'إنشاء قسيمة'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

