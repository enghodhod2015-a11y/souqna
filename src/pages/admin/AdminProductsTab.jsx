import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Send } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { ExportButtons } from '../../components/ui/ExportButtons';

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

  const { data: orderItems = [], isLoading } = useQuery({
    queryKey: ['adminOrderItems', sellerFilterId, productFilterStatus],
    queryFn: async () => {
      try {
        let query = supabase
          .from('order_items')
          .select('id, order_id, product_id, product_price, quantity')
          .order('order_id', { ascending: false });
        let orderItemsData = await query;
        if (orderItemsData.error) throw orderItemsData.error;
        let items = orderItemsData.data || [];
        if (items.length === 0) return [];

        const orderIds = [...new Set(items.map(i => i.order_id))];
        const productIds = [...new Set(items.map(i => i.product_id))];

        const { data: orders, error: ordersErr } = await supabase
          .from('orders')
          .select('id, status, created_at, user_id')
          .in('id', orderIds);
        if (ordersErr) throw ordersErr;
        const ordersMap = new Map(orders?.map(o => [o.id, o]) || []);

        const { data: products, error: productsErr } = await supabase
          .from('products')
          .select('id, name, price, seller_id, seller:profiles!products_seller_id_fkey (id, full_name)')
          .in('id', productIds);
        if (productsErr) throw productsErr;
        const productsMap = new Map(products?.map(p => [p.id, p]) || []);

        const buyerIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
        const { data: buyers, error: buyersErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', buyerIds);
        if (buyersErr) throw buyersErr;
        const buyersMap = new Map(buyers?.map(b => [b.id, b]) || []);

        let results = items.map(item => {
          const order = ordersMap.get(item.order_id);
          const product = productsMap.get(item.product_id);
          const buyer = buyersMap.get(order?.user_id);
          return {
            id: item.id,
            product_name: product?.name || 'غير معروف',
            seller_name: product?.seller?.full_name || 'غير معروف',
            order_date: order?.created_at,
            unit_price: item.product_price,
            quantity: item.quantity,
            total_price: item.product_price * item.quantity,
            order_status: order?.status || 'غير معروف',
            buyer_name: buyer?.full_name || 'غير معروف',
            buyer_email: buyer?.email,
            order_id: order?.id || item.order_id,
            seller_id: product?.seller_id || null,
            buyer_id: order?.user_id,
          };
        });

        if (productFilterStatus !== 'all') {
          const statusMap = {
            pending_payment: ['pending', 'pending_payment_review'],
            payment_approved: ['payment_approved'],
            processing: ['processing'],
            shipped: ['shipped'],
            delivered: ['delivered'],
            completed: ['completed'],
            cancelled: ['cancelled'],
            returned: ['return_requested', 'return_approved'],
          };
          const targetStatuses = statusMap[productFilterStatus] || [];
          if (targetStatuses.length) {
            results = results.filter(r => targetStatuses.includes(r.order_status));
          }
        }

        if (sellerFilterId) {
          results = results.filter(r => r.seller_name !== 'غير معروف');
        }

        results.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        return results;
      } catch (err) {
        console.error('خطأ في جلب عناصر الطلبات:', err);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const sendNotificationToUser = async (userId, message, title = 'إشعار من الإدارة', type = 'info', relatedId = null) => {
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminId = adminUser.id;
    let conversationId = null;

    const { data: existingList, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${adminId},seller_id.eq.${userId}`)
      .limit(1);

    if (findError) {
      console.error('خطأ في البحث عن المحادثة:', findError);
      toast.error('فشل البحث عن محادثة');
      return;
    }

    if (existingList && existingList.length > 0) {
      conversationId = existingList[0].id;
      await supabase
        .from('conversations')
        .update({ last_message: message, last_message_at: new Date() })
        .eq('id', conversationId);
    } else {
      const { data: newConv, error: insertError } = await supabase
        .from('conversations')
        .insert({
          buyer_id: adminId,
          seller_id: userId,
          product_id: relatedId || null,
          last_message: message,
          last_message_at: new Date()
        })
        .select()
        .single();

      if (insertError) {
        console.error('خطأ في إنشاء المحادثة:', insertError);
        toast.error('فشل إنشاء محادثة جديدة');
        return;
      }
      conversationId = newConv.id;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: type,
        title,
        message,
        related_id: conversationId.toString(),
      });
    } catch (notifErr) {
      console.error('خطأ في إدراج الإشعار:', notifErr);
    }

    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: adminId,
      receiver_id: userId,
      message,
    });

    if (msgError) {
      console.error('خطأ في إدراج الرسالة:', msgError);
      toast.error('فشل إرسال الرسالة، لكن الإشعار قد يصل');
    } else {
      toast.success('تم إرسال الإشعار والرسالة بنجاح');
    }
  };

  const sendNotificationForOrderItem = async (item) => {
    if (!item) {
      toast.error('بيانات الطلب غير موجودة');
      return;
    }
    if (!item.seller_id) {
      toast.error('رقم البائع غير متوفر لهذا الطلب، لا يمكن إرسال الإشعار');
      return;
    }
    if (!item.order_id) {
      toast.error('رقم الطلب غير متوفر، لا يمكن إرسال الإشعار');
      return;
    }
    const adminMessage = prompt('أدخل نص الإشعار الذي سيتم إرساله إلى البائع بخصوص هذا الطلب:');
    if (!adminMessage) return;
    const fullMessage = `📦 **المنتج:** ${item.product_name || 'غير معروف'}\n🆔 **رقم الطلب:** ${item.order_id}\n📋 **الحالة:** ${item.order_status || 'غير معروفة'}\n✉️ **رسالة الإدارة:** ${adminMessage}`;
    await sendNotificationToUser(
      item.seller_id,
      fullMessage,
      `طلب #${item.order_id} - ${item.product_name || 'منتج'}`,
      'order_status',
      item.order_id
    );
  };

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

  // إعداد بيانات التصدير (تحويل الأعمدة إلى تنسيق مناسب)
  const exportData = orderItems.map(item => ({
    'اسم المنتج': item.product_name,
    'البائع': item.seller_name,
    'تاريخ العملية': item.order_date ? formatDate(item.order_date) : '-',
    'سعر الوحدة (ريال)': item.unit_price,
    'الكمية': item.quantity,
    'الإجمالي (ريال)': item.total_price,
    'المشتري': item.buyer_name,
    'حالة الطلب': item.order_status,
  }));

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div className="flex gap-3 items-center">
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
        <ExportButtons 
          data={exportData} 
          filename="order_items_report" 
          title="تقرير عناصر الطلبات"
          columns={[
            { header: 'اسم المنتج', dataKey: 'اسم المنتج' },
            { header: 'البائع', dataKey: 'البائع' },
            { header: 'تاريخ العملية', dataKey: 'تاريخ العملية' },
            { header: 'سعر الوحدة (ريال)', dataKey: 'سعر الوحدة (ريال)' },
            { header: 'الكمية', dataKey: 'الكمية' },
            { header: 'الإجمالي (ريال)', dataKey: 'الإجمالي (ريال)' },
            { header: 'المشتري', dataKey: 'المشتري' },
            { header: 'حالة الطلب', dataKey: 'حالة الطلب' }
          ]}
          showCSV
        />
      </div>

      <div className="bg-primary-card rounded-2xl shadow-lg border border-gold/20 overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-gold/30 bg-secondary-blue/30">
              <th className="p-3 text-gold">اسم المنتج</th>
              <th className="p-3 text-gold">البائع</th>
              <th className="p-3 text-gold">تاريخ العملية</th>
              <th className="p-3 text-gold">سعر الوحدة</th>
              <th className="p-3 text-gold">الكمية</th>
              <th className="p-3 text-gold">الإجمالي</th>
              <th className="p-3 text-gold">المشتري</th>
              <th className="p-3 text-gold">حالة الطلب</th>
              <th className="p-3 text-gold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orderItems?.map(item => (
              <tr key={item.id} className="border-b border-gold/20 hover:bg-secondary-blue/10 transition">
                <td className="p-3 text-white">{item.product_name}</td>
                <td className="p-3 text-white">{item.seller_name}</td>
                <td className="p-3 text-white">{item.order_date ? formatDate(item.order_date) : '-'}</td>
                <td className="p-3 text-white">{formatCurrency(item.unit_price)}</td>
                <td className="p-3 text-white">{item.quantity}</td>
                <td className="p-3 text-white">{formatCurrency(item.total_price)}</td>
                <td className="p-3 text-white">{item.buyer_name}</td>
                <td className="p-3 text-white">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.order_status === 'completed' ? 'bg-green-600' :
                    item.order_status === 'processing' ? 'bg-yellow-600' :
                    item.order_status === 'pending_payment_review' ? 'bg-orange-600' :
                    item.order_status === 'cancelled' ? 'bg-red-600' : 'bg-gray-600'
                  }`}>
                    {item.order_status}
                  </span>
                </td>
                <td className="p-3">
                  <Button
                    onClick={() => sendNotificationForOrderItem(item)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1"
                  >
                    <Send size={12} className="inline ml-1" /> إرسال إشعار للبائع
                  </Button>
                </td>
              </tr>
            ))}
            {(!orderItems || orderItems.length === 0) && (
              <tr>
                <td colSpan="9" className="text-center p-6 text-text-secondary">لا توجد عناصر طلبات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

