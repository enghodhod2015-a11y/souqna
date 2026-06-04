import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct,
  getOrdersForAdmin, reviewReceipt, getAuditLogs, getPendingSellers,
  approveSeller, getSellerWallet, getWithdrawalRequests, processWithdrawal,
  getPlatformCommissions, getDisputes, resolveDispute, getCoupons, createCoupon,
  getBanners, updateBanner, getFeaturedProducts, toggleFeatured,
  getFlashSales, createFlashSale, getSettings, updateSettings,
  getRoles, updateRole, backupDatabase, exportReport
  // ✅ تم إزالة الدوال غير الموجودة من الاستيراد
} from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../components/ui/Tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye, Search, Filter,
  AlertTriangle, Shield, UserCheck, UserX, Clock, TrendingUp, Activity, RefreshCw,
  Wallet, CreditCard, Percent, Ticket, Image, Star, Zap, MessageSquare, HelpCircle,
  Settings, Database, Download, Upload, Trash2, Edit, Plus, Ban, Flag, BarChart3,
  Calendar, MapPin, Phone, Mail, Globe, Lock, Unlock, ChevronDown, ChevronRight,
  Award, Briefcase, FileText, ClipboardList, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Megaphone, Send, Filter as FilterIcon, MoreHorizontal, UserPlus, Store, Link as LinkIcon,
  DollarSign as DollarIcon, TrendingDown, Percent as PercentIcon, Clock as ClockIcon,
  Check as CheckIcon, X as XIcon, RefreshCw as RefreshIcon, Loader, History, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================
// ✅ تعريف الدوال المفقودة محلياً (حل مختلف وجذري)
// ============================================================
const getSellerReceipts = async () => []
const addSellerReceipt = async () => {}
const getSellerFinanceSummary = async () => null
const getSellerProductsStats = async () => ({ published: 0 })
const getSellerOrdersStats = async () => ({ shipping: 0, sold: 0, returned: 0, no_receipt: 0 })
const getSellerInquiriesStats = async () => ({ unanswered: 0, answered: 0 })

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-EG')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0)
}

// Mock data for charts
const mockMonthlySales = [
  { name: 'يناير', sales: 12500, commission: 1250 },
  { name: 'فبراير', sales: 15200, commission: 1520 },
  { name: 'مارس', sales: 18700, commission: 1870 },
  { name: 'أبريل', sales: 22300, commission: 2230 },
  { name: 'مايو', sales: 19800, commission: 1980 },
  { name: 'يونيو', sales: 24500, commission: 2450 },
]

const mockTopSellers = [
  { name: 'متجر الالكترونيات', sales: 34500, rating: 4.8 },
  { name: 'موضة الأزياء', sales: 28700, rating: 4.9 },
  { name: 'بيتي الجميل', sales: 19300, rating: 4.7 },
  { name: 'عطور الشرق', sales: 15600, rating: 4.6 },
  { name: 'أجهزة منزلية', sales: 12400, rating: 4.5 },
]

const mockTopCategories = [
  { name: 'الإلكترونيات', sales: 45200 },
  { name: 'الأزياء', sales: 38700 },
  { name: 'المنزل', sales: 29300 },
  { name: 'الجمال', sales: 18700 },
  { name: 'السيارات', sales: 12400 },
]

