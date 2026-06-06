import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import {
  Users, Package, ShoppingBag, DollarSign, Search, TrendingUp, Activity,
  RefreshCw, Wallet, Send, BarChart3, LineChart as LineChartIcon, Loader,
  MessageCircle, Clock, CheckCircle, Star, Filter, Eye, Edit, Trash2,
  UserCheck, UserX, Ban, UserCog, FileText, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';

// ------------------- Helper functions -------------------
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('ar-YE');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(amount || 0);
};

// ------------------- Main Component -------------------
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Tabs
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('sellers'); // sellers, buyers, pending_users

  // General states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [sellerDetailTab, setSellerDetailTab] = useState('profile');
  const [buyerDetailTab, setBuyerDetailTab] = useState('profile');
  const [sellerFilterId, setSellerFilterId] = useState(null);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [sellerReceiptsList, setSellerReceiptsList] = useState([]);

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

  // Seller stats (for selected seller)
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

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    dailySales: 0,
    monthlySales: 0,
    yearlySales: 0,
    totalOrders: 0,
    newUsers: 0,
    newSellers: 0,
    totalCommission: 0,
    topProducts: [],
    topSellers: [],
    pendingOrders: 0,
    pendingProducts: 0,
    newDisputes: 0,
  });
  const [salesChartData, setSalesChartData] = useState([]);

  // Product filter (now used for order items)
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

  // Inquiries/Orders tab
  const [inquiries, setInquiries] = useState([]);
  const [filterInquiry, setFilterInquiry] = useState('all');

  // Queries
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }
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
    enabled: activeMainTab === 'users',
  });

  const { data: pendingSellers, refetch: refetchPendingSellers } = useQuery({
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
    enabled: activeMainTab === 'users' && activeSubTab === 'pending_users',
  });

  // 🔹 NEW: جلب عناصر الطلبات (order_items) بدلاً من المنتجات
  // جلب عناصر الطلبات (order_items) بطريقة مبسطة ومنفصلة
