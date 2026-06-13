import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import {
  DollarSign, TrendingUp, Activity, ShoppingBag, Users, Wallet,
  Clock, Package, MessageCircle, Star, LineChart as LineChartIcon
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatDate, formatCurrency } from '../../utils/format';
import { Skeleton, SkeletonText, SkeletonCircle } from '../../components/ui/Skeleton';

export default function AdminDashboardHomeTab() {
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
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

      const { data: topItems } = await supabase
        .from('order_items')
        .select(`product_id, quantity, product_price, order:orders!inner(status)`)
        .eq('order.status', 'completed')
        .limit(200);

      let topProducts = [];
      if (topItems) {
        const productSales = {};
        for (const item of topItems) {
          if (!productSales[item.product_id]) productSales[item.product_id] = { qty: 0, revenue: 0 };
          productSales[item.product_id].qty += item.quantity;
          productSales[item.product_id].revenue += item.product_price * item.quantity;
        }
        const productIds = Object.keys(productSales);
        if (productIds.length) {
          const { data: productDetails } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          const productMap = Object.fromEntries(productDetails?.map(p => [p.id, p.name]) || []);
          topProducts = Object.entries(productSales)
            .map(([id, val]) => ({ id, name: productMap[id] || 'غير معروف', revenue: val.revenue, qty: val.qty }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        }
      }

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

      return {
        dailySales, monthlySales, yearlySales, totalOrders: totalOrders || 0,
        newUsers: newUsers || 0, newSellers: newSellers || 0, totalCommission,
        topProducts, topSellers, pendingOrders: pendingOrders || 0,
        pendingProducts: pendingProducts || 0, newDisputes: newDisputes || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: salesChartData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['adminSalesChart'],
    queryFn: async () => {
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
      return last7Days;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (dashboardLoading || chartLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-primary-card p-5 rounded-2xl">
              <SkeletonCircle size="w-8 h-8 mb-2" />
              <SkeletonText width="w-20" height="h-3" className="mb-1" />
              <SkeletonText width="w-16" height="h-6" />
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <DollarSign className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">مبيعات اليوم</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.dailySales || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <TrendingUp className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">مبيعات الشهر</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.monthlySales || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <Activity className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">مبيعات السنة</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.yearlySales || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <ShoppingBag className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-white">{dashboardData?.totalOrders || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <Users className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">مستخدمين جدد (30 يوم)</p>
          <p className="text-2xl font-bold text-white">{dashboardData?.newUsers || 0} <span className="text-sm">/ {dashboardData?.newSellers || 0} بائع</span></p>
        </div>
        <div className="bg-gradient-to-br from-primary-card to-primary-card/95 p-5 rounded-2xl shadow-lg border border-gold/20">
          <Wallet className="text-gold mb-2" size={32} />
          <p className="text-text-secondary text-sm">العمولات المستحقة</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.totalCommission || 0)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
          <Clock className="mx-auto text-yellow-500 mb-2" size={28} />
          <p className="text-text-secondary">طلبات معلقة</p>
          <p className="text-2xl font-bold text-yellow-500">{dashboardData?.pendingOrders || 0}</p>
        </div>
        <div className="bg-red-900/20 border border-red-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
          <Package className="mx-auto text-red-500 mb-2" size={28} />
          <p className="text-text-secondary">منتجات تحتاج مراجعة</p>
          <p className="text-2xl font-bold text-red-500">{dashboardData?.pendingProducts || 0}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-600/50 rounded-2xl p-4 text-center backdrop-blur-sm">
          <MessageCircle className="mx-auto text-blue-500 mb-2" size={28} />
          <p className="text-text-secondary">شكاوى جديدة</p>
          <p className="text-2xl font-bold text-blue-500">{dashboardData?.newDisputes || 0}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
          <h2 className="text-xl font-bold mb-4 text-gold">⭐ أفضل المنتجات مبيعاً</h2>
          <div className="space-y-3">
            {dashboardData?.topProducts?.map((p, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gold/20 pb-2">
                <span className="text-white">{p.name}</span>
                <span className="text-gold font-medium">{formatCurrency(p.revenue)}</span>
                <span className="text-xs text-text-secondary">{p.qty} قطعة</span>
              </div>
            ))}
            {(!dashboardData?.topProducts || dashboardData.topProducts.length === 0) && (
              <p className="text-text-secondary text-center">لا توجد بيانات كافية</p>
            )}
          </div>
        </div>
        <div className="bg-primary-card p-5 rounded-2xl shadow-lg border border-gold/20">
          <h2 className="text-xl font-bold mb-4 text-gold">🏆 البائعين الأعلى تقييماً</h2>
          <div className="space-y-3">
            {dashboardData?.topSellers?.map((s, i) => (
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
  );
}

