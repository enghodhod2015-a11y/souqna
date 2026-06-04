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
} from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../components/ui/Tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye, Search, Filter,
  AlertTriangle, Shield, UserCheck, UserX, Clock, TrendingUp, Activity, RefreshCw,
  Wallet, CreditCard, Percent, Ticket, Image, Star, Zap, MessageSquare, HelpCircle,
  Settings, Database, Download, Upload, Trash2, Edit, Plus, Ban, Flag, BarChart3,
  Calendar, MapPin, Phone, Mail, Globe, Lock, Unlock, ChevronDown, ChevronRight,
  Award, Briefcase, FileText, ClipboardList, PieChart as PieChartIcon, LineChart as LineChartIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0)
}

// Mock data for charts (replace with real API calls)
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
  const [showSellerModal, setShowSellerModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const queryClient = useQueryClient()

  // ========== Queries ==========
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats
  })

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: () => getUsers({ search: searchTerm }),
    enabled: activeMainTab === 'users'
  })

  const { data: pendingSellers, refetch: refetchPendingSellers } = useQuery({
    queryKey: ['pendingSellers'],
    queryFn: getPendingSellers,
    enabled: activeMainTab === 'users' && activeSubTab === 'pending_sellers'
  })

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => getProductsForAdmin(),
    enabled: activeMainTab === 'products'
  })

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: getOrdersForAdmin,
    enabled: activeMainTab === 'orders'
  })

  const { data: wallets, refetch: refetchWallets } = useQuery({
    queryKey: ['sellerWallets'],
    queryFn: () => getSellerWallet(),
    enabled: activeMainTab === 'finance' && activeSubTab === 'wallets'
  })

  const { data: withdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['withdrawalRequests'],
    queryFn: getWithdrawalRequests,
    enabled: activeMainTab === 'finance' && activeSubTab === 'withdrawals'
  })

  const { data: commissions, refetch: refetchCommissions } = useQuery({
    queryKey: ['platformCommissions', dateRange],
    queryFn: () => getPlatformCommissions(dateRange),
    enabled: activeMainTab === 'finance' && activeSubTab === 'commissions'
  })

  const { data: disputes, refetch: refetchDisputes } = useQuery({
    queryKey: ['disputes'],
    queryFn: getDisputes,
    enabled: activeMainTab === 'support' && activeSubTab === 'disputes'
  })

  const { data: coupons, refetch: refetchCoupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: getCoupons,
    enabled: activeMainTab === 'marketing' && activeSubTab === 'coupons'
  })

  const { data: banners, refetch: refetchBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: getBanners,
    enabled: activeMainTab === 'marketing' && activeSubTab === 'banners'
  })

  const { data: featuredProducts, refetch: refetchFeatured } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
    enabled: activeMainTab === 'marketing' && activeSubTab === 'featured'
  })

  const { data: flashSales, refetch: refetchFlashSales } = useQuery({
    queryKey: ['flashSales'],
    queryFn: getFlashSales,
    enabled: activeMainTab === 'marketing' && activeSubTab === 'flashsales'
  })

  const { data: auditLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
    enabled: activeMainTab === 'logs'
  })

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: activeMainTab === 'settings'
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: activeMainTab === 'settings' && activeSubTab === 'roles'
  })

  // ========== Mutations ==========
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث المستخدم')
    }
  })

  const approveProductMutation = useMutation({
    mutationFn: ({ productId, approve, is_hidden }) => approveProduct(productId, approve, is_hidden),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث حالة المنتج')
    }
  })

  const reviewReceiptMutation = useMutation({
    mutationFn: ({ orderId, approved, notes }) => reviewReceipt(orderId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminOrders'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث الطلب')
    }
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingSellers'])
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('تم تحديث حالة البائع')
    }
  })

  const processWithdrawalMutation = useMutation({
    mutationFn: ({ requestId, approved, transactionId }) => processWithdrawal(requestId, approved, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['withdrawalRequests'])
      queryClient.invalidateQueries(['sellerWallets'])
      toast.success('تم معالجة طلب السحب')
    }
  })

  const resolveDisputeMutation = useMutation({
    mutationFn: ({ disputeId, resolution, notes }) => resolveDispute(disputeId, resolution, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['disputes'])
      toast.success('تم حل النزاع')
    }
  })

  const createCouponMutation = useMutation({
    mutationFn: (couponData) => createCoupon(couponData),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons'])
      toast.success('تم إنشاء الكوبون')
      setShowCouponModal(false)
    }
  })

  const updateBannerMutation = useMutation({
    mutationFn: ({ bannerId, data }) => updateBanner(bannerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['banners'])
      toast.success('تم تحديث البانر')
      setShowBannerModal(false)
    }
  })

  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ productId, featured }) => toggleFeatured(productId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries(['featuredProducts'])
      toast.success('تم تحديث المنتج المميز')
    }
  })

  const createFlashSaleMutation = useMutation({
    mutationFn: (saleData) => createFlashSale(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['flashSales'])
      toast.success('تم إنشاء العرض')
      setShowFlashSaleModal(false)
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settingsData) => updateSettings(settingsData),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      toast.success('تم حفظ الإعدادات')
      setShowSettingsModal(false)
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, permissions }) => updateRole(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      toast.success('تم تحديث الصلاحيات')
    }
  })

  const backupMutation = useMutation({
    mutationFn: () => backupDatabase(),
    onSuccess: () => toast.success('تم إنشاء النسخة الاحتياطية'),
    onError: () => toast.error('فشل إنشاء النسخة الاحتياطية')
  })

  const exportMutation = useMutation({
    mutationFn: ({ type, format, dateRange }) => exportReport(type, format, dateRange),
    onSuccess: (data) => {
      // download file
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${Date.now()}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('تم تصدير التقرير')
    }
  })

  // Calculate dashboard stats
  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingReceipts = orders?.filter(o => o.payment_status === 'pending' && o.receipt_image).length || 0
  const pendingSellersCount = pendingSellers?.length || 0

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

      {/* ========== Main Tabs ========== */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveMainTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'dashboard' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><BarChart3 size={18} /> لوحة المعلومات</button>
        <button onClick={() => setActiveMainTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات {pendingProducts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingProducts}</span>}</button>
        <button onClick={() => setActiveMainTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ShoppingBag size={18} /> الطلبات</button>
        <button onClick={() => setActiveMainTab('finance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><DollarSign size={18} /> المالية</button>
        <button onClick={() => setActiveMainTab('marketing')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'marketing' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Megaphone size={18} /> التسويق</button>
        <button onClick={() => setActiveMainTab('support')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'support' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><MessageSquare size={18} /> الدعم</button>
        <button onClick={() => setActiveMainTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ClipboardList size={18} /> السجلات</button>
        <button onClick={() => setActiveMainTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'settings' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Settings size={18} /> الإعدادات</button>
      </div>

      {/* ========== Dashboard Tab ========== */}
      {activeMainTab === 'dashboard' && (
        <div>
          {/* Alert banners */}
          {(pendingProducts > 0 || pendingReceipts > 0 || pendingSellersCount > 0) && (
            <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-4 mb-6 flex flex-wrap gap-4 justify-between items-center">
              <div className="flex gap-4 flex-wrap">
                {pendingProducts > 0 && <span className="flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" /> {pendingProducts} منتج بانتظار الموافقة</span>}
                {pendingReceipts > 0 && <span className="flex items-center gap-2"><Receipt size={18} className="text-yellow-500" /> {pendingReceipts} إيصال بانتظار المراجعة</span>}
                {pendingSellersCount > 0 && <span className="flex items-center gap-2"><UserCheck size={18} className="text-yellow-500" /> {pendingSellersCount} بائع بانتظار التوثيق</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveMainTab('products')} className="text-gold underline text-sm">مراجعة المنتجات</button>
                <button onClick={() => setActiveMainTab('orders')} className="text-gold underline text-sm">مراجعة الإيصالات</button>
                <button onClick={() => { setActiveMainTab('users'); setActiveSubTab('pending_sellers'); }} className="text-gold underline text-sm">مراجعة البائعين</button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><ShoppingBag className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">طلبات جديدة</p><p className="text-2xl font-bold">{stats?.newOrders || 0}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Clock className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">نزاعات مفتوحة</p><p className="text-2xl font-bold">{stats?.openDisputes || 0}</p></div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LineChartIcon size={20} className="text-gold" /> المبيعات الشهرية</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockMonthlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#ddd" />
                  <YAxis stroke="#ddd" tickFormatter={value => `${value / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} formatter={value => formatCurrency(value)} />
                  <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37' }} />
                  <Line type="monotone" dataKey="commission" stroke="#60A5FA" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-gold" /> أفضل الفئات مبيعاً</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockTopCategories} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {mockTopCategories.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 55%)`} />)}
                  </Pie>
                  <Tooltip formatter={value => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Award size={20} className="text-gold" /> أفضل 5 بائعين</h2>
              <div className="space-y-3">
                {mockTopSellers.map((seller, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-secondary-blue/30 rounded-lg">
                    <div><span className="font-bold">{idx + 1}.</span> {seller.name}</div>
                    <div className="flex gap-4"><span>{formatCurrency(seller.sales)}</span><span className="text-gold">⭐ {seller.rating}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-gold" /> نسبة إتمام الطلبات</h2>
              <div className="flex justify-center items-center h-48">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#D4AF37" strokeWidth="8" strokeDasharray={`${(stats?.completionRate || 85) * 2.827} 283`} transform="rotate(-90 50 50)" />
                    <text x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="20">{stats?.completionRate || 85}%</text>
                  </svg>
                </div>
              </div>
              <p className="text-center text-text-secondary">نسبة الطلبات المكتملة مقابل الملغاة</p>
            </div>
          </div>
        </div>
      )}

      {/* ========== Users Tab ========== */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام {pendingSellersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellersCount}</span>}</button>
          </div>

          {/* Buyers Sub-tab */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث بالبريد أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
                <select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30">
                  <option>جميع المشترين</option>
                  <option>نشط آخر 30 يوم</option>
                  <option>غير نشط > 90 يوم</option>
                </select>
                <Button variant="secondary" onClick={() => refetchUsers()} className="flex items-center gap-2"><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th className="p-3">الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {users?.filter(u => u.account_type === 'buyer').map(user => (
                      <tr key={user.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                        <td className="p-3">{user.full_name || '-'}</td>
                        <td>{user.email}</td>
                        <td>{user.order_count || 0}</td>
                        <td>{formatCurrency(user.total_spent || 0)}</td>
                        <td className="text-sm">{formatDate(user.last_order_date)}</td>
                        <td>{user.is_banned ? <span className="text-red-400 flex items-center gap-1"><Ban size={14} /> محظور</span> : <span className="text-green-400">نشط</span>}</td>
                        <td className="flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white`}>{user.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedSeller(user); setShowSellerModal(true); }} className="px-2 py-1 rounded text-xs bg-gold text-primary-blue">تفاصيل</button>
                        </td>
                      </tr>
                    ))}
                    {(!users || users.filter(u => u.account_type === 'buyer').length === 0) && <tr><td colSpan="7" className="text-center p-8">لا توجد نتائج</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sellers Sub-tab */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
                <Button variant="secondary" onClick={() => refetchUsers()}><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th>المتجر</th><th>البريد</th><th>التقييم</th><th>نسبة الإتمام</th><th>المبيعات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {users?.filter(u => u.account_type === 'seller').map(user => (
                      <tr key={user.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                        <td className="p-3">{user.store_name || user.full_name}</td>
                        <td>{user.email}</td>
                        <td><span className="text-gold">⭐ {user.rating || 0}</span></td>
                        <td>{user.completion_rate || 0}%</td>
                        <td>{formatCurrency(user.total_sales || 0)}</td>
                        <td>{user.is_banned ? 'محظور' : (user.is_verified ? 'موثق' : 'غير موثق')}</td>
                        <td className="flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white`}>{user.is_banned ? 'رفع الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedSeller(user); setShowSellerModal(true); }} className="px-2 py-1 rounded text-xs bg-gold text-primary-blue">تفاصيل</button>
                          <button className="px-2 py-1 rounded text-xs bg-blue-600 text-white" onClick={() => window.open(`/store/${user.id}`, '_blank')}>عرض المتجر</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Sellers Sub-tab */}
          {activeSubTab === 'pending_sellers' && (
            <div className="space-y-4">
              {pendingSellers?.map(seller => (
                <div key={seller.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{seller.full_name}</h3>
                      <p className="text-text-secondary">{seller.email} | {seller.phone}</p>
                      <p className="text-text-secondary text-sm">طلب انضمام: {formatDate(seller.created_at)}</p>
                      <div className="mt-2"><a href={seller.license_document} target="_blank" className="text-gold underline text-sm flex items-center gap-1"><FileText size={14} /> عرض الوثائق</a></div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <button onClick={() => approveSellerMutation.mutate({ sellerId: seller.id, approved: true })} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-1"><CheckCircle size={16} /> قبول</button>
                      <button onClick={() => { const notes = prompt('سبب الرفض:'); if (notes) approveSellerMutation.mutate({ sellerId: seller.id, approved: false, notes }); }} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-1"><XCircle size={16} /> رفض</button>
                    </div>
                  </div>
                </div>
              ))}
              {(!pendingSellers || pendingSellers.length === 0) && <div className="text-center p-8 text-text-secondary">لا توجد طلبات انضمام معلقة</div>}
            </div>
          )}
        </div>
      )}

      {/* ========== Products Tab ========== */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setActiveSubTab('pending')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'pending' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>بإنتظار الموافقة {pendingProducts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingProducts}</span>}</button>
            <button onClick={() => setActiveSubTab('approved')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'approved' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>المنتجات المنشورة</button>
            <button onClick={() => setActiveSubTab('hidden')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'hidden' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>المنتجات المخفية</button>
            <button onClick={() => setActiveSubTab('reported')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'reported' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>مبلغ عنها</button>
            <button onClick={() => setActiveSubTab('duplicates')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'duplicates' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>مكررة</button>
            <button onClick={() => setActiveSubTab('categories')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'categories' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>إدارة الفئات</button>
          </div>

          {/* Bulk Actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <select className="bg-secondary-blue rounded-lg px-3 py-2 text-sm border border-gold/30">
                <option>إجراء جماعي</option>
                <option>نقل إلى فئة</option>
                <option>تغيير الحالة إلى منشور</option>
                <option>تغيير الحالة إلى مخفي</option>
                <option>حذف</option>
              </select>
              <Button variant="secondary" size="sm">تطبيق</Button>
            </div>
            <Button variant="secondary" onClick={() => refetchProducts()} className="flex items-center gap-2"><RefreshCw size={16} /> تحديث</Button>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th><input type="checkbox" /></th><th>المنتج</th><th>البائع</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {products?.filter(p => {
                  if (activeSubTab === 'pending') return !p.is_approved;
                  if (activeSubTab === 'hidden') return p.is_hidden;
                  if (activeSubTab === 'approved') return p.is_approved && !p.is_hidden;
                  return true;
                }).map(product => (
                  <tr key={product.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                    <td className="p-2"><input type="checkbox" /></td>
                    <td className="p-2"><div className="font-bold">{product.name}</div><div className="text-xs text-text-secondary">{product.category}</div></td>
                    <td className="p-2">{product.seller?.full_name || '-'}</td>
                    <td className="p-2">{formatCurrency(product.price)}</td>
                    <td className="p-2">{product.stock_quantity}</td>
                    <td className="p-2">
                      {!product.is_approved && <span className="bg-yellow-600 px-2 py-0.5 rounded-full text-xs">قيد المراجعة</span>}
                      {product.is_hidden && <span className="bg-red-600 px-2 py-0.5 rounded-full text-xs">مخفي</span>}
                      {product.is_approved && !product.is_hidden && <span className="bg-green-600 px-2 py-0.5 rounded-full text-xs">منشور</span>}
                    </td>
                    <td className="p-2 flex gap-2">
                      {!product.is_approved && <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: true })} className="bg-green-600 p-1 rounded"><CheckCircle size={16} /></button>}
                      <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: false, is_hidden: !product.is_hidden })} className={`${product.is_hidden ? 'bg-blue-600' : 'bg-red-600'} p-1 rounded`}><Eye size={16} /></button>
                      <button className="bg-gold text-primary-blue p-1 rounded"><Edit size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== Orders Tab ========== */}
      {activeMainTab === 'orders' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setActiveSubTab('pending_receipts')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'pending_receipts' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>إيصالات معلقة {pendingReceipts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingReceipts}</span>}</button>
            <button onClick={() => setActiveSubTab('refund_requests')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'refund_requests' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>طلبات استرداد</button>
            <button onClick={() => setActiveSubTab('all_orders')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'all_orders' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>جميع الطلبات</button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <input type="date" placeholder="من تاريخ" className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30" onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            <input type="date" placeholder="إلى تاريخ" className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30" onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
            <select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30">
              <option>كل البائعين</option>
            </select>
            <select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30">
              <option>كل المدن</option>
            </select>
            <Button variant="secondary" size="sm">فلترة</Button>
          </div>

          {/* Pending Receipts */}
          {activeSubTab === 'pending_receipts' && (
            <div className="space-y-4">
              {orders?.filter(o => o.payment_status === 'pending' && o.receipt_image).map(order => (
                <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div><p className="font-bold">الطلب #{order.id}</p><p>المنتج: {order.product?.title || '-'}</p><p>المشتري: {order.buyer?.full_name}</p><p>المبلغ: {formatCurrency(order.total_price)} | عمولة المنصة: {formatCurrency(order.commission)}</p></div>
                    <div><a href={order.receipt_image} target="_blank" className="text-gold underline"><Eye size={16} /> عرض الإيصال</a></div>
                  </div>
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gold/20">
                    <button onClick={() => reviewReceiptMutation.mutate({ orderId: order.id, approved: true })} className="bg-green-600 px-4 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={16} /> قبول</button>
                    <button onClick={() => { const notes = prompt('سبب الرفض:'); reviewReceiptMutation.mutate({ orderId: order.id, approved: false, notes }); }} className="bg-red-600 px-4 py-1 rounded-lg flex items-center gap-1"><XCircle size={16} /> رفض</button>
                    <button onClick={() => setShowDisputeModal(true)} className="bg-yellow-600 px-4 py-1 rounded-lg flex items-center gap-1"><AlertTriangle size={16} /> نزاع</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Orders Table */}
          {activeSubTab === 'all_orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead><tr><th>#</th><th>المنتج</th><th>المشتري</th><th>المبلغ</th><th>العمولة</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {orders?.map(order => (
                    <tr key={order.id}>
                      <td className="p-2">{order.id}</td>
                      <td>{order.product?.title}</td>
                      <td>{order.buyer?.full_name}</td>
                      <td>{formatCurrency(order.total_price)}</td>
                      <td>{formatCurrency(order.commission)}</td>
                      <td><span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600">{order.status}</span></td>
                      <td className="text-sm">{formatDate(order.created_at)}</td>
                      <td><button className="text-gold underline text-sm" onClick={() => window.open(`/admin/order/${order.id}`)}>تفاصيل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== Finance Tab ========== */}
      {activeMainTab === 'finance' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('wallets')} className="px-4 py-2">محافظ البائعين</button>
            <button onClick={() => setActiveSubTab('withdrawals')} className="px-4 py-2">طلبات السحب</button>
            <button onClick={() => setActiveSubTab('commissions')} className="px-4 py-2">تقرير العمولات</button>
            <button onClick={() => setActiveSubTab('refunds')} className="px-4 py-2">الاستردادات</button>
          </div>

          {/* Wallets */}
          {activeSubTab === 'wallets' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead><tr><th>البائع</th><th>رصيد معلق</th><th>رصيد متاح</th><th>تم سحبه</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {wallets?.map(w => (
                    <tr key={w.seller_id}>
                      <td className="p-2">{w.seller_name}</td>
                      <td>{formatCurrency(w.pending_balance)}</td>
                      <td>{formatCurrency(w.available_balance)}</td>
                      <td>{formatCurrency(w.withdrawn_total)}</td>
                      <td><button className="text-gold underline" onClick={() => window.open(`/admin/seller/${w.seller_id}/transactions`)}>سجل المعاملات</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Withdrawals */}
          {activeSubTab === 'withdrawals' && (
            <div className="space-y-4">
              {withdrawals?.map(req => (
                <div key={req.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex justify-between items-start">
                    <div><p className="font-bold">{req.seller_name}</p><p>المبلغ: {formatCurrency(req.amount)}</p><p>طريقة الدفع: {req.payment_method}</p><p>حساب: {req.account_number}</p><p>تاريخ الطلب: {formatDate(req.created_at)}</p></div>
                    <div className="flex gap-2">
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => processWithdrawalMutation.mutate({ requestId: req.id, approved: true, transactionId: prompt('رقم المعاملة:') })} className="bg-green-600 px-4 py-2 rounded-lg">موافقة</button>
                          <button onClick={() => processWithdrawalMutation.mutate({ requestId: req.id, approved: false })} className="bg-red-600 px-4 py-2 rounded-lg">رفض</button>
                        </>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'completed' ? 'bg-green-600' : req.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}>{req.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Commissions Report */}
          {activeSubTab === 'commissions' && (
            <div>
              <div className="flex gap-4 mb-4">
                <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2" onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2" onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                <Button variant="secondary" onClick={() => refetchCommissions()}>عرض</Button>
                <Button variant="secondary" onClick={() => exportMutation.mutate({ type: 'commissions', format: 'csv', dateRange })}>تصدير CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr><th>البائع</th><th>إجمالي المبيعات</th><th>نسبة العمولة</th><th>عمولة المنصة</th></tr></thead>
                  <tbody>
                    {commissions?.map(c => (
                      <tr key={c.seller_id}>
                        <td className="p-2">{c.seller_name}</td>
                        <td>{formatCurrency(c.total_sales)}</td>
                        <td>{c.commission_rate}%</td>
                        <td>{formatCurrency(c.commission_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== Marketing Tab ========== */}
      {activeMainTab === 'marketing' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('coupons')} className="px-4 py-2">كوبونات خصم</button>
            <button onClick={() => setActiveSubTab('banners')} className="px-4 py-2">بانرات</button>
            <button onClick={() => setActiveSubTab('featured')} className="px-4 py-2">منتجات مميزة</button>
            <button onClick={() => setActiveSubTab('flashsales')} className="px-4 py-2">عروض فلاش</button>
          </div>

          {/* Coupons */}
          {activeSubTab === 'coupons' && (
            <div>
              <div className="flex justify-end mb-4"><Button onClick={() => setShowCouponModal(true)}><Plus size={16} /> كوبون جديد</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons?.map(coupon => (
                  <div key={coupon.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                    <div className="flex justify-between"><span className="font-bold text-gold">{coupon.code}</span><span className={`px-2 py-0.5 rounded-full text-xs ${coupon.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>{coupon.is_active ? 'نشط' : 'غير نشط'}</span></div>
                    <p className="text-sm">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} ريال`} خصم</p>
                    <p className="text-xs text-text-secondary">صالح حتى: {formatDate(coupon.expiry_date)}</p>
                    <div className="flex gap-2 mt-3"><button className="text-gold underline text-sm">تعديل</button><button className="text-red-500 underline text-sm">حذف</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banners */}
          {activeSubTab === 'banners' && (
            <div>
              <div className="flex justify-end mb-4"><Button onClick={() => setShowBannerModal(true)}><Plus size={16} /> بانر جديد</Button></div>
              <div className="space-y-4">
                {banners?.map(banner => (
                  <div key={banner.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30 flex justify-between items-center">
                    <div><img src={banner.image_url} className="h-16 w-auto rounded" alt="banner" /><p className="font-bold">{banner.title}</p><p className="text-sm text-text-secondary">{banner.link}</p></div>
                    <div className="flex gap-2"><button className="text-gold" onClick={() => setShowBannerModal(true)}>تعديل</button><button className="text-red-500">حذف</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured Products */}
          {activeSubTab === 'featured' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredProducts?.map(product => (
                <div key={product.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30 flex justify-between">
                  <div><h3 className="font-bold">{product.name}</h3><p>{product.seller_name}</p></div>
                  <button onClick={() => toggleFeaturedMutation.mutate({ productId: product.id, featured: !product.is_featured })} className={`px-3 py-1 rounded-lg ${product.is_featured ? 'bg-red-600' : 'bg-green-600'}`}>{product.is_featured ? 'إزالة' : 'إضافة مميز'}</button>
                </div>
              ))}
            </div>
          )}

          {/* Flash Sales */}
          {activeSubTab === 'flashsales' && (
            <div>
              <div className="flex justify-end mb-4"><Button onClick={() => setShowFlashSaleModal(true)}><Plus size={16} /> عرض فلاش جديد</Button></div>
              <div className="space-y-4">
                {flashSales?.map(sale => (
                  <div key={sale.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                    <div className="flex justify-between"><span className="font-bold">{sale.title}</span><span className={`px-2 py-0.5 rounded-full text-xs ${sale.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>{sale.is_active ? 'نشط' : 'منتهي'}</span></div>
                    <p className="text-sm">{sale.discount_percentage}% خصم</p>
                    <p className="text-xs text-text-secondary">من {formatDate(sale.start_date)} إلى {formatDate(sale.end_date)}</p>
                    <div className="flex gap-2 mt-2"><button className="text-gold underline">تعديل</button><button className="text-red-500 underline">حذف</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== Support Tab ========== */}
      {activeMainTab === 'support' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('disputes')} className="px-4 py-2">النزاعات</button>
            <button onClick={() => setActiveSubTab('tickets')} className="px-4 py-2">تذاكر الدعم</button>
            <button onClick={() => setActiveSubTab('knowledge')} className="px-4 py-2">قاعدة المعرفة</button>
            <button onClick={() => setActiveSubTab('notifications')} className="px-4 py-2">قوالب الإشعارات</button>
          </div>

          {/* Disputes */}
          {activeSubTab === 'disputes' && (
            <div className="space-y-4">
              {disputes?.map(dispute => (
                <div key={dispute.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex justify-between"><span className="font-bold">نزاع #{dispute.id}</span><span className={`px-2 py-0.5 rounded-full text-xs ${dispute.status === 'open' ? 'bg-yellow-600' : 'bg-green-600'}`}>{dispute.status}</span></div>
                  <p>الطلب #{dispute.order_id} | المشتري: {dispute.buyer_name} | البائع: {dispute.seller_name}</p>
                  <p className="text-sm text-text-secondary mt-1">سبب النزاع: {dispute.reason}</p>
                  {dispute.status === 'open' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => resolveDisputeMutation.mutate({ disputeId: dispute.id, resolution: 'buyer_wins', notes: '' })} className="bg-green-600 px-3 py-1 rounded-lg text-sm">لصالح المشتري</button>
                      <button onClick={() => resolveDisputeMutation.mutate({ disputeId: dispute.id, resolution: 'seller_wins', notes: '' })} className="bg-green-600 px-3 py-1 rounded-lg text-sm">لصالح البائع</button>
                      <button onClick={() => resolveDisputeMutation.mutate({ disputeId: dispute.id, resolution: 'partial_refund', notes: prompt('نسبة الاسترداد:') })} className="bg-yellow-600 px-3 py-1 rounded-lg text-sm">استرداد جزئي</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== Logs Tab ========== */}
      {activeMainTab === 'logs' && (
        <div>
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2" />
              <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2" />
              <Button variant="secondary">بحث</Button>
            </div>
            <Button variant="secondary" onClick={() => exportMutation.mutate({ type: 'audit', format: 'csv', dateRange })}><Download size={16} /> تصدير</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead><tr><th>التاريخ</th><th>الأدمن</th><th>الإجراء</th><th>الهدف</th><th>IP</th><th>التفاصيل</th></tr></thead>
              <tbody>
                {auditLogs?.map(log => (
                  <tr key={log.id}>
                    <td className="p-2 text-sm">{formatDate(log.created_at)}</td>
                    <td>{log.admin?.full_name}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-xs bg-gold/20 text-gold">{log.action}</span></td>
                    <td>{log.target_type} #{log.target_id}</td>
                    <td>{log.ip_address}</td>
                    <td className="text-sm max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== Settings Tab ========== */}
      {activeMainTab === 'settings' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('general')} className="px-4 py-2">عام</button>
            <button onClick={() => setActiveSubTab('roles')} className="px-4 py-2">الصلاحيات</button>
            <button onClick={() => setActiveSubTab('payment')} className="px-4 py-2">الدفع والشحن</button>
            <button onClick={() => setActiveSubTab('backup')} className="px-4 py-2">النسخ الاحتياطي</button>
          </div>

          {/* General Settings */}
          {activeSubTab === 'general' && (
            <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 max-w-2xl">
              <div className="space-y-4">
                <Input label="اسم المنصة" defaultValue={settings?.platform_name} />
                <Input label="العملة" defaultValue={settings?.currency} />
                <Input label="اللغة الافتراضية" defaultValue={settings?.default_language} />
                <Input label="شعار المنصة (URL)" defaultValue={settings?.logo_url} />
                <div className="flex gap-2">
                  <Button onClick={() => setShowSettingsModal(true)}>تعديل الإعدادات</Button>
                  <Button variant="secondary" onClick={() => updateSettingsMutation.mutate({ platform_name: 'سوقنا' })}>حفظ</Button>
                </div>
              </div>
            </div>
          )}

          {/* Roles & Permissions */}
          {activeSubTab === 'roles' && (
            <div>
              <div className="flex justify-end mb-4"><Button><Plus size={16} /> دور جديد</Button></div>
              <div className="space-y-4">
                {roles?.map(role => (
                  <div key={role.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                    <div className="flex justify-between"><span className="font-bold">{role.name}</span><button className="text-gold underline text-sm" onClick={() => updateRoleMutation.mutate({ roleId: role.id, permissions: {} })}>تعديل الصلاحيات</button></div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {role.permissions?.map(perm => <span key={perm} className="bg-secondary-blue px-2 py-0.5 rounded-full text-xs">{perm}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backup */}
          {activeSubTab === 'backup' && (
            <div className="bg-primary-card p-6 rounded-2xl border border-gold/30">
              <p className="mb-4">إنشاء نسخة احتياطية كاملة من قاعدة البيانات والملفات</p>
              <div className="flex gap-4">
                <Button onClick={() => backupMutation.mutate()}><Database size={16} /> إنشاء نسخة احتياطية</Button>
                <Button variant="secondary">استعادة نسخة</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals (simplified) */}
      {showSellerModal && (
        <Modal onClose={() => setShowSellerModal(false)} title="تفاصيل البائع">
          <div>محتوى تفاصيل البائع (سيتم إكماله)</div>
        </Modal>
      )}
    </div>
  )
}