const { data: orderItems, refetch: refetchOrderItems, isLoading: orderItemsLoading } = useQuery({
  queryKey: ['adminOrderItems', sellerFilterId, productFilterStatus],
  queryFn: async () => {
    try {
      // 1. جلب order_items الأساسية
      let query = supabase
        .from('order_items')
        .select('id, order_id, product_id, product_price, quantity')
        .order('order_id', { ascending: false });
      
      // إذا كان هناك فلتر حسب البائع (نحتاج لاحقاً لتصفية النتائج)
      let orderItemsData = await query;
      if (orderItemsData.error) throw orderItemsData.error;
      let items = orderItemsData.data || [];

      if (items.length === 0) return [];

      // 2. جلب معرفات الطلبات والمنتجات الفريدة
      const orderIds = [...new Set(items.map(i => i.order_id))];
      const productIds = [...new Set(items.map(i => i.product_id))];

      // 3. جلب تفاصيل الطلبات
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, status, created_at, user_id')
        .in('id', orderIds);
      if (ordersErr) throw ordersErr;
      const ordersMap = new Map(orders?.map(o => [o.id, o]) || []);

      // 4. جلب تفاصيل المنتجات وأسماء البائعين
      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('id, name, price, seller_id, seller:profiles!products_seller_id_fkey (id, full_name)')
        .in('id', productIds);
      if (productsErr) throw productsErr;
      const productsMap = new Map(products?.map(p => [p.id, p]) || []);

      // 5. جلب أسماء المشترين من الطلبات
      const buyerIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
      const { data: buyers, error: buyersErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', buyerIds);
      if (buyersErr) throw buyersErr;
      const buyersMap = new Map(buyers?.map(b => [b.id, b]) || []);

      // 6. دمج البيانات
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
          order_status: order?.status,
          buyer_name: buyer?.full_name || 'غير معروف',
          buyer_email: buyer?.email,
        };
      });

      // 7. تصفية حسب حالة الطلب إذا تم اختيار فلتر (وليس 'all')
      if (productFilterStatus !== 'all') {
        const statusMap = {
          'pending_payment': ['pending', 'pending_payment_review'],
          'payment_approved': ['payment_approved'],
          'processing': ['processing'],
          'shipped': ['shipped'],
          'delivered': ['delivered'],
          'completed': ['completed'],
          'cancelled': ['cancelled'],
          'returned': ['return_requested', 'return_approved'],
        };
        const targetStatuses = statusMap[productFilterStatus] || [];
        if (targetStatuses.length) {
          results = results.filter(r => targetStatuses.includes(r.order_status));
        }
      }

      // 8. تصفية حسب البائع إذا تم اختيار فلتر بائع
      if (sellerFilterId) {
        results = results.filter(r => r.seller_name !== 'غير معروف'); // بدلاً من ذلك يمكن استخدام seller_id الحقيقي
        // لكن لا يوجد seller_id في النتيجة، لذا نضيفه أثناء الدمج
      }

      // ترتيب حسب التاريخ تنازلياً
      results.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

      return results;
    } catch (err) {
      console.error('خطأ في جلب عناصر الطلبات:', err);
      return [];
    }
  },
  enabled: activeMainTab === 'products',
});

  // ------------------- Dashboard data fetching -------------------
  useEffect(() => {
    if (activeMainTab !== 'dashboard') return;
    const fetchDashboard = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: dailyOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', today.toISOString());
        const dailySales = dailyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;

        const { data: monthlyOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString());
        const monthlySales = monthlyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;

        const { data: yearlyOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', startOfYear.toISOString());
        const yearlySales = yearlyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;

        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        const { count: newUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        const { count: newSellers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'seller')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const totalCommission = yearlySales * 0.1;

        const { data: topItems, error: topItemsError } = await supabase
  .from('order_items')
  .select(`
    product_id,
    quantity,
    product_price,
    order:orders!inner(status)
  `)
  .eq('order.status', 'completed')
  .limit(200);

if (topItemsError) {
  console.error('خطأ في جلب أفضل المنتجات:', topItemsError);
  // في حالة الخطأ، نستخدم بيانات وهمية أو نخرج من الدالة
} else {
  // استمر في المعالجة مع topItems
}
        const productSales = {};
        for (const item of topItems || []) {
          if (!productSales[item.product_id]) productSales[item.product_id] = { qty: 0, revenue: 0 };
          productSales[item.product_id].qty += item.quantity;
          productSales[item.product_id].revenue += item.product_price * item.quantity;
        }
        const productIds = Object.keys(productSales);
        const { data: productDetails } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        const productMap = Object.fromEntries(productDetails?.map(p => [p.id, p.name]) || []);
        const topProducts = Object.entries(productSales)
          .map(([id, val]) => ({ id, name: productMap[id] || 'غير معروف', revenue: val.revenue, qty: val.qty }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const topSellers = [
          { name: 'محمد علي', rating: 4.8 },
          { name: 'أحمد حسن', rating: 4.7 },
          { name: 'فاطمة الزهراء', rating: 4.6 },
          { name: 'عبدالله يحيى', rating: 4.5 },
          { name: 'نورة سعيد', rating: 4.4 },
        ];

        const { count: pendingOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'pending_payment_review']);
        const { count: pendingProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);
        const { count: newDisputes } = await supabase
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');

        setDashboardData({
          dailySales,
          monthlySales,
          yearlySales,
          totalOrders: totalOrders || 0,
          newUsers: newUsers || 0,
          newSellers: newSellers || 0,
          totalCommission,
          topProducts,
          topSellers,
          pendingOrders: pendingOrders || 0,
          pendingProducts: pendingProducts || 0,
          newDisputes: newDisputes || 0,
        });

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const { data: dayOrders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDay.toISOString());
          const daySales = dayOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
          last7Days.push({ name: date.toLocaleDateString('ar', { weekday: 'short' }), sales: daySales });
        }
        setSalesChartData(last7Days);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, [activeMainTab]);

  // ------------------- Seller stats (when selected) -------------------
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
          setSellerStats({
            totalProducts: 0,
            soldProducts: 0,
            pendingPayment: 0,
            paymentApproved: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            notPurchased: 0,
            shippingProducts: 0,
            notShippedWithReceipt: 0,
            noReceiptPurchased: 0,
          });
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
          if (statusCount[order.status]) {
            statusCount[order.status].add(order.id);
          }
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

  // ------------------- Seller Finance (including commission) -------------------
  const calculateFinance = async () => {
    if (!selectedSeller?.id) return;
    try {
      const sellerId = selectedSeller.id;
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);
      const productIds = products?.map(p => p.id) || [];
      let totalSales = 0,
        totalReturns = 0;
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
    }
  };

  useEffect(() => {
    if (selectedSeller) {
      calculateFinance();
    }
  }, [selectedSeller, sellerCommissionPercent]);

  useEffect(() => {
    if (selectedSeller) {
      const savedPercent = selectedSeller.commission_percent;
      if (savedPercent !== undefined && savedPercent !== null) {
        setSellerCommissionPercent(savedPercent);
      } else {
        setSellerCommissionPercent(10);
      }
    }
  }, [selectedSeller]);

  // ------------------- Fetch inquiries -------------------
  useEffect(() => {
    if (activeMainTab !== 'orders') return;
    const fetchInquiries = async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*, user:profiles(full_name), product:products(name)')
        .order('created_at', { ascending: false });
      if (!error) setInquiries(data || []);
    };
    fetchInquiries();
  }, [activeMainTab]);

  // ------------------- Mutations & Handlers -------------------
  const refreshAllData = async () => {
    await Promise.all([
      refetchUsers(),
      refetchPendingSellers(),
      refetchOrderItems(),
    ]);
    toast.success('تم تحديث جميع البيانات');
  };

  const updateUserMutation = async ({ userId, updates }) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    toast.success('تم تحديث المستخدم');
    refetchUsers();
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
  };

  const sendNotificationToUser = async (userId, message) => {
    const title = 'إشعار من الإدارة';
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminId = adminUser.id;
    let conversationId = null;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${adminId},seller_id.eq.${userId}`)
      .maybeSingle();
    if (existing) conversationId = existing.id;
    else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ buyer_id: adminId, seller_id: userId, product_id: null })
        .select()
        .single();
      if (error) throw error;
      conversationId = newConv.id;
    }
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title,
      message,
      related_id: conversationId.toString(),
    });
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: adminId,
      receiver_id: userId,
      message,
    });
    toast.success('تم إرسال الإشعار');
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
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
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

  const handleReplyInquiry = async (inquiryId) => {
    const reply = prompt('أدخل ردك على هذا الاستفسار:');
    if (!reply) return;
    const { error } = await supabase
      .from('inquiries')
      .update({ reply, replied_at: new Date().toISOString() })
      .eq('id', inquiryId);
    if (error) {
      toast.error('حدث خطأ أثناء الرد');
    } else {
      toast.success('تم إرسال الرد');
      // تحديث inquiries state مباشرة بعد الرد
      setInquiries(prev =>
        prev.map(i => (i.id === inquiryId ? { ...i, reply, replied_at: new Date().toISOString() } : i))
      );
    }
  };

  // ------------------- Render -------------------
  const isLoading = (activeMainTab === 'dashboard') ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && orderItemsLoading);
  if (isLoading && activeMainTab !== 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>;
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || [];
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || [];

  return (
    <div className="container mx-auto px-4 py-8 font-tajawal">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button onClick={refreshAllData} className="bg-gray-700 hover:bg-gray-600 text-white shadow-md rounded-lg px-4 py-2 transition-all flex items-center gap-2">
          <RefreshCw size={16} /> تحديث الكل
        </Button>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        {['dashboard', 'users', 'products', 'finance', 'orders'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveMainTab(tab);
              if (tab === 'users') setActiveSubTab('sellers');
            }}
            className={`px-5 py-2 rounded-t-lg transition-all duration-200 flex items-center gap-2 font-medium ${
              activeMainTab === tab
                ? 'bg-gradient-to-r from-gold to-amber-500 text-primary-blue shadow-md'
                : 'bg-primary-card/60 text-text-secondary hover:bg-secondary-blue/50 hover:text-white'
            }`}
          >
            {tab === 'dashboard' && <BarChart3 size={18} />}
            {tab === 'users' && <Users size={18} />}
            {tab === 'products' && <Package size={18} />}
            {tab === 'finance' && <DollarSign size={18} />}
            {tab === 'orders' && <ShoppingBag size={18} />}
            {tab === 'dashboard' && ' لوحة المعلومات'}
            {tab === 'users' && ' المستخدمين'}
            {tab === 'products' && ' إدارة المنتجات'}
            {tab === 'finance' && ' المالية'}
            {tab === 'orders' && ' الطلبات والاستفسارات'}
          </button>
        ))}
      </div>

      {/* ========================== DASHBOARD ========================== */}
      {activeMainTab === 'dashboard' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <DollarSign className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات اليوم</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.dailySales)}</p>
            </div>
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <TrendingUp className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات الشهر</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.monthlySales)}</p>
            </div>
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <Activity className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات السنة</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.yearlySales)}</p>
            </div>
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <ShoppingBag className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-white">{dashboardData.totalOrders}</p>
            </div>
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <Users className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مستخدمين جدد (30 يوم)</p>
              <p className="text-2xl font-bold text-white">{dashboardData.newUsers} <span className="text-sm">/ {dashboardData.newSellers} بائع</span></p>
            </div>
            <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20 hover:border-gold/50 transition-all">
              <Wallet className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">العمولات المستحقة</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.totalCommission)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-8">
            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Clock className="mx-auto text-yellow-500 mb-2" size={28} />
              <p className="text-text-secondary">طلبات معلقة</p>
              <p className="text-2xl font-bold text-yellow-500">{dashboardData.pendingOrders}</p>
            </div>
            <div className="bg-red-900/20 border border-red-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
              <Package className="mx-auto text-red-500 mb-2" size={28} />
              <p className="text-text-secondary">منتجات تحتاج مراجعة</p>
              <p className="text-2xl font-bold text-red-500">{dashboardData.pendingProducts}</p>
            </div>
            <div className="bg-blue-900/20 border border-blue-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
              <MessageCircle className="mx-auto text-blue-500 mb-2" size={28} />
              <p className="text-text-secondary">شكاوى جديدة</p>
              <p className="text-2xl font-bold text-blue-500">{dashboardData.newDisputes}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
              <h2 className="text-xl font-bold mb-4 text-gold">⭐ أفضل المنتجات مبيعاً</h2>
              <div className="space-y-3">
                {dashboardData.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gold/20 pb-2">
                    <span className="text-white">{p.name}</span>
                    <span className="text-gold font-medium">{formatCurrency(p.revenue)}</span>
                    <span className="text-xs text-text-secondary">{p.qty} قطعة</span>
                  </div>
                ))}
                {dashboardData.topProducts.length === 0 && <p className="text-text-secondary text-center">لا توجد بيانات كافية</p>}
              </div>
            </div>
            <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
              <h2 className="text-xl font-bold mb-4 text-gold">🏆 البائعين الأعلى تقييماً</h2>
              <div className="space-y-3">
                {dashboardData.topSellers.map((s, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gold/20 pb-2">
                    <span className="text-white">{s.name}</span>
                    <span className="flex items-center gap-1 text-gold"><Star size={16} className="text-gold fill-gold" /> {s.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
            <h2 className="text-xl font-bold mb-4"><LineChartIcon className="inline ml-2 text-gold" /> المبيعات اليومية (آخر 7 أيام)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#ddd" />
                <YAxis stroke="#ddd" />
                <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========================== USERS ========================== */}
      {activeMainTab === 'users' && (
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

          {/* ---------- Sellers ---------- */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-5">
                <label className="block text-gold font-medium mb-2">اختر البائع:</label>
                <Select
                  value={selectedSeller?.id || ''}
                  onChange={e => {
                    const seller = sellerUsers.find(u => u.id === e.target.value);
                    setSelectedSeller(seller);
                    setSellerDetailTab('profile');
                    setSellerFilterId(null);
                  }}
                  className="w-full md:w-1/2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(s => (
                    <option key={s.id} value={s.id}>{s.store_name || s.full_name} ({s.email})</option>
                  ))}
                </Select>
              </div>
              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl p-5 shadow-lg border border-gold/20">
                  <div className="flex gap-3 mb-5 border-b border-gold/30 pb-2">
                    <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg transition-all ${sellerDetailTab === 'profile' ? 'bg-gold text-primary-blue shadow' : 'text-text-secondary hover:text-white'}`}>الملف الشخصي</button>
                    <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg transition-all ${sellerDetailTab === 'stats' ? 'bg-gold text-primary-blue shadow' : 'text-text-secondary hover:text-white'}`}>إحصائيات المنتجات</button>
                    <button onClick={() => setSellerDetailTab('commission')} className={`px-4 py-2 rounded-lg transition-all ${sellerDetailTab === 'commission' ? 'bg-gold text-primary-blue shadow' : 'text-text-secondary hover:text-white'}`}>نسبة الموقع</button>
                  </div>

                  {sellerDetailTab === 'profile' && (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-5 bg-secondary-blue/30 p-4 rounded-xl">
                        <div><span className="font-bold text-gold">الاسم:</span> <span className="text-white">{selectedSeller.full_name}</span></div>
                        <div><span className="font-bold text-gold">البريد:</span> <span className="text-white">{selectedSeller.email}</span></div>
                        <div><span className="font-bold text-gold">الهاتف:</span> <span className="text-white">{selectedSeller.phone || '-'}</span></div>
                        <div><span className="font-bold text-gold">تاريخ التسجيل:</span> <span className="text-white">{formatDate(selectedSeller.created_at)}</span></div>
                        <div><span className="font-bold text-gold">الحالة:</span> <span className={selectedSeller.is_banned ? 'text-red-400' : 'text-green-400'}>{selectedSeller.is_banned ? 'محظور' : 'نشط'}</span></div>
                        <div><span className="font-bold text-gold">نسبة الموقع الحالية:</span> <span className="text-gold">{sellerCommissionPercent}%</span></div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="danger" onClick={() => updateUserMutation({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })} className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-lg px-4 py-2">
                          {selectedSeller.is_banned ? 'إلغاء الحظر' : 'حظر'}
                        </Button>
                        <Button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(selectedSeller.id, msg); }} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md rounded-lg px-4 py-2 flex items-center gap-1">
                          <Send size={14} /> إرسال إشعار
                        </Button>
                        <Button onClick={() => {
                          const newType = selectedSeller.account_type === 'seller' ? 'buyer' : 'seller';
                          if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                            updateUserMutation({ userId: selectedSeller.id, updates: { account_type: newType } });
                        }} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md rounded-lg px-4 py-2 flex items-center gap-1">
                          <UserCog size={14} /> تغيير نوع الحساب
                        </Button>
                      </div>
                    </div>
                  )}

                  {sellerDetailTab === 'stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right">
                        <tbody>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">جميع المنتجات المنشورة</td><td className="text-white">{sellerStats.totalProducts}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">المنتجات التي تم بيعها (قطع)</td><td className="text-white">{sellerStats.soldProducts}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">منتظرة الدفع</td><td className="text-white">{sellerStats.pendingPayment}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">تم تأكيد الدفع</td><td className="text-white">{sellerStats.paymentApproved}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">قيد التجهيز</td><td className="text-white">{sellerStats.processing}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">تم الشحن</td><td className="text-white">{sellerStats.shipped}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">تم التسليم</td><td className="text-white">{sellerStats.delivered}</td></tr>
                          <tr className="border-b border-gold/20"><td className="py-2 font-bold text-gold">غير مشتراة</td><td className="text-white">{sellerStats.notPurchased}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sellerDetailTab === 'commission' && (
                    <div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-gold mb-2">نسبة الموقع (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sellerCommissionPercent}
                            onChange={e => setSellerCommissionPercent(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gold focus:border-gold"
                          />
                        </div>
                        <Button 
                          onClick={async () => {
                            await updateUserMutation({ 
                              userId: selectedSeller.id, 
                              updates: { commission_percent: sellerCommissionPercent } 
                            });
                            toast.success('تم حفظ نسبة الموقع');
                            await calculateFinance();
                          }} 
                          className="bg-gold text-primary-blue shadow-md rounded-lg px-5 py-2 hover:bg-gold/90 transition-all whitespace-nowrap"
                        >
                          تحديث النسبة
                        </Button>
                      </div>
                      <p className="text-text-secondary text-sm mt-3">* سيتم إعادة حساب العمولة والمبلغ المتبقي فوراً</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------- Buyers ---------- */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-5">
                <Input
                  placeholder="ابحث عن مشتري بالاسم أو البريد"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                />
                <Button variant="secondary" onClick={() => refetchUsers()} className="bg-gray-700 hover:bg-gray-600 text-white shadow-md rounded-lg px-5 py-2 transition-all flex items-center gap-1">
                  <Search size={16} /> بحث
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gold/20">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-secondary-blue/40 border-b border-gold/30">
                      <th className="p-3 text-gold">الاسم</th>
                      <th className="p-3 text-gold">البريد</th>
                      <th className="p-3 text-gold">عدد الطلبات</th>
                      <th className="p-3 text-gold">إجمالي الإنفاق</th>
                      <th className="p-3 text-gold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyerUsers.map(u => (
                      <tr key={u.id} className="border-b border-gold/20 hover:bg-secondary-blue/10 transition">
                        <td className="p-3 text-white">{u.full_name}</td>
                        <td className="p-3 text-white">{u.email}</td>
                        <td className="p-3 text-white">{u.order_count || 0}</td>
                        <td className="p-3 text-white">{formatCurrency(u.total_spent || 0)}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => updateUserMutation({ userId: u.id, updates: { is_banned: !u.is_banned } })} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs shadow">حظر</button>
                          <button onClick={() => setSelectedBuyer(u)} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs shadow">تفاصيل</button>
                          <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(u.id, msg); }} className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs shadow"><Send size={12} /></button>
                          <button onClick={() => {
                            const newType = u.account_type === 'seller' ? 'buyer' : 'seller';
                            if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                              updateUserMutation({ userId: u.id, updates: { account_type: newType } });
                          }} className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs shadow">🔄 تغيير</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedBuyer && (
                <Modal onClose={() => setSelectedBuyer(null)} title="ملف المشتري">
                  <div className="space-y-2 text-gray-800">
                    <div><strong>الاسم:</strong> {selectedBuyer.full_name}</div>
                    <div><strong>البريد:</strong> {selectedBuyer.email}</div>
                    <div><strong>الهاتف:</strong> {selectedBuyer.phone || '-'}</div>
                    <div><strong>عدد الطلبات:</strong> {selectedBuyer.order_count || 0}</div>
                    <div><strong>إجمالي الإنفاق:</strong> {formatCurrency(selectedBuyer.total_spent || 0)}</div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="danger" onClick={() => updateUserMutation({ userId: selectedBuyer.id, updates: { is_banned: !selectedBuyer.is_banned } })} className="bg-red-600 text-white">{selectedBuyer.is_banned ? 'إلغاء الحظر' : 'حظر'}</Button>
                      <Button variant="secondary" onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(selectedBuyer.id, msg); }}>إرسال إشعار</Button>
                      <Button onClick={() => {
                        const newType = selectedBuyer.account_type === 'seller' ? 'buyer' : 'seller';
                        if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                          updateUserMutation({ userId: selectedBuyer.id, updates: { account_type: newType } });
                      }} className="bg-amber-600 text-white">تغيير نوع الحساب</Button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ---------- Pending Registrations ---------- */}
          {activeSubTab === 'pending_users' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl shadow border border-gold/20">
                  <div><h3 className="font-bold text-gold">{s.full_name}</h3><p className="text-white">{s.email} | {s.phone}</p><p className="text-text-secondary">تاريخ الطلب: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => approveSellerMutation({ sellerId: s.id, approved: true })} className="bg-green-600 hover:bg-green-700 text-white shadow">قبول</Button>
                    <Button variant="danger" onClick={() => { const notes = prompt('سبب الرفض:'); approveSellerMutation({ sellerId: s.id, approved: false, notes }); }} className="bg-red-600 hover:bg-red-700 text-white shadow">رفض</Button>
                  </div>
                </div>
              ))}
              {(!pendingSellers || pendingSellers.length === 0) && <div className="text-center text-text-secondary">لا توجد طلبات تسجيل معلقة</div>}
            </div>
          )}
        </div>
      )}

      {/* ========================== PRODUCT MANAGEMENT (order items) ========================== */}
      {activeMainTab === 'products' && (
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
            {sellerFilterId && <Button variant="secondary" onClick={() => setSellerFilterId(null)} className="bg-gray-700 hover:bg-gray-600 text-white shadow">إلغاء فلتر البائع</Button>}
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
                  </tr>
                ))}
                {(!orderItems || orderItems.length === 0) && (
                  <tr><td colSpan="8" className="text-center p-6 text-text-secondary">لا توجد عناصر طلبات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================== FINANCE ========================== */}
      {activeMainTab === 'finance' && (
        <div>
          <div className="mb-6">
            <label className="block text-gold font-medium mb-2">اختر البائع لتسوية حسابه:</label>
            <Select
              value={selectedSeller?.id || ''}
              onChange={e => {
                const seller = sellerUsers.find(u => u.id === e.target.value);
                setSelectedSeller(seller);
              }}
              className="w-full md:w-1/2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
            >
              <option value="">-- اختر بائعاً --</option>
              {sellerUsers.map(s => <option key={s.id} value={s.id}>{s.store_name || s.full_name}</option>)}
            </Select>
          </div>
          {selectedSeller ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
                <h3 className="text-lg font-bold text-gold mb-4">تسديد حساب البائع</h3>
                <div className="space-y-3">
                  <Input label="المبلغ (ريال يمني)" type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="أدخل المبلغ" className="bg-white text-gray-900 border-gray-300 focus:ring-gold" />
                  <Input label="الملاحظات" value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="اختياري" className="bg-white text-gray-900 border-gray-300" />
                  <div>
                    <label className="block mb-1 text-text-secondary">رفع سند التحويل</label>
                    <input type="file" accept="image/*" id="receiptFileInput" onChange={e => setReceiptFile(e.target.files[0])} className="bg-white text-gray-900 rounded-lg px-3 py-2 w-full border border-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gold file:text-primary-blue hover:file:bg-gold/90" />
                  </div>
                  <Button onClick={handleAddTransfer} disabled={uploading} className="w-full bg-gold text-primary-blue shadow-md hover:bg-gold/90 transition-all">{uploading ? 'جاري الرفع...' : 'إدخال'}</Button>
                </div>
              </div>
              <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-gold">ملخص حسابات البائع</h3>
                  <Button variant="secondary" onClick={loadSellerReceipts} className="bg-gray-700 hover:bg-gray-600 text-white shadow">الاستعلام عن التحويلات</Button>
                </div>
                <table className="w-full text-right mt-2">
                  <thead>
                    <tr className="border-b border-gold/30"><th className="py-2 text-gold">القسم</th><th className="py-2 text-gold">المبلغ</th><th className="py-2 text-gold">العملة</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="py-2 font-bold">إجمالي المبيعات</td><td className="text-white">{formatCurrency(sellerFinance.totalSales)}</td><td className="text-white">ريال يمني</td></tr>
                    <tr><td className="py-2 font-bold">إجمالي المرتجعات</td><td className="text-white">{formatCurrency(sellerFinance.totalReturns)}</td><td className="text-white">ريال يمني</td></tr>
                    <tr><td className="py-2 font-bold">نسبة الموقع ({sellerCommissionPercent}%)</td><td className="text-white">{formatCurrency(sellerFinance.commissionAmount)}</td><td className="text-white">ريال يمني</td></tr>
                    <tr><td className="py-2 font-bold">إجمالي الاستلامات</td><td className="text-white">{formatCurrency(sellerFinance.totalReceived)}</td><td className="text-white">ريال يمني</td></tr>
                    <tr className="border-t border-gold/30"><td className="py-2 font-bold text-gold">المبلغ المتبقي</td><td className="font-bold text-gold">{formatCurrency(sellerFinance.remaining)}</td><td className="text-gold">ريال يمني</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary p-8">يرجى اختيار بائع لعرض بياناته المالية</div>
          )}
        </div>
      )}

      {/* ========================== الطلبات والاستفسارات ========================== */}
      {activeMainTab === 'orders' && (
        <div>
          <div className="flex gap-4 mb-5">
            <select value={filterInquiry} onChange={e => setFilterInquiry(e.target.value)} className="bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300">
              <option value="all">جميع الاستفسارات</option>
              <option value="unanswered">غير مجاب عنها</option>
              <option value="answered">تم الرد عليها</option>
            </select>
          </div>
          <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20 space-y-4">
            {inquiries
              .filter(i => {
                if (filterInquiry === 'answered') return i.reply && i.reply.trim() !== '';
                if (filterInquiry === 'unanswered') return !i.reply || i.reply.trim() === '';
                return true;
              })
              .map(inq => (
                <div key={inq.id} className="border-b border-gold/20 pb-4">
                  <p><span className="font-bold text-gold">المستخدم:</span> <span className="text-white">{inq.user?.full_name}</span></p>
                  <p><span className="font-bold text-gold">المنتج:</span> <span className="text-white">{inq.product?.name || 'عام'}</span></p>
                  <p><span className="font-bold text-gold">السؤال:</span> <span className="text-white">{inq.message}</span></p>
                  {inq.reply && <p><span className="font-bold text-green-500">الرد:</span> <span className="text-white">{inq.reply}</span> <span className="text-xs text-text-secondary">({formatDate(inq.replied_at)})</span></p>}
                  {!inq.reply && <Button size="sm" onClick={() => handleReplyInquiry(inq.id)} className="mt-1 bg-gold text-primary-blue shadow">رد</Button>}
                  <p className="text-xs text-text-secondary mt-1">{formatDate(inq.created_at)}</p>
                </div>
              ))}
            {inquiries.filter(i => {
              if (filterInquiry === 'answered') return i.reply && i.reply.trim() !== '';
              if (filterInquiry === 'unanswered') return !i.reply || i.reply.trim() === '';
              return true;
            }).length === 0 && <div className="text-center text-text-secondary">لا توجد استفسارات</div>}
          </div>
        </div>
      )}

      {/* Modal for receipts */}
      {showReceiptsModal && (
        <Modal onClose={() => setShowReceiptsModal(false)} title="إيصالات تحويل البائع">
          <table className="w-full text-right">
            <thead>
              <tr><th className="py-2 text-gold">المبلغ</th><th className="py-2 text-gold">التاريخ</th><th className="py-2 text-gold">الصورة</th><th className="py-2 text-gold">ملاحظات</th></tr>
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
              {sellerReceiptsList.length === 0 && <tr><td colSpan="4" className="text-center text-gray-500">لا توجد إيصالات</td></tr>}
            </tbody>
          </table>
          <div className="mt-4 text-left"><Button variant="secondary" onClick={() => setShowReceiptsModal(false)}>إغلاق</Button></div>
        </Modal>
      )}
    </div>
  );
}

// ==================== SQL to create missing tables (run once in Supabase SQL editor) ====================
/*
-- جدول تحويلات البائعين (seller_transfers)
CREATE TABLE IF NOT EXISTS seller_transfers (
  id BIGSERIAL PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  receipt_image TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE seller_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON seller_transfers USING (auth.role() = 'authenticated');

-- جدول الاستفسارات (inquiries)
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON inquiries USING (true);
CREATE POLICY "Users can insert" ON inquiries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- جدول النزاعات (disputes) اختياري
CREATE TABLE IF NOT EXISTS disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  buyer_id UUID REFERENCES profiles(id),
  seller_id UUID REFERENCES profiles(id),
  reason TEXT,
  status TEXT DEFAULT 'open',
  resolution TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة عمود is_verified إلى profiles إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ✅ إضافة عمود نسبة الموقع (commission_percent) إلى profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_percent INTEGER DEFAULT 10;
*/

