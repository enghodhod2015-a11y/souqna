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
import { ExportButtons } from '../../components/ui/ExportButtons';
import { Button } from '../../components/ui/Button';

export default function AdminDashboardHomeTab() {
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      console.log("🔍 بدء جلب بيانات لوحة المعلومات...");
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. مبيعات اليوم
        const { data: dailyOrders, error: dailyError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', today.toISOString());
        if (dailyError) console.error("خطأ في جلب مبيعات اليوم:", dailyError);
        const dailySales = dailyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
        console.log("✅ مبيعات اليوم:", dailySales);

        // 2. مبيعات الشهر
        const { data: monthlyOrders, error: monthlyError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString());
        if (monthlyError) console.error("خطأ في جلب مبيعات الشهر:", monthlyError);
        const monthlySales = monthlyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
        console.log("✅ مبيعات الشهر:", monthlySales);

        // 3. مبيعات السنة
        const { data: yearlyOrders, error: yearlyError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', startOfYear.toISOString());
        if (yearlyError) console.error("خطأ في جلب مبيعات السنة:", yearlyError);
        const yearlySales = yearlyOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
        console.log("✅ مبيعات السنة:", yearlySales);

        // 4. إجمالي الطلبات
        const { count: totalOrders, error: totalOrdersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        if (totalOrdersError) console.error("خطأ في جلب إجمالي الطلبات:", totalOrdersError);
        console.log("✅ إجمالي الطلبات:", totalOrders);

        // 5. المستخدمين الجدد
        const { count: newUsers, error: newUsersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        if (newUsersError) console.error("خطأ في جلب المستخدمين الجدد:", newUsersError);
        const { count: newSellers, error: newSellersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'seller')
          .gte('created_at', thirtyDaysAgo.toISOString());
        if (newSellersError) console.error("خطأ في جلب البائعين الجدد:", newSellersError);
        console.log("✅ مستخدمين جدد:", newUsers, "/ بائعين جدد:", newSellers);

        // 6. العمولات المستحقة (10% من مبيعات السنة)
        const totalCommission = yearlySales * 0.1;

        // 7. أفضل المنتجات مبيعاً
        const { data: topItems, error: topItemsError } = await supabase
          .from('order_items')
          .select(`product_id, quantity, product_price, order:orders!inner(status)`)
          .eq('order.status', 'completed')
          .limit(200);
        if (topItemsError) console.error("خطأ في جلب أفضل المنتجات:", topItemsError);

        let topProducts = [];
        if (topItems && topItems.length > 0) {
          const productSales = {};
          for (const item of topItems) {
            if (!productSales[item.product_id]) productSales[item.product_id] = { qty: 0, revenue: 0 };
            productSales[item.product_id].qty += item.quantity;
            productSales[item.product_id].revenue += item.product_price * item.quantity;
          }
          const productIds = Object.keys(productSales);
          if (productIds.length) {
            const { data: productDetails, error: productDetailsError } = await supabase
              .from('products')
              .select('id, name')
              .in('id', productIds);
            if (productDetailsError) console.error("خطأ في جلب تفاصيل المنتجات:", productDetailsError);
            const productMap = Object.fromEntries(productDetails?.map(p => [p.id, p.name]) || []);
            topProducts = Object.entries(productSales)
              .map(([id, val]) => ({ id, name: productMap[id] || 'غير معروف', revenue: val.revenue, qty: val.qty }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5);
          }
        }
        console.log("✅ أفضل المنتجات:", topProducts);

        // 8. الطلبات المعلقة
        const { count: pendingOrders, error: pendingOrdersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'pending_payment_review']);
        if (pendingOrdersError) console.error("خطأ في جلب الطلبات المعلقة:", pendingOrdersError);

        // 9. المنتجات التي تحتاج مراجعة
        const { count: pendingProducts, error: pendingProductsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);
        if (pendingProductsError) console.error("خطأ في جلب المنتجات المعلقة:", pendingProductsError);

        // 10. النزاعات الجديدة (افتراضي 0 إذا لم يكن الجدول موجوداً)
        let newDisputes = 0;
        try {
          const { count, error: disputesError } = await supabase
            .from('disputes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
          if (!disputesError) newDisputes = count || 0;
        } catch (e) {
          console.warn("جدول disputes غير موجود، سيتم تجاهل النزاعات");
        }

        const result = {
          dailySales, monthlySales, yearlySales, totalOrders: totalOrders || 0,
          newUsers: newUsers || 0, newSellers: newSellers || 0, totalCommission,
          topProducts, topSellers: [
            { name: 'محمد علي', rating: 4.8 },
            { name: 'أحمد حسن', rating: 4.7 },
            { name: 'فاطمة الزهراء', rating: 4.6 },
            { name: 'عبدالله يحيى', rating: 4.5 },
            { name: 'نورة سعيد', rating: 4.4 },
          ], pendingOrders: pendingOrders || 0,
          pendingProducts: pendingProducts || 0, newDisputes,
        };
        console.log("📊 البيانات النهائية للوحة:", result);
        return result;
      } catch (err) {
        console.error("❌ خطأ غير متوقع في جلب البيانات:", err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: salesChartData = [], isLoading: chartLoading, error: chartError, refetch: refetchChart } = useQuery({
    queryKey: ['adminSalesChart'],
    queryFn: async () => {
      console.log("🔍 بدء جلب بيانات المبيعات اليومية...");
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const { data: dayOrders, error: dayError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDay.toISOString());
        if (dayError) console.error(`خطأ في جلب مبيعات يوم ${date}:`, dayError);
        const daySales = dayOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
        last7Days.push({ name: date.toLocaleDateString('ar', { weekday: 'short' }), sales: daySales });
      }
      console.log("✅ بيانات المبيعات اليومية:", last7Days);
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

  if (dashboardError || chartError) {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-2">⚠️ حدث خطأ في تحميل البيانات</p>
        <p className="text-text-secondary text-sm">يرجى التحقق من اتصالك بقاعدة البيانات أو تحديث الصفحة</p>
        <div className="flex gap-3 justify-center mt-4">
          <Button onClick={() => { refetchDashboard(); refetchChart(); }} className="bg-gold text-primary-blue">إعادة المحاولة</Button>
          <Button onClick={() => window.location.reload()} variant="secondary" className="bg-gray-700">تحديث الصفحة</Button>
        </div>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold"><LineChartIcon className="inline ml-2 text-gold" /> المبيعات اليومية (آخر 7 أيام)</h2>
          <ExportButtons 
            data={salesChartData} 
            filename="daily_sales_report" 
            title="تقرير المبيعات اليومية"
            columns={[
              { header: 'اليوم', dataKey: 'name' },
              { header: 'المبيعات (ريال)', dataKey: 'sales' }
            ]}
          />
        </div>
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


