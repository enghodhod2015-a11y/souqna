// src/pages/admin/AdminUsersTab.jsx
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Send, Search, UserCog } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { SkeletonText, Skeleton } from '../../components/ui/Skeleton';

export default function AdminUsersTab({
  activeSubTab,
  setActiveSubTab,
  searchTerm,
  setSearchTerm,
  selectedSeller,
  setSelectedSeller,
  selectedBuyer,
  setSelectedBuyer,
  sellerFilterId,
  setSellerFilterId,
  navigate
}) {
  const queryClient = useQueryClient();
  const [sellerDetailTab, setSellerDetailTab] = useState('profile');
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState(10);
  const [sellerStats, setSellerStats] = useState({
    totalProducts: 0,
    soldProducts: 0,
    shippingProducts: 0,
    notShippedWithReceipt: 0,
    noReceiptPurchased: 0,
    notPurchased: 0,
    pendingPayment: 0,
    paymentApproved: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });

  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) throw error;
      for (const user of data) {
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        user.order_count = orderCount || 0;
        const { data: spentData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('user_id', user.id)
          .eq('status', 'completed');
        user.total_spent = spentData?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      }
      return data;
    },
    enabled: activeSubTab !== 'pending_users',
    staleTime: 2 * 60 * 1000,
  });

  const { data: pendingSellers = [], refetch: refetchPendingSellers } = useQuery({
    queryKey: ['pendingSellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'seller')
        .eq('is_verified', false);
      if (error) throw error;
      return data || [];
    },
    enabled: activeSubTab === 'pending_users',
    staleTime: 1 * 60 * 1000,
  });

  useEffect(() => {
    if (!selectedSeller?.id) return;
    const fetchSellerStats = async () => {
      try {
        const sellerId = selectedSeller.id;
        const { data: productsList, error: prodErr } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', sellerId);
        if (prodErr) throw prodErr;
        const totalProducts = productsList?.length || 0;
        const productIds = productsList?.map(p => p.id) || [];

        if (productIds.length === 0) {
          setSellerStats(prev => ({ ...prev, totalProducts: 0, soldProducts: 0, notPurchased: 0 }));
          return;
        }

        const { data: orderItemsData, error: oiErr } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity')
          .in('product_id', productIds);
        if (oiErr) throw oiErr;

        if (!orderItemsData || orderItemsData.length === 0) {
          setSellerStats({
            totalProducts,
            soldProducts: 0,
            pendingPayment: 0,
            paymentApproved: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            notPurchased: totalProducts,
            shippingProducts: 0,
            notShippedWithReceipt: 0,
            noReceiptPurchased: 0,
          });
          return;
        }

        const orderIds = [...new Set(orderItemsData.map(oi => oi.order_id))];
        const { data: orders, error: ordErr } = await supabase
          .from('orders')
          .select('id, status')
          .in('id', orderIds);
        if (ordErr) throw ordErr;
        const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

        let soldProducts = 0;
        const productSoldSet = new Set();
        const statusCount = {
          pending_payment_review: new Set(),
          payment_approved: new Set(),
          processing: new Set(),
          shipped: new Set(),
          delivered: new Set(),
        };

        for (const item of orderItemsData) {
          const order = orderMap.get(item.order_id);
          if (!order) continue;
          productSoldSet.add(item.product_id);
          if (order.status === 'completed' || order.status === 'delivered') {
            soldProducts += item.quantity;
          }
          if (statusCount[order.status]) statusCount[order.status].add(order.id);
        }

        const notPurchased = totalProducts - productSoldSet.size;
        setSellerStats({
          totalProducts,
          soldProducts,
          pendingPayment: statusCount.pending_payment_review.size,
          paymentApproved: statusCount.payment_approved.size,
          processing: statusCount.processing.size,
          shipped: statusCount.shipped.size,
          delivered: statusCount.delivered.size,
          notPurchased,
          shippingProducts: 0,
          notShippedWithReceipt: 0,
          noReceiptPurchased: 0,
        });
      } catch (err) {
        console.error(err);
        toast.error('فشل تحميل إحصائيات البائع');
      }
    };
    fetchSellerStats();
  }, [selectedSeller]);

  useEffect(() => {
    if (selectedSeller) {
      const savedPercent = selectedSeller.commission_percent;
      setSellerCommissionPercent(savedPercent !== undefined && savedPercent !== null ? savedPercent : 10);
    }
  }, [selectedSeller]);

  const updateUserMutation = async ({ userId, updates }) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    toast.success('تم تحديث المستخدم');
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    if (selectedSeller?.id === userId) setSelectedSeller(prev => ({ ...prev, ...updates }));
    if (selectedBuyer?.id === userId) setSelectedBuyer(prev => ({ ...prev, ...updates }));
  };

  const approveSellerMutation = async ({ sellerId, approved, notes }) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: approved, admin_notes: notes })
      .eq('id', sellerId);
    if (error) throw error;
    toast.success(approved ? 'تم قبول البائع' : 'تم رفض البائع');
    refetchPendingSellers();
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    queryClient.invalidateQueries({ queryKey: ['pendingSellers'] });
  };

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

  const sendToAllUsers = async () => {
    const msg = prompt('أدخل نص الإشعار لجميع المستخدمين:');
    if (!msg) return;
    const { data: allUsers } = await supabase.from('profiles').select('id');
    if (allUsers) {
      toast.loading(`جاري إرسال الإشعار إلى ${allUsers.length} مستخدم...`);
      for (const u of allUsers) {
        await sendNotificationToUser(u.id, msg).catch(() => {});
      }
      toast.success('تم إرسال الإشعار لجميع المستخدمين');
    }
  };

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || [];
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || [];

  if (usersLoading && activeSubTab !== 'pending_users') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="w-24 h-10 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <Button onClick={sendToAllUsers} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-lg px-5 py-2 transition-all flex items-center gap-2">
          <Send size={16} /> إرسال إشعار لجميع المستخدمين
        </Button>
      </div>
      <div className="flex gap-4 border-b border-gold/30 mb-6">
        <button onClick={() => setActiveSubTab('sellers')} className={`px-5 py-2 rounded-t-lg transition-all ${activeSubTab === 'sellers' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>البائعين</button>
        <button onClick={() => setActiveSubTab('buyers')} className={`px-5 py-2 rounded-t-lg transition-all ${activeSubTab === 'buyers' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>المشترين</button>
        <button onClick={() => setActiveSubTab('pending_users')} className={`px-5 py-2 rounded-t-lg transition-all ${activeSubTab === 'pending_users' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>
          طلبات التسجيل {pendingSellers?.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellers.length}</span>}
        </button>
      </div>

      {/* باقي الكود كما هو (لم يتغير) */}
      {activeSubTab === 'sellers' && (
        // ... نفس الكود السابق ...
        <div>...</div>
      )}
      {activeSubTab === 'buyers' && (
        // ... نفس الكود السابق ...
        <div>...</div>
      )}
      {activeSubTab === 'pending_users' && (
        // ... نفس الكود السابق ...
        <div>...</div>
      )}
    </div>
  );
}