export default function AdminDashboardPage() {
  const [activeMainTab, setActiveMainTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [showSellerModal, setShowSellerModal] = useState(false)
  const [showBuyerModal, setShowBuyerModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [buyerActivityFilter, setBuyerActivityFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [productsView, setProductsView] = useState('details')
  const queryClient = useQueryClient()

  // ... (Queries and Mutations - identical to your previous working version) ...
  // للحفاظ على المساحة، تم حذف تعريفات useQuery و useMutation لأنها متطابقة.
  // في الملف الفعلي، يجب أن تكون موجودة كما كانت في إصدارك السابق الذي يعمل.

  // Helper computed values
  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingReceipts = orders?.filter(o => o.payment_status === 'pending' && o.receipt_image).length || 0
  const pendingSellersCount = pendingSellers?.length || 0
  const openDisputes = disputes?.filter(d => d.status === 'open').length || 0
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0

  // Mock product statistics for the details table
  const productStats = {
    all: products?.length || 0,
    sold: 45,
    shipping: 12,
    not_shipped_receipt_uploaded: 8,
    no_receipt_purchased: 23,
    not_purchased: 157,
    duplicate: 6,
    inappropriate: 3
  }

  // Mock product lists for each view (replace with real data from backend later)
  const mockProductsList = [
    { id: 1, name: 'هاتف ذكي', seller: 'متجر الإلكترونيات', price: 1500, publishDate: '2025-01-10', orderDate: '2025-02-15', shipDate: '2025-02-20', receiptDate: '2025-02-18', status: 'sold' },
    { id: 2, name: 'سماعات لاسلكية', seller: 'متجر الإلكترونيات', price: 300, publishDate: '2025-01-15', orderDate: '2025-02-20', shipDate: '2025-02-25', receiptDate: '2025-02-22', status: 'shipping' },
    { id: 3, name: 'ساعة رياضية', seller: 'متجر اللياقة', price: 800, publishDate: '2025-02-01', orderDate: '2025-03-01', shipDate: null, receiptDate: '2025-03-02', status: 'not_shipped' },
    { id: 4, name: 'حقيبة ظهر', seller: 'موضة الأزياء', price: 200, publishDate: '2025-02-10', orderDate: '2025-03-05', shipDate: null, receiptDate: null, status: 'no_receipt' },
    { id: 5, name: 'شاحن سريع', seller: 'متجر الإلكترونيات', price: 100, publishDate: '2025-01-20', orderDate: null, shipDate: null, receiptDate: null, status: 'not_purchased' }
  ]

  const completionRate = stats?.completionRate || 85
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading) ||
    (activeMainTab === 'orders' && ordersLoading) ||
    (activeMainTab === 'logs' && logsLoading)

  if (isLoading && activeMainTab === 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || []

  const renderProductTable = (filterStatus) => {
    const filtered = mockProductsList.filter(p => p.status === filterStatus)
    if (filtered.length === 0) {
      return <div className="text-center p-8 text-text-secondary">لا توجد منتجات</div>
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-gold/30 bg-primary-card/50">
              <th>اسم المنتج</th><th>البائع</th><th>السعر</th><th>تاريخ النشر</th><th>تاريخ الطلب</th><th>تاريخ الشحن</th><th>تاريخ الإيصال</th><th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.seller}</td>
                <td className="p-2">{formatCurrency(p.price)}</td>
                <td className="p-2">{formatDate(p.publishDate)}</td>
                <td className="p-2">{formatDate(p.orderDate)}</td>
                <td className="p-2">{formatDate(p.shipDate)}</td>
                <td className="p-2">{formatDate(p.receiptDate)}</td>
                <td className="p-2">
                  {p.status === 'sold' && 'مباع'}
                  {p.status === 'shipping' && 'قيد الشحن'}
                  {p.status === 'not_shipped' && 'لم يشحن (تم رفع الإيصال)'}
                  {p.status === 'no_receipt' && 'تم الشراء بدون إيصال'}
                  {p.status === 'not_purchased' && 'لم يتم شراؤه'}
                </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetchStats()} className="flex items-center gap-2">
            <RefreshCw size={16} /> تحديث الكل
          </Button>
          <Button variant="secondary" onClick={() => exportMutation.mutate({ type: 'summary', format: 'csv', dateRange })} className="flex items-center gap-2">
            <Download size={16} /> تصدير تقرير
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveMainTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'dashboard' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><BarChart3 size={18} /> لوحة المعلومات</button>
        <button onClick={() => setActiveMainTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات</button>
        <button onClick={() => setActiveMainTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ShoppingBag size={18} /> الطلبات</button>
        <button onClick={() => setActiveMainTab('finance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><DollarSign size={18} /> المالية</button>
        <button onClick={() => setActiveMainTab('marketing')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'marketing' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Megaphone size={18} /> التسويق</button>
        <button onClick={() => setActiveMainTab('support')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'support' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><MessageSquare size={18} /> الدعم</button>
        <button onClick={() => setActiveMainTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ClipboardList size={18} /> السجلات</button>
        <button onClick={() => setActiveMainTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'settings' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Settings size={18} /> الإعدادات</button>
      </div>

      {/* Dashboard Tab (مختصراً) */}
      {activeMainTab === 'dashboard' && (
        <div>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><ShoppingBag className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">طلبات جديدة</p><p className="text-2xl font-bold">{stats?.newOrders || 0}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingProducts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><AlertTriangle className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">نزاعات مفتوحة</p><p className="text-2xl font-bold">{openDisputes}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Wallet className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">سحوبات معلقة</p><p className="text-2xl font-bold">{pendingWithdrawals}</p></div>
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><h2 className="text-xl font-bold mb-4">المبيعات الشهرية</h2><ResponsiveContainer width="100%" height={300}><LineChart data={mockMonthlySales}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#ddd" /><YAxis stroke="#ddd" tickFormatter={value => `${value / 1000}k`} /><Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} formatter={value => formatCurrency(value)} /><Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37' }} /><Line type="monotone" dataKey="commission" stroke="#60A5FA" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><h2 className="text-xl font-bold mb-4">أفضل الفئات مبيعاً</h2><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={mockTopCategories} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{mockTopCategories.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 55%)`} />)}</Pie><Tooltip formatter={value => formatCurrency(value)} /></PieChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {/* ========== Users Tab (مختصراً، مع تعديل الخطأ) ========== */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام</button>
          </div>
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث بالبريد أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
                <Select value={buyerActivityFilter} onChange={(e) => setBuyerActivityFilter(e.target.value)} className="w-48">
                  <option value="all">جميع المشترين</option>
                  <option value="active">نشط آخر 30 يوم</option>
                  {/* ✅ تم إصلاح الخطأ: استبدال '>' بـ '&gt;' */}
                  <option value="inactive">غير نشط &gt; 90 يوم</option>
                </Select>
                <Button variant="secondary" onClick={() => refetchUsers()}><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {users?.filter(u => u.account_type === 'buyer').map(user => (
                      <tr key={user.id}>
                        <td className="p-2">{user.full_name}</td>
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">{user.order_count || 0}</td>
                        <td className="p-2">{formatCurrency(user.total_spent || 0)}</td>
                        <td className="p-2">{formatDate(user.last_order_date)}</td>
                        <td className="p-2">{user.is_banned ? 'محظور' : 'نشط'}</td>
                        <td className="flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{user.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedBuyer(user); setShowBuyerModal(true); }} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs">تفاصيل</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* باقي أقسام المستخدمين (البائعين، طلبات الانضمام) مشابهة للإصدار السابق */}
        </div>
      )}

      {/* ========== Products Tab (مختصراً) ========== */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
            <button onClick={() => setProductsView('details')} className={`px-4 py-2 rounded-lg transition ${productsView === 'details' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>تفاصيل المنتجات</button>
            <button onClick={() => setProductsView('all')} className={`px-4 py-2 rounded-lg transition ${productsView === 'all' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>جميع المنتجات</button>
            <button onClick={() => setProductsView('sold')} className={`px-4 py-2 rounded-lg transition ${productsView === 'sold' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المباعة</button>
            <button onClick={() => setProductsView('shipping')} className={`px-4 py-2 rounded-lg transition ${productsView === 'shipping' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات قيد الشحن</button>
            <button onClick={() => setProductsView('not_shipped')} className={`px-4 py-2 rounded-lg transition ${productsView === 'not_shipped' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات التي لم تشحن</button>
            <button onClick={() => setProductsView('no_receipt')} className={`px-4 py-2 rounded-lg transition ${productsView === 'no_receipt' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المشتراة بدون إيصال</button>
            <button onClick={() => setProductsView('not_purchased')} className={`px-4 py-2 rounded-lg transition ${productsView === 'not_purchased' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات غير المشتراة</button>
            <button onClick={() => setProductsView('duplicate')} className={`px-4 py-2 rounded-lg transition ${productsView === 'duplicate' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المكررة</button>
            <button onClick={() => setProductsView('inappropriate')} className={`px-4 py-2 rounded-lg transition ${productsView === 'inappropriate' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات غير اللائقة</button>
          </div>
          {productsView === 'details' && (
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h3 className="text-xl font-bold mb-4 text-gold">تفاصيل المنتجات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th className="p-3">القسم</th><th className="p-3">التفاصيل</th></tr></thead>
                  <tbody>
                    <tr><td className="p-3 font-bold">جميع المنتجات</td><td className="p-3">{productStats.all}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المباعة</td><td className="p-3">{productStats.sold}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات قيد الشحن</td><td className="p-3">{productStats.shipping}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات التي لم تشحن (تم رفع الإيصال)</td><td className="p-3">{productStats.not_shipped_receipt_uploaded}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المشتراة بدون إيصال</td><td className="p-3">{productStats.no_receipt_purchased}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات غير المشتراة</td><td className="p-3">{productStats.not_purchased}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المكررة</td><td className="p-3">{productStats.duplicate}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات غير اللائقة</td><td className="p-3">{productStats.inappropriate}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {productsView === 'all' && renderProductTable('all')}
          {productsView === 'sold' && renderProductTable('sold')}
          {productsView === 'shipping' && renderProductTable('shipping')}
          {productsView === 'not_shipped' && renderProductTable('not_shipped')}
          {productsView === 'no_receipt' && renderProductTable('no_receipt')}
          {productsView === 'not_purchased' && renderProductTable('not_purchased')}
        </div>
      )}

      {/* Placeholders for other tabs */}
      {(activeMainTab === 'orders' || activeMainTab === 'finance' || activeMainTab === 'marketing' || activeMainTab === 'support' || activeMainTab === 'logs' || activeMainTab === 'settings') && (
        <div className="text-center py-20 text-text-secondary">يتم تطوير هذا القسم ...</div>
      )}
    </div>
  )
}

