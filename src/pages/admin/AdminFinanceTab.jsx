import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ExportButtons } from '../../components/ui/ExportButtons';

export default function AdminFinanceTab({ selectedSeller, setSelectedSeller, navigate }) {
  const queryClient = useQueryClient();

  // Finance related
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState(10);
  const [sellerFinance, setSellerFinance] = useState({
    totalSales: 0,
    totalReturns: 0,
    commissionAmount: 0,
    totalReceived: 0,
    remaining: 0,
  });
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [sellerReceiptsList, setSellerReceiptsList] = useState([]);

  // جلب المستخدمين (البائعين فقط)
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsersForFinance'],
    queryFn: async () => {
      const { data, error } = await supabase
       .from('profiles')
       .select('id, full_name, email, store_name, commission_percent')
       .eq('account_type', 'seller')
       .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const sellerUsers = users || [];

  // تحديث نسبة العمولة وإعادة الحساب عند تغيير البائع
  useEffect(() => {
    if (selectedSeller) {
      const savedPercent = selectedSeller.commission_percent;
      setSellerCommissionPercent(savedPercent!== undefined && savedPercent!== null? savedPercent : 10);
      calculateFinance();
    } else {
      // إعادة تعيين البيانات إذا لم يكن هناك بائع محدد
      setSellerFinance({
        totalSales: 0,
        totalReturns: 0,
        commissionAmount: 0,
        totalReceived: 0,
        remaining: 0,
      });
    }
  }, [selectedSeller]);

  const calculateFinance = async () => {
    if (!selectedSeller?.id) return;
    try {
      const sellerId = selectedSeller.id;
      const { data: products } = await supabase
       .from('products')
       .select('id')
       .eq('seller_id', sellerId);
      const productIds = products?.map(p => p.id) || [];
      let totalSales = 0, totalReturns = 0;
      if (productIds.length) {
        const { data: orderItemsData } = await supabase
         .from('order_items')
         .select('order_id, product_price, quantity')
         .in('product_id', productIds);
        if (orderItemsData?.length) {
          const orderIds = [...new Set(orderItemsData.map(i => i.order_id))];
          const { data: orders } = await supabase
           .from('orders')
           .select('id, status, return_status')
           .in('id', orderIds);
          const orderMap = new Map(orders?.map(o => [o.id, o]) || []);
          for (const item of orderItemsData) {
            const order = orderMap.get(item.order_id);
            if (order) {
              if (order.status === 'completed' || order.status === 'delivered')
                totalSales += item.product_price * item.quantity;
              if (order.return_status === 'approved')
                totalReturns += item.product_price * item.quantity;
            }
          }
        }
      }
      const netAfterReturns = totalSales - totalReturns;
      const commissionAmount = netAfterReturns * (sellerCommissionPercent / 100);
      const { data: transfers } = await supabase
       .from('seller_transfers')
       .select('amount')
       .eq('seller_id', sellerId);
      const totalReceived = transfers?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const remaining = netAfterReturns - commissionAmount - totalReceived;
      setSellerFinance({ totalSales, totalReturns, commissionAmount, totalReceived, remaining });
    } catch (err) {
      console.error(err);
      toast.error('خطأ في حساب المالية');
    }
  };

  const updateUserMutation = async ({ userId, updates }) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    toast.success('تم تحديث نسبة العمولة');
    if (selectedSeller?.id === userId) {
      setSelectedSeller(prev => ({...prev,...updates }));
      if (updates.commission_percent!== undefined) {
        setSellerCommissionPercent(updates.commission_percent);
        await calculateFinance();
      }
    }
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['adminUsersForFinance'] });
  };

  const handleAddTransfer = async () => {
    if (!selectedSeller) return toast.error('اختر بائعاً أولاً');
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    if (!receiptFile) return toast.error('يرجى اختيار صورة الإيصال');
    setUploading(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `seller_transfers/${selectedSeller.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
       .from('receipts')
       .upload(fileName, receiptFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } = supabase.storage.from('receipts').getPublicUrl(fileName);
      const { error: insertError } = await supabase.from('seller_transfers').insert({
        seller_id: selectedSeller.id,
        amount: amountNum,
        receipt_image: publicUrl,
        notes: transferNote,
      });
      if (insertError) throw insertError;
      toast.success('تم تسجيل التحويل بنجاح');
      setTransferAmount('');
      setTransferNote('');
      setReceiptFile(null);
      document.getElementById('receiptFileInput').value = '';
      await calculateFinance();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadSellerReceipts = async () => {
    if (!selectedSeller) return;
    const { data } = await supabase
     .from('seller_transfers')
     .select('*')
     .eq('seller_id', selectedSeller.id)
     .order('created_at', { ascending: false });
    setSellerReceiptsList(data || []);
    setShowReceiptsModal(true);
  };

  if (usersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonText width="w-48" height="h-5" className="mb-2" />
          <Skeleton className="w-full md:w-1/2 h-12 rounded-lg" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border-gold/20 space-y-3">
            <SkeletonText width="w-36" height="h-6" />
            <SkeletonText width="w-full" height="h-10" />
            <SkeletonText width="w-full" height="h-10" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="w-full h-12 rounded-lg" />
          </div>
          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border-gold/20 space-y-3">
            <div className="flex justify-between">
              <SkeletonText width="w-32" height="h-6" />
              <Skeleton className="w-24 h-8 rounded-lg" />
            </div>
            <SkeletonText width="w-full" height="h-12" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // رسالة إذا لم يوجد بائعون
  if (sellerUsers.length === 0) {
    return (
      <div className="text-center text-text-secondary p-8 bg-primary-card rounded-2xl">
        ⚠️ لا يوجد بائعون مسجلون في النظام بعد.
      </div>
    );
  }

  const financeRows = selectedSeller? [
    { 'القسم': 'إجمالي المبيعات', 'المبلغ': formatCurrency(sellerFinance.totalSales), 'العملة': 'ريال يمني' },
    { 'القسم': 'إجمالي المرتجعات', 'المبلغ': formatCurrency(sellerFinance.totalReturns), 'العملة': 'ريال يمني' },
    { 'القسم': `نسبة الموقع (${sellerCommissionPercent}%)`, 'المبلغ': formatCurrency(sellerFinance.commissionAmount), 'العملة': 'ريال يمني' },
    { 'القسم': 'إجمالي الاستلامات', 'المبلغ': formatCurrency(sellerFinance.totalReceived), 'العملة': 'ريال يمني' },
    { 'القسم': 'المبلغ المتبقي', 'المبلغ': formatCurrency(sellerFinance.remaining), 'العملة': 'ريال يمني' },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <label className="block text-gold font-medium mb-2">اختر البائع لتسوية حسابه:</label>
        <Select
          value={selectedSeller?.id || ''}
          onChange={e => {
            const sellerId = e.target.value;
            const seller = sellerUsers.find(u => u.id === sellerId);
            setSelectedSeller(seller || null);
          }}
          className="w-full md:w-1/2 bg-white text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
        >
          <option value="" className="text-black">-- اختر بائعاً --</option>
          {sellerUsers.map(s => (
            <option key={s.id} value={s.id} className="text-black">
              {s.store_name || s.full_name} ({s.email})
            </option>
          ))}
        </Select>
      </div>

      {selectedSeller? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border-gold/20">
            <h3 className="text-lg font-bold text-gold mb-4">تسديد حساب البائع</h3>
            <div className="space-y-3">
              <Input
                label="المبلغ (ريال يمني)"
                type="number"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="bg-white text-gray-900 border-gray-300 focus:ring-gold"
              />
              <Input
                label="الملاحظات"
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                placeholder="اختياري"
                className="bg-white text-gray-900 border-gray-300"
              />
              <div>
                <label className="block mb-1 text-text-secondary">رفع سند التحويل</label>
                <input
                  type="file"
                  accept="image/*"
                  id="receiptFileInput"
                  onChange={e => setReceiptFile(e.target.files[0])}
                  className="bg-white text-gray-900 rounded-lg px-3 py-2 w-full border-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gold file:text-primary-blue hover:file:bg-gold/90"
                />
              </div>
              <Button onClick={handleAddTransfer} disabled={uploading} className="w-full bg-gold text-primary-blue shadow-md hover:bg-gold/90 transition-all">
                {uploading? 'جاري الرفع...' : 'إدخال'}
              </Button>
            </div>
          </div>

          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border-gold/20">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gold">ملخص حسابات البائع</h3>
              <div className="flex gap-2">
                <ExportButtons
                  data={financeRows}
                  filename={`seller_finance_${selectedSeller.id}`}
                  title={`ملخص حسابات البائع: ${selectedSeller.full_name}`}
                  columns={[
                    { header: 'القسم', dataKey: 'القسم' },
                    { header: 'المبلغ', dataKey: 'المبلغ' },
                    { header: 'العملة', dataKey: 'العملة' }
                  ]}
                  showCSV
                />
                <Button variant="secondary" onClick={loadSellerReceipts} className="bg-gray-700 hover:bg-gray-600 text-white shadow">
                  الاستعلام عن التحويلات
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gold mb-2">نسبة الموقع (%)</label>
              <div className="flex items-end gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={sellerCommissionPercent}
                  onChange={e => {
                    const newPercent = parseFloat(e.target.value) || 0;
                    setSellerCommissionPercent(newPercent);
                  }}
                  className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-2 border-gray-300 focus:ring-2 focus:ring-gold focus:border-gold"
                />
                <Button
                  onClick={async () => {
                    await updateUserMutation({
                      userId: selectedSeller.id,
                      updates: { commission_percent: sellerCommissionPercent }
                    });
                    toast.success('تم حفظ نسبة الموقع');
                  }}
                  className="bg-gold text-primary-blue shadow-md rounded-lg px-5 py-2 hover:bg-gold/90 transition-all whitespace-nowrap"
                >
                  تحديث النسبة
                </Button>
              </div>
              <p className="text-text-secondary text-sm mt-2">* سيتم إعادة حساب العمولة والمبلغ المتبقي فوراً</p>
            </div>

            <table className="w-full text-right mt-4">
              <thead>
                <tr className="border-b border-gold/30">
                  <th className="py-2 text-gold">القسم</th>
                  <th className="py-2 text-gold">المبلغ</th>
                  <th className="py-2 text-gold">العملة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-bold">إجمالي المبيعات</td>
                  <td className="text-white">{formatCurrency(sellerFinance.totalSales)}</td>
                  <td className="text-white">ريال يمني</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold">إجمالي المرتجعات</td>
                  <td className="text-white">{formatCurrency(sellerFinance.totalReturns)}</td>
                  <td className="text-white">ريال يمني</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold">نسبة الموقع ({sellerCommissionPercent}%)</td>
                  <td className="text-white">{formatCurrency(sellerFinance.commissionAmount)}</td>
                  <td className="text-white">ريال يمني</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold">إجمالي الاستلامات</td>
                  <td className="text-white">{formatCurrency(sellerFinance.totalReceived)}</td>
                  <td className="text-white">ريال يمني</td>
                </tr>
                <tr className="border-t border-gold/30">
                  <td className="py-2 font-bold text-gold">المبلغ المتبقي</td>
                  <td className="font-bold text-gold">{formatCurrency(sellerFinance.remaining)}</td>
                  <td className="text-gold">ريال يمني</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-secondary p-8">يرجى اختيار بائع لعرض بياناته المالية</div>
      )}

      {showReceiptsModal && (
        <Modal onClose={() => setShowReceiptsModal(false)} title="إيصالات تحويل البائع">
          <table className="w-full text-right">
            <thead>
              <tr>
                <th className="py-2 text-gold">المبلغ</th>
                <th className="py-2 text-gold">التاريخ</th>
                <th className="py-2 text-gold">الصورة</th>
                <th className="py-2 text-gold">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {sellerReceiptsList.map(r => (
                <tr key={r.id}>
                  <td className="text-gray-800">{formatCurrency(r.amount)}</td>
                  <td className="text-gray-800">{formatDate(r.created_at)}</td>
                  <td><a href={r.receipt_image} target="_blank" rel="noreferrer" className="text-blue-500 underline">عرض</a></td>
                  <td className="text-gray-800">{r.notes || '-'}</td>
                </tr>
              ))}
              {sellerReceiptsList.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500">لا توجد إيصالات</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 text-left">
            <Button variant="secondary" onClick={() => setShowReceiptsModal(false)}>إغلاق</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

