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
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState(10); // default site commission %
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

  // Product filter
  const [productFilter, setProductFilter] = useState('all'); // 'all', 'pending', 'approved', 'hidden'

  // Inquiries/Orders tab
  const [inquiries, setInquiries] = useState([]);
  const [filterInquiry, setFilterInquiry] = useState('all'); // 'all', 'answered', 'unanswered'

  // Queries from adminService (using direct supabase calls for simplicity)
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      // add computed fields (order_count, total_spent) for buyers
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

  const { data: products, refetch: refetchProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts', sellerFilterId, productFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:profiles!products_seller_id_fkey (id, full_name, email)
        `)
        .order('created_at', { ascending: false });
      if (sellerFilterId) query = query.eq('seller_id', sellerFilterId);
      if (productFilter === 'pending') query = query.eq('is_approved', false);
      else if (productFilter === 'approved') query = query.eq('is_approved', true);
      else if (productFilter === 'hidden') query = query.eq('is_hidden', true);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(p => ({ ...p, seller_name: p.seller?.full_name || 'غير معروف' }));
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

        // sales
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

        // total orders
        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        // new users & sellers
        const { count: newUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        const { count: newSellers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'seller')
          .gte('created_at', thirtyDaysAgo.toISOString());

        // total commission (10% of completed sales)
        const totalCommission = yearlySales * 0.1;

        // top 5 products by revenue
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity, product_price')
          .eq('order.status', 'completed')
          .limit(200);
        const productSales = {};
        for (const item of orderItems || []) {
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

        // top 5 sellers by rating (dummy for now)
        const topSellers = [
          { name: 'محمد علي', rating: 4.8 },
          { name: 'أحمد حسن', rating: 4.7 },
          { name: 'فاطمة الزهراء', rating: 4.6 },
          { name: 'عبدالله يحيى', rating: 4.5 },
          { name: 'نورة سعيد', rating: 4.4 },
        ];

        // pending counts
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

        // chart data (last 7 days sales)
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
        // all products
        const { data: productsList } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', sellerId);
        const totalProducts = productsList?.length || 0;

        // get order_items for these products
        const productIds = productsList?.map(p => p.id) || [];
        let soldProducts = 0;
        let pendingPayment = 0,
          paymentApproved = 0,
          processing = 0,
          shipped = 0,
          delivered = 0,
          notPurchased = totalProducts;

        if (productIds.length) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, product_id, quantity')
            .in('product_id', productIds);
          const orderIds = [...new Set(orderItems?.map(i => i.order_id) || [])];
          const { data: orders } = await supabase
            .from('orders')
            .select('id, status')
            .in('id', orderIds);
          const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

          const productSoldSet = new Set();
          for (const item of orderItems || []) {
            const order = orderMap.get(item.order_id);
            if (!order) continue;
            productSoldSet.add(item.product_id);
            soldProducts += item.quantity;
            if (order.status === 'pending_payment_review') pendingPayment++;
            else if (order.status === 'payment_approved') paymentApproved++;
            else if (order.status === 'processing') processing++;
            else if (order.status === 'shipped') shipped++;
            else if (order.status === 'delivered') delivered++;
          }
          notPurchased = totalProducts - productSoldSet.size;
        }

        setSellerStats({
          totalProducts,
          soldProducts,
          pendingPayment,
          paymentApproved,
          processing,
          shipped,
          delivered,
          notPurchased,
          // keep other fields default
          shippingProducts: 0,
          notShippedWithReceipt: 0,
          noReceiptPurchased: 0,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchSellerStats();
  }, [selectedSeller]);

  // ------------------- Seller Finance (including commission) -------------------
  useEffect(() => {
    if (!selectedSeller?.id) return;
    const fetchFinance = async () => {
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
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, product_price, quantity')
            .in('product_id', productIds);
          if (orderItems?.length) {
            const orderIds = [...new Set(orderItems.map(i => i.order_id))];
            const { data: orders } = await supabase
              .from('orders')
              .select('id, status, return_status')
              .in('id', orderIds);
            const orderMap = new Map(orders?.map(o => [o.id, o]) || []);
            for (const item of orderItems) {
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
    fetchFinance();
  }, [selectedSeller, sellerCommissionPercent]);

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
      refetchProducts(),
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
      // refresh finance
      const { data: transfers } = await supabase
        .from('seller_transfers')
        .select('amount')
        .eq('seller_id', selectedSeller.id);
      const totalReceived = transfers?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
      setSellerFinance(prev => ({
        ...prev,
        totalReceived,
        remaining: (prev.totalSales - prev.totalReturns) - prev.commissionAmount - totalReceived,
      }));
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
      const inquiry = inquiries.find(i => i.id === inquiryId);
      if (inquiry?.user_id) {
        await sendNotificationToUser(inquiry.user_id, `تم الرد على استفسارك: ${reply}`);
      }
      setInquiries(prev =>
        prev.map(i => (i.id === inquiryId ? { ...i, reply, replied_at: new Date().toISOString() } : i))
      );
    }
  };

  const approveProduct = async (productId, approve) => {
    const { error } = await supabase
      .from('products')
      .update({ is_approved: approve })
      .eq('id', productId);
    if (error) toast.error('فشل تحديث المنتج');
    else {
      toast.success('تم تحديث حالة المنتج');
      refetchProducts();
    }
  };

  // ------------------- Render -------------------
  const isLoading = (activeMainTab === 'dashboard') ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading);
  if (isLoading && activeMainTab !== 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>;
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || [];
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button variant="secondary" onClick={refreshAllData} className="flex items-center gap-2">
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
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              activeMainTab === tab ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <DollarSign className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات اليوم</p>
              <p className="text-2xl font-bold">{formatCurrency(dashboardData.dailySales)}</p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <TrendingUp className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات الشهر</p>
              <p className="text-2xl font-bold">{formatCurrency(dashboardData.monthlySales)}</p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <Activity className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مبيعات السنة</p>
              <p className="text-2xl font-bold">{formatCurrency(dashboardData.yearlySales)}</p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <ShoppingBag className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">إجمالي الطلبات</p>
              <p className="text-2xl font-bold">{dashboardData.totalOrders}</p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <Users className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">مستخدمين جدد (30 يوم)</p>
              <p className="text-2xl font-bold">
                {dashboardData.newUsers} <span className="text-sm">/ {dashboardData.newSellers} بائع</span>
              </p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <Wallet className="text-gold mb-2" size={32} />
              <p className="text-text-secondary text-sm">العمولات المستحقة</p>
              <p className="text-2xl font-bold">{formatCurrency(dashboardData.totalCommission)}</p>
            </div>
          </div>

          {/* Alerts */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-2xl p-4 text-center">
              <Clock className="mx-auto text-yellow-500 mb-2" size={28} />
              <p className="text-text-secondary">طلبات معلقة</p>
              <p className="text-2xl font-bold text-yellow-500">{dashboardData.pendingOrders}</p>
            </div>
            <div className="bg-red-900/20 border border-red-600 rounded-2xl p-4 text-center">
              <Package className="mx-auto text-red-500 mb-2" size={28} />
              <p className="text-text-secondary">منتجات تحتاج مراجعة</p>
              <p className="text-2xl font-bold text-red-500">{dashboardData.pendingProducts}</p>
            </div>
            <div className="bg-blue-900/20 border border-blue-600 rounded-2xl p-4 text-center">
              <MessageCircle className="mx-auto text-blue-500 mb-2" size={28} />
              <p className="text-text-secondary">شكاوى جديدة</p>
              <p className="text-2xl font-bold text-blue-500">{dashboardData.newDisputes}</p>
            </div>
          </div>

          {/* Top Products & Top Sellers */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <h2 className="text-xl font-bold mb-4 text-gold">⭐ أفضل المنتجات مبيعاً</h2>
              <div className="space-y-2">
                {dashboardData.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gold/20 pb-2">
                    <span>{p.name}</span>
                    <span className="text-gold">{formatCurrency(p.revenue)}</span>
                    <span className="text-xs text-text-secondary">{p.qty} قطعة</span>
                  </div>
                ))}
                {dashboardData.topProducts.length === 0 && <p className="text-text-secondary">لا توجد بيانات كافية</p>}
              </div>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <h2 className="text-xl font-bold mb-4 text-gold">🏆 البائعين الأعلى تقييماً</h2>
              <div className="space-y-2">
                {dashboardData.topSellers.map((s, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gold/20 pb-2">
                    <span>{s.name}</span>
                    <span className="flex items-center gap-1"><Star size={16} className="text-gold fill-gold" /> {s.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
            <h2 className="text-xl font-bold mb-4"><LineChartIcon className="inline ml-2 text-gold" /> المبيعات اليومية (آخر 7 أيام)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#ddd" />
                <YAxis stroke="#ddd" />
                <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========================== USERS ========================== */}
      {activeMainTab === 'users' && (
        <div>
          {/* Send to all button */}
          <div className="flex justify-end mb-4">
            <Button onClick={sendToAllUsers} className="bg-blue-600 flex items-center gap-2">
              <Send size={16} /> إرسال إشعار لجميع المستخدمين
            </Button>
          </div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_users')} className={`px-4 py-2 ${activeSubTab === 'pending_users' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>
              طلبات التسجيل {pendingSellers?.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellers.length}</span>}
            </button>
          </div>

          {/* ---------- Sellers ---------- */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select
                  value={selectedSeller?.id || ''}
                  onChange={e => {
                    const seller = sellerUsers.find(u => u.id === e.target.value);
                    setSelectedSeller(seller);
                    setSellerDetailTab('profile');
                    setSellerFilterId(null);
                  }}
                  className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30"
                >
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(s => (
                    <option key={s.id} value={s.id}>{s.store_name || s.full_name} ({s.email})</option>
                  ))}
                </Select>
              </div>
              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl p-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'profile' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الملف الشخصي</button>
                    <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>إحصائيات المنتجات</button>
                    <button onClick={() => setSellerDetailTab('commission')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'commission' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>نسبة الموقع</button>
                  </div>

                  {sellerDetailTab === 'profile' && (
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div><span className="font-bold">الاسم:</span> {selectedSeller.full_name}</div>
                        <div><span className="font-bold">البريد:</span> {selectedSeller.email}</div>
                        <div><span className="font-bold">الهاتف:</span> {selectedSeller.phone || '-'}</div>
                        <div><span className="font-bold">تاريخ التسجيل:</span> {formatDate(selectedSeller.created_at)}</div>
                        <div><span className="font-bold">الحالة:</span> {selectedSeller.is_banned ? 'محظور' : 'نشط'}</div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="danger" onClick={() => updateUserMutation({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })}>
                          {selectedSeller.is_banned ? 'إلغاء الحظر' : 'حظر'}
                        </Button>
                        <Button variant="secondary" onClick={() => {
                          const msg = prompt('أدخل نص الإشعار:');
                          if (msg) sendNotificationToUser(selectedSeller.id, msg);
                        }}><Send size={14} /> إرسال إشعار</Button>
                        <Button onClick={() => {
                          const newType = selectedSeller.account_type === 'seller' ? 'buyer' : 'seller';
                          if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                            updateUserMutation({ userId: selectedSeller.id, updates: { account_type: newType } });
                        }} className="bg-amber-600"><UserCog size={14} /> تغيير نوع الحساب</Button>
                      </div>
                    </div>
                  )}

                  {sellerDetailTab === 'stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right">
                        <tbody>
                          <tr><td className="py-1 font-bold">جميع المنتجات المنشورة</td><td>{sellerStats.totalProducts}</td></tr>
                          <tr><td className="py-1 font-bold">المنتجات التي تم بيعها (قطع)</td><td>{sellerStats.soldProducts}</td></tr>
                          <tr><td className="py-1 font-bold">منتظرة الدفع</td><td>{sellerStats.pendingPayment}</td></tr>
                          <tr><td className="py-1 font-bold">تم تأكيد الدفع</td><td>{sellerStats.paymentApproved}</td></tr>
                          <tr><td className="py-1 font-bold">قيد التجهيز</td><td>{sellerStats.processing}</td></tr>
                          <tr><td className="py-1 font-bold">تم الشحن</td><td>{sellerStats.shipped}</td></tr>
                          <tr><td className="py-1 font-bold">تم التسليم</td><td>{sellerStats.delivered}</td></tr>
                          <tr><td className="py-1 font-bold">غير مشتراة</td><td>{sellerStats.notPurchased}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sellerDetailTab === 'commission' && (
                    <div>
                      <label className="block text-gold mb-2">نسبة الموقع (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sellerCommissionPercent}
                        onChange={e => setSellerCommissionPercent(parseFloat(e.target.value) || 0)}
                        className="bg-white text-gray-900 rounded px-3 py-2 w-32"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------- Buyers ---------- */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="ابحث عن مشتري بالاسم أو البريد"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 bg-white text-gray-900"
                  style={{ color: '#000' }}
                />
                <Button variant="secondary" onClick={() => refetchUsers()}><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr><th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>الإجراءات</th></tr>
                  </thead>
                  <tbody>
                    {buyerUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>{u.order_count || 0}</td>
                        <td>{formatCurrency(u.total_spent || 0)}</td>
                        <td className="flex gap-2">
                          <button onClick={() => updateUserMutation({ userId: u.id, updates: { is_banned: !u.is_banned } })} className="px-2 py-1 rounded bg-red-600 text-white text-xs">حظر</button>
                          <button onClick={() => setSelectedBuyer(u)} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs">تفاصيل</button>
                          <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(u.id, msg); }} className="bg-purple-600 px-2 py-1 rounded text-xs"><Send size={12} /></button>
                          <button onClick={() => {
                            const newType = u.account_type === 'seller' ? 'buyer' : 'seller';
                            if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                              updateUserMutation({ userId: u.id, updates: { account_type: newType } });
                          }} className="bg-amber-600 px-2 py-1 rounded text-xs">🔄 تغيير</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedBuyer && (
                <Modal onClose={() => setSelectedBuyer(null)} title="ملف المشتري">
                  <div><strong>الاسم:</strong> {selectedBuyer.full_name}</div>
                  <div><strong>البريد:</strong> {selectedBuyer.email}</div>
                  <div><strong>الهاتف:</strong> {selectedBuyer.phone || '-'}</div>
                  <div><strong>عدد الطلبات:</strong> {selectedBuyer.order_count || 0}</div>
                  <div><strong>إجمالي الإنفاق:</strong> {formatCurrency(selectedBuyer.total_spent || 0)}</div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="danger" onClick={() => updateUserMutation({ userId: selectedBuyer.id, updates: { is_banned: !selectedBuyer.is_banned } })}>
                      {selectedBuyer.is_banned ? 'إلغاء الحظر' : 'حظر'}
                    </Button>
                    <Button variant="secondary" onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(selectedBuyer.id, msg); }}>إرسال إشعار</Button>
                    <Button onClick={() => {
                      const newType = selectedBuyer.account_type === 'seller' ? 'buyer' : 'seller';
                      if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                        updateUserMutation({ userId: selectedBuyer.id, updates: { account_type: newType } });
                    }} className="bg-amber-600">تغيير نوع الحساب</Button>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ---------- Pending Registrations ---------- */}
          {activeSubTab === 'pending_users' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl">
                  <div><h3 className="font-bold">{s.full_name}</h3><p>{s.email} | {s.phone}</p><p>تاريخ الطلب: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => approveSellerMutation({ sellerId: s.id, approved: true })}>قبول</Button>
                    <Button variant="danger" onClick={() => { const notes = prompt('سبب الرفض:'); approveSellerMutation({ sellerId: s.id, approved: false, notes }); }}>رفض</Button>
                  </div>
                </div>
              ))}
              {(!pendingSellers || pendingSellers.length === 0) && <div className="text-center text-text-secondary">لا توجد طلبات تسجيل معلقة</div>}
            </div>
          )}
        </div>
      )}

      {/* ========================== PRODUCT MANAGEMENT ========================== */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <label className="text-gold">فلترة:</label>
            <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-white text-gray-900 rounded px-3 py-2 border border-gold/30">
              <option value="all">الكل</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">موافق عليها</option>
              <option value="hidden">مخفية</option>
            </select>
            {sellerFilterId && <Button variant="secondary" onClick={() => setSellerFilterId(null)}>إلغاء فلتر البائع</Button>}
          </div>
          <div className="bg-primary-card p-4 rounded-2xl overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr><th>اسم المنتج</th><th>البائع</th><th>السعر</th><th>تاريخ العملية</th><th>الحالة</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {products?.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.seller_name}</td>
                    <td>{formatCurrency(p.price)}</td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>{p.is_approved ? 'موافق' : 'قيد المراجعة'}</td>
                    <td><button onClick={() => approveProduct(p.id, !p.is_approved)} className="text-gold underline">تغيير الحالة</button></td>
                  </tr>
                ))}
                {(!products || products.length === 0) && <tr><td colSpan="6" className="text-center">لا توجد منتجات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================== FINANCE ========================== */}
      {activeMainTab === 'finance' && (
        <div>
          <div className="mb-6">
            <label className="block text-gold mb-2">اختر البائع لتسوية حسابه:</label>
            <Select
              value={selectedSeller?.id || ''}
              onChange={e => {
                const seller = sellerUsers.find(u => u.id === e.target.value);
                setSelectedSeller(seller);
              }}
              className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30"
            >
              <option value="">-- اختر بائعاً --</option>
              {sellerUsers.map(s => <option key={s.id} value={s.id}>{s.store_name || s.full_name}</option>)}
            </Select>
          </div>
          {selectedSeller ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Add transfer */}
              <div className="bg-primary-card p-4 rounded-2xl">
                <h3 className="text-lg font-bold text-gold mb-4">تسديد حساب البائع</h3>
                <div className="space-y-3">
                  <Input label="المبلغ (ريال يمني)" type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="أدخل المبلغ" className="text-gray-900" />
                  <Input label="الملاحظات" value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="اختياري" />
                  <div>
                    <label className="block mb-1 text-text-secondary">رفع سند التحويل</label>
                    <input type="file" accept="image/*" id="receiptFileInput" onChange={e => setReceiptFile(e.target.files[0])} className="bg-white rounded px-3 py-2 w-full text-gray-900" />
                  </div>
                  <Button onClick={handleAddTransfer} disabled={uploading} className="w-full">{uploading ? 'جاري الرفع...' : 'إدخال'}</Button>
                </div>
              </div>
              {/* Right: Financial summary */}
              <div className="bg-primary-card p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-gold">ملخص حسابات البائع</h3>
                  <Button variant="secondary" onClick={loadSellerReceipts}>الاستعلام عن التحويلات</Button>
                </div>
                <table className="w-full text-right mt-2">
                  <thead><tr><th>القسم</th><th>المبلغ</th><th>العملة</th></tr></thead>
                  <tbody>
                    <tr><td>إجمالي المبيعات</td><td>{formatCurrency(sellerFinance.totalSales)}</td><td>ريال يمني</td></tr>
                    <tr><td>إجمالي المرتجعات</td><td>{formatCurrency(sellerFinance.totalReturns)}</td><td>ريال يمني</td></tr>
                    <tr><td>نسبة الموقع ({sellerCommissionPercent}%)</td><td>{formatCurrency(sellerFinance.commissionAmount)}</td><td>ريال يمني</td></tr>
                    <tr><td>إجمالي الاستلامات</td><td>{formatCurrency(sellerFinance.totalReceived)}</td><td>ريال يمني</td></tr>
                    <tr className="border-t border-gold/30"><td className="font-bold">المبلغ المتبقي</td><td className="font-bold text-gold">{formatCurrency(sellerFinance.remaining)}</td><td>ريال يمني</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary p-8">يرجى اختيار بائع لعرض بياناته المالية</div>
          )}
        </div>
      )}

      {/* ========================== ORDERS / INQUIRIES ========================== */}
      {activeMainTab === 'orders' && (
        <div>
          <div className="flex gap-4 mb-4">
            <select value={filterInquiry} onChange={e => setFilterInquiry(e.target.value)} className="bg-white text-gray-900 rounded px-3 py-2">
              <option value="all">جميع الاستفسارات</option>
              <option value="unanswered">غير مجاب عنها</option>
              <option value="answered">تم الرد عليها</option>
            </select>
          </div>
          <div className="bg-primary-card p-4 rounded-2xl space-y-4">
            {inquiries.filter(i => {
              if (filterInquiry === 'answered') return i.reply;
              if (filterInquiry === 'unanswered') return !i.reply;
              return true;
            }).map(inq => (
              <div key={inq.id} className="border-b border-gold/20 pb-3">
                <p><span className="font-bold">المستخدم:</span> {inq.user?.full_name}</p>
                <p><span className="font-bold">المنتج:</span> {inq.product?.name || 'عام'}</p>
                <p><span className="font-bold">السؤال:</span> {inq.message}</p>
                {inq.reply && <p><span className="font-bold text-green-500">الرد:</span> {inq.reply} <span className="text-xs text-text-secondary">({formatDate(inq.replied_at)})</span></p>}
                {!inq.reply && <Button size="sm" onClick={() => handleReplyInquiry(inq.id)} className="mt-1">رد</Button>}
                <p className="text-xs text-text-secondary mt-1">{formatDate(inq.created_at)}</p>
              </div>
            ))}
            {inquiries.length === 0 && <div className="text-center text-text-secondary">لا توجد استفسارات</div>}
          </div>
        </div>
      )}

      {/* Modal for receipts */}
      {showReceiptsModal && (
        <Modal onClose={() => setShowReceiptsModal(false)} title="إيصالات تحويل البائع">
          <table className="w-full text-right">
            <thead><tr><th>المبلغ</th><th>التاريخ</th><th>الصورة</th><th>ملاحظات</th></tr></thead>
            <tbody>
              {sellerReceiptsList.map(r => (
                <tr key={r.id}>
                  <td>{formatCurrency(r.amount)}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td><a href={r.receipt_image} target="_blank" rel="noreferrer" className="text-blue-500 underline">عرض</a></td>
                  <td>{r.notes || '-'}</td>
                </tr>
              ))}
              {sellerReceiptsList.length === 0 && <tr><td colSpan="4" className="text-center">لا توجد إيصالات</td></tr>}
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
*/

