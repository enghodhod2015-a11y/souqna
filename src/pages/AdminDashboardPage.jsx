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
  Check as CheckIcon, X as XIcon, RefreshCw as RefreshIcon, Loader
} from 'lucide-react'
import toast from 'react-hot-toast'

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-EG')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0)
}

// Mock data for charts (replace with real API data later)
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
  const queryClient = useQueryClient()

  // ========== Queries ==========
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats
  })

  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: () => getUsers({ search: searchTerm }),
    enabled: activeMainTab === 'users'
  })

  const { data: pendingSellers, refetch: refetchPendingSellers } = useQuery({
    queryKey: ['pendingSellers'],
    queryFn: getPendingSellers,
    enabled: activeMainTab === 'users' && activeSubTab === 'pending_sellers'
  })

  const { data: products, refetch: refetchProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts', productFilter],
    queryFn: () => getProductsForAdmin({ status: productFilter === 'pending' ? 'pending' : productFilter === 'hidden' ? 'hidden' : undefined }),
    enabled: activeMainTab === 'products'
  })

  const { data: orders, refetch: refetchOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['adminOrders', dateRange, orderStatusFilter],
    queryFn: () => getOrdersForAdmin(dateRange, orderStatusFilter),
    enabled: activeMainTab === 'orders'
  })

  const { data: wallets, refetch: refetchWallets } = useQuery({
    queryKey: ['sellerWallets'],
    queryFn: getSellerWallet,
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

  const { data: auditLogs, refetch: refetchLogs, isLoading: logsLoading } = useQuery({
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
    },
    onError: (err) => toast.error(err.message)
  })

  const approveProductMutation = useMutation({
    mutationFn: ({ productId, approve, is_hidden, note }) => approveProduct(productId, approve, is_hidden, note),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث حالة المنتج')
    },
    onError: (err) => toast.error(err.message)
  })

  const reviewReceiptMutation = useMutation({
    mutationFn: ({ orderId, approved, notes }) => reviewReceipt(orderId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminOrders'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث الطلب')
    },
    onError: (err) => toast.error(err.message)
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingSellers'])
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('تم تحديث حالة البائع')
    },
    onError: (err) => toast.error(err.message)
  })

  const processWithdrawalMutation = useMutation({
    mutationFn: ({ requestId, approved, transactionId }) => processWithdrawal(requestId, approved, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['withdrawalRequests'])
      queryClient.invalidateQueries(['sellerWallets'])
      toast.success('تم معالجة طلب السحب')
    },
    onError: (err) => toast.error(err.message)
  })

  const resolveDisputeMutation = useMutation({
    mutationFn: ({ disputeId, resolution, notes }) => resolveDispute(disputeId, resolution, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['disputes'])
      toast.success('تم حل النزاع')
    },
    onError: (err) => toast.error(err.message)
  })

  const createCouponMutation = useMutation({
    mutationFn: (couponData) => createCoupon(couponData),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons'])
      toast.success('تم إنشاء الكوبون')
      setShowCouponModal(false)
    },
    onError: (err) => toast.error(err.message)
  })

  const updateBannerMutation = useMutation({
    mutationFn: ({ bannerId, data }) => updateBanner(bannerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['banners'])
      toast.success('تم تحديث البانر')
      setShowBannerModal(false)
    },
    onError: (err) => toast.error(err.message)
  })

  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ productId, featured }) => toggleFeatured(productId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries(['featuredProducts'])
      toast.success('تم تحديث المنتج المميز')
    },
    onError: (err) => toast.error(err.message)
  })

  const createFlashSaleMutation = useMutation({
    mutationFn: (saleData) => createFlashSale(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['flashSales'])
      toast.success('تم إنشاء العرض')
      setShowFlashSaleModal(false)
    },
    onError: (err) => toast.error(err.message)
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settingsData) => updateSettings(settingsData),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      toast.success('تم حفظ الإعدادات')
      setShowSettingsModal(false)
    },
    onError: (err) => toast.error(err.message)
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, permissions }) => updateRole(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      toast.success('تم تحديث الصلاحيات')
    },
    onError: (err) => toast.error(err.message)
  })

  const backupMutation = useMutation({
    mutationFn: () => backupDatabase(),
    onSuccess: () => toast.success('تم إنشاء النسخة الاحتياطية'),
    onError: () => toast.error('فشل إنشاء النسخة الاحتياطية')
  })

  const exportMutation = useMutation({
    mutationFn: ({ type, format, dateRange }) => exportReport(type, format, dateRange),
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${Date.now()}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('تم تصدير التقرير')
    },
    onError: (err) => toast.error(err.message)
  })

  // Helper computed values
  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingReceipts = orders?.filter(o => o.payment_status === 'pending' && o.receipt_image).length || 0
  const pendingSellersCount = pendingSellers?.length || 0
  const openDisputes = disputes?.filter(d => d.status === 'open').length || 0
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0

  // For charts
  const completionRate = stats?.completionRate || 85

  // Loading state
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading) ||
    (activeMainTab === 'orders' && ordersLoading) ||
    (activeMainTab === 'logs' && logsLoading)

  if (isLoading && activeMainTab === 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>
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
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات {pendingProducts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingProducts}</span>}</button>
        <button onClick={() => setActiveMainTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ShoppingBag size={18} /> الطلبات</button>
        <button onClick={() => setActiveMainTab('finance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><DollarSign size={18} /> المالية</button>
        <button onClick={() => setActiveMainTab('marketing')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'marketing' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Megaphone size={18} /> التسويق</button>
        <button onClick={() => setActiveMainTab('support')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'support' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><MessageSquare size={18} /> الدعم</button>
        <button onClick={() => setActiveMainTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ClipboardList size={18} /> السجلات</button>
        <button onClick={() => setActiveMainTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'settings' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Settings size={18} /> الإعدادات</button>
      </div>

      {/* ============================================================ */}
      {/* 1. Dashboard Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'dashboard' && (
        <div>
          {(pendingProducts > 0 || pendingReceipts > 0 || pendingSellersCount > 0 || openDisputes > 0) && (
            <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-4 mb-6 flex flex-wrap gap-4 justify-between items-center">
              <div className="flex gap-4 flex-wrap">
                {pendingProducts > 0 && <span className="flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" /> {pendingProducts} منتج بانتظار الموافقة</span>}
                {pendingReceipts > 0 && <span className="flex items-center gap-2"><Receipt size={18} className="text-yellow-500" /> {pendingReceipts} إيصال بانتظار المراجعة</span>}
                {pendingSellersCount > 0 && <span className="flex items-center gap-2"><UserCheck size={18} className="text-yellow-500" /> {pendingSellersCount} بائع بانتظار التوثيق</span>}
                {openDisputes > 0 && <span className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> {openDisputes} نزاع مفتوح</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveMainTab('products')} className="text-gold underline text-sm">مراجعة المنتجات</button>
                <button onClick={() => { setActiveMainTab('orders'); setActiveSubTab('pending_receipts'); }} className="text-gold underline text-sm">مراجعة الإيصالات</button>
                <button onClick={() => { setActiveMainTab('users'); setActiveSubTab('pending_sellers'); }} className="text-gold underline text-sm">مراجعة البائعين</button>
                <button onClick={() => { setActiveMainTab('support'); setActiveSubTab('disputes'); }} className="text-gold underline text-sm">مراجعة النزاعات</button>
              </div>
            </div>
          )}

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
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LineChartIcon size={20} className="text-gold" /> المبيعات الشهرية (آخر 6 أشهر)</h2>
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
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#D4AF37" strokeWidth="8" strokeDasharray={`${completionRate * 2.827} 283`} transform="rotate(-90 50 50)" />
                    <text x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="20">{completionRate}%</text>
                  </svg>
                </div>
              </div>
              <p className="text-center text-text-secondary">نسبة الطلبات المكتملة مقابل الملغاة</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Users Tab */}
      {/* ============================================================ */}
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
              <div className="flex gap-4 mb-4 flex-wrap">
                <Input placeholder="بحث بالبريد أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 min-w-[200px]" />
                <Select value={buyerActivityFilter} onChange={(e) => setBuyerActivityFilter(e.target.value)} className="w-48">
                  <option value="all">جميع المشترين</option>
                  <option value="active">نشط آخر 30 يوم</option>
                  <option value="inactive">غير نشط > 90 يوم</option>
                </Select>
                <Button variant="secondary" onClick={() => refetchUsers()} className="flex items-center gap-2"><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gold/30 bg-primary-card/50">
                      <th className="p-3">الاسم</th><th className="p-3">البريد</th><th className="p-3">عدد الطلبات</th><th className="p-3">إجمالي الإنفاق</th><th className="p-3">آخر طلب</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.filter(u => u.account_type === 'buyer').filter(u => {
                      if (buyerActivityFilter === 'active') return u.last_order_date && (new Date() - new Date(u.last_order_date)) < 30*24*60*60*1000
                      if (buyerActivityFilter === 'inactive') return !u.last_order_date || (new Date() - new Date(u.last_order_date)) > 90*24*60*60*1000
                      return true
                    }).map(user => (
                      <tr key={user.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                        <td className="p-3">{user.full_name || '-'}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{user.order_count || 0}</td>
                        <td className="p-3">{formatCurrency(user.total_spent || 0)}</td>
                        <td className="p-3 text-sm">{formatDate(user.last_order_date)}</td>
                        <td className="p-3">{user.is_banned ? <span className="text-red-400 flex items-center gap-1"><Ban size={14} /> محظور</span> : <span className="text-green-400">نشط</span>}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white`}>{user.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedBuyer(user); setShowBuyerModal(true); }} className="px-2 py-1 rounded text-xs bg-gold text-primary-blue">تفاصيل</button>
                        </td>
                      </tr>
                    ))}
                    {(!users || users.filter(u => u.account_type === 'buyer').length === 0) && (
                      <tr><td colSpan="7" className="text-center p-8">لا توجد نتائج</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sellers Sub-tab */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="flex gap-4 mb-4 flex-wrap">
                <Input placeholder="بحث باسم المتجر أو البريد..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 min-w-[200px]" />
                <Button variant="secondary" onClick={() => refetchUsers()} className="flex items-center gap-2"><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gold/30 bg-primary-card/50">
                      <th className="p-3">المتجر</th><th className="p-3">البريد</th><th className="p-3">التقييم</th><th className="p-3">نسبة الإتمام</th><th className="p-3">المبيعات</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.filter(u => u.account_type === 'seller').map(user => (
                      <tr key={user.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                        <td className="p-3">{user.store_name || user.full_name}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3"><span className="text-gold">⭐ {user.rating || 0}</span></td>
                        <td className="p-3">{user.completion_rate || 0}%</td>
                        <td className="p-3">{formatCurrency(user.total_sales || 0)}</td>
                        <td className="p-3">{user.is_banned ? 'محظور' : (user.is_verified ? 'موثق' : 'غير موثق')}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white`}>{user.is_banned ? 'رفع الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedSeller(user); setShowSellerModal(true); }} className="px-2 py-1 rounded text-xs bg-gold text-primary-blue">تفاصيل</button>
                          <button className="px-2 py-1 rounded text-xs bg-blue-600 text-white" onClick={() => window.open(`/store/${user.id}`, '_blank')}>عرض المتجر</button>
                          <button className="px-2 py-1 rounded text-xs bg-purple-600 text-white" onClick={() => toast.success('سيتم إرسال إشعار للبائع')}>إرسال إشعار</button>
                        </td>
                      </tr>
                    ))}
                    {(!users || users.filter(u => u.account_type === 'seller').length === 0) && (
                      <tr><td colSpan="7" className="text-center p-8">لا توجد نتائج</td></tr>
                    )}
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

          {/* Seller Details Modal (3 tabs) */}
          {showSellerModal && selectedSeller && (
            <Modal onClose={() => setShowSellerModal(false)} title={`تفاصيل البائع: ${selectedSeller.store_name || selectedSeller.full_name}`} size="lg">
              <Tabs>
                <TabList>
                  <Tab value="profile">الملف</Tab>
                  <Tab value="finance">المالية</Tab>
                  <Tab value="stats">الإحصائيات</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel value="profile">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div><label className="text-gold">اسم المتجر:</label><p>{selectedSeller.store_name || '-'}</p></div>
                      <div><label className="text-gold">الشعار:</label>{selectedSeller.avatar_url && <img src={selectedSeller.avatar_url} className="w-16 h-16 rounded-full" />}</div>
                      <div><label className="text-gold">الوصف:</label><p>{selectedSeller.bio || '-'}</p></div>
                      <div><label className="text-gold">حالة التوثيق:</label><span className={selectedSeller.is_verified ? 'text-green-500' : 'text-yellow-500'}>{selectedSeller.is_verified ? 'موثق' : 'غير موثق'}</span></div>
                      <div><label className="text-gold">البريد الإلكتروني:</label><p>{selectedSeller.email}</p></div>
                      <div><label className="text-gold">رقم الهاتف:</label><p>{selectedSeller.phone || '-'}</p></div>
                      <div><label className="text-gold">العنوان:</label><p>{selectedSeller.address || '-'}</p></div>
                      <div><label className="text-gold">تاريخ التسجيل:</label><p>{formatDate(selectedSeller.created_at)}</p></div>
                    </div>
                  </TabPanel>
                  <TabPanel value="finance">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">رصيد معلق:</label><p className="text-xl">{formatCurrency(selectedSeller.wallet?.pending_balance || 0)}</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">رصيد متاح:</label><p className="text-xl">{formatCurrency(selectedSeller.wallet?.available_balance || 0)}</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">تم سحبه:</label><p className="text-xl">{formatCurrency(selectedSeller.wallet?.withdrawn_total || 0)}</p></div>
                    </div>
                    <div className="mt-4"><label className="text-gold">سجل المعاملات:</label><p className="text-text-secondary">(سيتم عرض المعاملات هنا)</p></div>
                  </TabPanel>
                  <TabPanel value="stats">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">إجمالي المبيعات:</label><p className="text-xl">{formatCurrency(selectedSeller.total_sales || 0)}</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">عدد المنتجات:</label><p className="text-xl">{selectedSeller.products_count || 0}</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">معدل التقييم:</label><p className="text-xl">{selectedSeller.rating || 0} / 5</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">نسبة إتمام الطلبات:</label><p className="text-xl">{selectedSeller.completion_rate || 0}%</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">عدد الطلبات المكتملة:</label><p className="text-xl">{selectedSeller.completed_orders || 0}</p></div>
                      <div className="bg-secondary-blue p-3 rounded"><label className="text-gold">عدد المرتجعات:</label><p className="text-xl">{selectedSeller.return_orders || 0}</p></div>
                    </div>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Modal>
          )}

          {/* Buyer Details Modal */}
          {showBuyerModal && selectedBuyer && (
            <Modal onClose={() => setShowBuyerModal(false)} title={`تفاصيل المشتري: ${selectedBuyer.full_name}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label className="text-gold">الاسم:</label><p>{selectedBuyer.full_name}</p></div>
                <div><label className="text-gold">البريد:</label><p>{selectedBuyer.email}</p></div>
                <div><label className="text-gold">عدد الطلبات الكلي:</label><p>{selectedBuyer.order_count || 0}</p></div>
                <div><label className="text-gold">إجمالي الإنفاق:</label><p>{formatCurrency(selectedBuyer.total_spent || 0)}</p></div>
                <div><label className="text-gold">آخر طلب:</label><p>{formatDate(selectedBuyer.last_order_date)}</p></div>
                <div><label className="text-gold">العناوين المحفوظة:</label><p>{selectedBuyer.addresses || '-'}</p></div>
                <div><label className="text-gold">تاريخ التسجيل:</label><p>{formatDate(selectedBuyer.created_at)}</p></div>
                <div><label className="text-gold">الحالة:</label>{selectedBuyer.is_banned ? 'محظور' : 'نشط'}</div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Products Tab (Full Featured) */}
      {/* ============================================================ */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setProductFilter('all')} className={`px-3 py-1 rounded-lg ${productFilter === 'all' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>جميع المنتجات</button>
            <button onClick={() => setProductFilter('pending')} className={`px-3 py-1 rounded-lg ${productFilter === 'pending' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>بإنتظار الموافقة {pendingProducts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingProducts}</span>}</button>
            <button onClick={() => setProductFilter('approved')} className={`px-3 py-1 rounded-lg ${productFilter === 'approved' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>المنتجات المنشورة</button>
            <button onClick={() => setProductFilter('hidden')} className={`px-3 py-1 rounded-lg ${productFilter === 'hidden' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>المنتجات المخفية</button>
            <button onClick={() => setProductFilter('reported')} className={`px-3 py-1 rounded-lg ${productFilter === 'reported' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>مبلغ عنها</button>
            <button onClick={() => setActiveSubTab('categories')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'categories' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>إدارة الفئات</button>
          </div>

          {/* Bulk Actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Select className="bg-secondary-blue rounded-lg px-3 py-2 text-sm border border-gold/30">
                <option>إجراء جماعي</option>
                <option>نقل إلى فئة</option>
                <option>تغيير الحالة إلى منشور</option>
                <option>تغيير الحالة إلى مخفي</option>
                <option>حذف</option>
              </Select>
              <Button variant="secondary" size="sm">تطبيق</Button>
            </div>
            <Button variant="secondary" onClick={() => refetchProducts()} className="flex items-center gap-2"><RefreshCw size={16} /> تحديث</Button>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gold/30 bg-primary-card/50">
                  <th><input type="checkbox" /></th>
                  <th>المنتج</th>
                  <th>البائع</th>
                  <th>السعر</th>
                  <th>المخزون</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products?.filter(p => {
                  if (productFilter === 'pending') return !p.is_approved;
                  if (productFilter === 'hidden') return p.is_hidden;
                  if (productFilter === 'approved') return p.is_approved && !p.is_hidden;
                  if (productFilter === 'reported') return p.is_reported;
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
                      {product.is_reported && <span className="bg-orange-600 px-2 py-0.5 rounded-full text-xs">مبلغ عنه</span>}
                    </td>
                    <td className="p-2 flex gap-2">
                      {!product.is_approved && (
                        <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: true })} className="bg-green-600 p-1 rounded" title="موافقة"><CheckCircle size={16} /></button>
                      )}
                      <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: false, is_hidden: !product.is_hidden })} className={`${product.is_hidden ? 'bg-blue-600' : 'bg-red-600'} p-1 rounded`} title={product.is_hidden ? 'إظهار' : 'إخفاء'}><Eye size={16} /></button>
                      <button className="bg-gold text-primary-blue p-1 rounded" title="تعديل"><Edit size={16} /></button>
                      {!product.is_approved && (
                        <button onClick={() => { const note = prompt('سبب الرفض:'); if (note) approveProductMutation.mutate({ productId: product.id, approve: false, is_hidden: true, note }); }} className="bg-red-600 p-1 rounded" title="رفض"><XCircle size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!products || products.length === 0) && <tr><td colSpan="7" className="text-center p-8">لا توجد منتجات</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Categories Management (simple) */}
          {activeSubTab === 'categories' && (
            <div className="mt-6 bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h3 className="text-xl font-bold mb-4">إدارة الفئات والسمات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Input placeholder="اسم الفئة الجديدة" /><Button className="mt-2">إضافة فئة</Button></div>
                <div><Input placeholder="السمة (لون/مقاس)" /><Button className="mt-2">إضافة سمة</Button></div>
              </div>
              <div className="mt-4">
                <p className="text-text-secondary">قائمة الفئات الحالية: إلكترونيات، أزياء، منزل، جمال، سيارات...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. Orders Tab (Full Featured) */}
      {/* ============================================================ */}
      {activeMainTab === 'orders' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setActiveSubTab('pending_receipts')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'pending_receipts' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>إيصالات معلقة {pendingReceipts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingReceipts}</span>}</button>
            <button onClick={() => setActiveSubTab('refund_requests')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'refund_requests' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>طلبات استرداد</button>
            <button onClick={() => setActiveSubTab('all_orders')} className={`px-3 py-1 rounded-lg ${activeSubTab === 'all_orders' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>جميع الطلبات</button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30" onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            <input type="date" className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30" onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
            <Select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30" onChange={e => setOrderStatusFilter(e.target.value)}>
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="processing">قيد التجهيز</option>
              <option value="shipped">تم الشحن</option>
              <option value="delivered">تم التسليم</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </Select>
            <Select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30"><option>كل البائعين</option></Select>
            <Select className="bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30"><option>كل المدن</option></Select>
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
                    <button onClick={() => reviewReceiptMutation.mutate({ orderId: order.id, approved: true })} className="bg-green-600 px-4 py-1 rounded-lg"><CheckCircle size={16} /> قبول</button>
                    <button onClick={() => { const notes = prompt('سبب الرفض:'); reviewReceiptMutation.mutate({ orderId: order.id, approved: false, notes }); }} className="bg-red-600 px-4 py-1 rounded-lg"><XCircle size={16} /> رفض</button>
                    <button onClick={() => setShowDisputeModal(true)} className="bg-yellow-600 px-4 py-1 rounded-lg"><AlertTriangle size={16} /> نزاع</button>
                  </div>
                </div>
              ))}
              {(!orders || orders.filter(o => o.payment_status === 'pending' && o.receipt_image).length === 0) && <div className="text-center p-8">لا توجد إيصالات معلقة</div>}
            </div>
          )}

          {/* Refund Requests */}
          {activeSubTab === 'refund_requests' && (
            <div className="space-y-4">
              {orders?.filter(o => o.return_status === 'requested' || o.return_status === 'approved').map(order => (
                <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex justify-between"><span className="font-bold">طلب استرداد #{order.id}</span><span className={`px-2 py-0.5 rounded-full text-xs ${order.return_status === 'requested' ? 'bg-yellow-600' : 'bg-blue-600'}`}>{order.return_status === 'requested' ? 'قيد المراجعة' : 'تمت الموافقة'}</span></div>
                  <p>المنتج: {order.product?.title}</p><p>المبلغ: {formatCurrency(order.total_price)}</p><p>سبب الاسترداد: {order.return_reason || '-'}</p>
                  {order.return_status === 'requested' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => approveReturnMutation.mutate({ orderId: order.id, approve: true })} className="bg-green-600 px-3 py-1 rounded">موافقة</button>
                      <button onClick={() => approveReturnMutation.mutate({ orderId: order.id, approve: false })} className="bg-red-600 px-3 py-1 rounded">رفض</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All Orders Table */}
          {activeSubTab === 'all_orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr><th>#</th><th>المنتج</th><th>المشتري</th><th>المبلغ</th><th>العمولة</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr>
                </thead>
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
                      <td><button className="text-gold underline" onClick={() => window.open(`/admin/order/${order.id}`, '_blank')}>تفاصيل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Finance Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'finance' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('wallets')}>محافظ البائعين</button>
            <button onClick={() => setActiveSubTab('withdrawals')}>طلبات السحب</button>
            <button onClick={() => setActiveSubTab('commissions')}>تقرير العمولات</button>
            <button onClick={() => setActiveSubTab('refunds')}>الاستردادات</button>
          </div>
          {activeSubTab === 'wallets' && <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>البائع</th><th>رصيد معلق</th><th>رصيد متاح</th><th>تم سحبه</th><th>إجراءات</th></tr></thead><tbody>{wallets?.map(w => <tr key={w.seller_id}><td>{w.seller_name}</td><td>{formatCurrency(w.pending_balance)}</td><td>{formatCurrency(w.available_balance)}</td><td>{formatCurrency(w.withdrawn_total)}</td><td><button className="text-gold underline">سجل المعاملات</button></td></tr>)}</tbody></table></div>}
          {activeSubTab === 'withdrawals' && <div className="space-y-4">{withdrawals?.map(req => <div key={req.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30"><div className="flex justify-between"><span className="font-bold">{req.seller_name}</span><span className={req.status === 'pending' ? 'text-yellow-500' : req.status === 'completed' ? 'text-green-500' : 'text-red-500'}>{req.status}</span></div><p>المبلغ: {formatCurrency(req.amount)} | طريقة الدفع: {req.payment_method} | الحساب: {req.account_number}</p>{req.status === 'pending' && <div className="flex gap-2 mt-2"><button onClick={() => processWithdrawalMutation.mutate({ requestId: req.id, approved: true, transactionId: prompt('رقم المعاملة:') })} className="bg-green-600 px-3 py-1 rounded">موافقة</button><button onClick={() => processWithdrawalMutation.mutate({ requestId: req.id, approved: false })} className="bg-red-600 px-3 py-1 rounded">رفض</button></div>}</div>)}</div>}
          {activeSubTab === 'commissions' && <div><div className="flex gap-4 mb-4"><input type="date" onChange={e => setDateRange({...dateRange, start: e.target.value})} /><input type="date" onChange={e => setDateRange({...dateRange, end: e.target.value})} /><Button onClick={() => refetchCommissions()}>عرض</Button><Button onClick={() => exportMutation.mutate({ type: 'commissions', format: 'csv', dateRange })}>تصدير CSV</Button></div><table className="w-full"><thead><tr><th>البائع</th><th>إجمالي المبيعات</th><th>نسبة العمولة</th><th>عمولة المنصة</th></tr></thead><tbody>{commissions?.map(c => <tr key={c.seller_id}><td>{c.seller_name}</td><td>{formatCurrency(c.total_sales)}</td><td>{c.commission_rate}%</td><td>{formatCurrency(c.commission_amount)}</td></tr>)}</tbody></table></div>}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. Marketing Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'marketing' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('coupons')}>كوبونات خصم</button>
            <button onClick={() => setActiveSubTab('banners')}>بانرات</button>
            <button onClick={() => setActiveSubTab('featured')}>منتجات مميزة</button>
            <button onClick={() => setActiveSubTab('flashsales')}>عروض فلاش</button>
          </div>
          {activeSubTab === 'coupons' && <div><Button onClick={() => setShowCouponModal(true)}><Plus size={16} /> كوبون جديد</Button><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">{coupons?.map(c => <div key={c.id} className="bg-primary-card p-3 rounded border border-gold/30"><span className="font-bold">{c.code}</span><p>{c.discount_value}% خصم</p><p className="text-xs">صالح حتى {formatDate(c.expiry_date)}</p></div>)}</div></div>}
          {activeSubTab === 'banners' && <div><Button onClick={() => setShowBannerModal(true)}>بانر جديد</Button><div className="space-y-2">{banners?.map(b => <div key={b.id} className="flex justify-between items-center p-2 bg-primary-card rounded"><img src={b.image_url} className="h-12" /><span>{b.title}</span><button className="text-gold">تعديل</button></div>)}</div></div>}
          {activeSubTab === 'featured' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{featuredProducts?.map(p => <div key={p.id} className="flex justify-between items-center p-2 bg-primary-card rounded"><span>{p.name}</span><button onClick={() => toggleFeaturedMutation.mutate({ productId: p.id, featured: !p.is_featured })} className={p.is_featured ? 'bg-red-600 px-2 py-1 rounded' : 'bg-green-600 px-2 py-1 rounded'}>{p.is_featured ? 'إزالة' : 'إضافة مميز'}</button></div>)}</div>}
          {activeSubTab === 'flashsales' && <div><Button onClick={() => setShowFlashSaleModal(true)}>عرض فلاش جديد</Button><div className="space-y-2">{flashSales?.map(s => <div key={s.id} className="bg-primary-card p-3 rounded"><span className="font-bold">{s.title}</span><p>{s.discount_percentage}% خصم من {formatDate(s.start_date)} إلى {formatDate(s.end_date)}</p></div>)}</div></div>}
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. Support Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'support' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('disputes')}>النزاعات</button>
            <button onClick={() => setActiveSubTab('tickets')}>تذاكر الدعم</button>
            <button onClick={() => setActiveSubTab('knowledge')}>قاعدة المعرفة</button>
          </div>
          {activeSubTab === 'disputes' && <div className="space-y-4">{disputes?.map(d => <div key={d.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30"><div className="flex justify-between"><span className="font-bold">نزاع #{d.id}</span><span className={d.status === 'open' ? 'text-yellow-500' : 'text-green-500'}>{d.status}</span></div><p>الطلب #{d.order_id} | المشتري: {d.buyer_name} | البائع: {d.seller_name}</p><p>السبب: {d.reason}</p>{d.status === 'open' && <div className="flex gap-2 mt-2"><button onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: 'buyer_wins' })} className="bg-green-600 px-3 py-1 rounded">لصالح المشتري</button><button onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: 'seller_wins' })} className="bg-blue-600 px-3 py-1 rounded">لصالح البائع</button><button onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: 'partial_refund', notes: prompt('نسبة الاسترداد:') })} className="bg-yellow-600 px-3 py-1 rounded">استرداد جزئي</button></div>}</div>)}</div>}
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. Logs Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'logs' && (
        <div>
          <div className="flex justify-between mb-4"><div className="flex gap-2"><input type="date" /><input type="date" /><Button>بحث</Button></div><Button onClick={() => exportMutation.mutate({ type: 'audit', format: 'csv', dateRange })}><Download size={16} /> تصدير</Button></div>
          <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>التاريخ</th><th>الأدمن</th><th>الإجراء</th><th>الهدف</th><th>IP</th><th>التفاصيل</th></tr></thead><tbody>{auditLogs?.map(log => <tr key={log.id}><td className="p-2 text-sm">{formatDate(log.created_at)}</td><td>{log.admin?.full_name}</td><td><span className="bg-gold/20 text-gold px-2 py-0.5 rounded-full text-xs">{log.action}</span></td><td>{log.target_type} #{log.target_id}</td><td>{log.ip_address}</td><td className="max-w-md truncate">{log.details}</td></tr>)}</tbody></table></div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. Settings Tab */}
      {/* ============================================================ */}
      {activeMainTab === 'settings' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4"><button onClick={() => setActiveSubTab('general')}>عام</button><button onClick={() => setActiveSubTab('roles')}>الصلاحيات</button><button onClick={() => setActiveSubTab('payment')}>الدفع والشحن</button><button onClick={() => setActiveSubTab('backup')}>النسخ الاحتياطي</button></div>
          {activeSubTab === 'general' && <div className="bg-primary-card p-6 rounded-2xl max-w-2xl"><Input label="اسم المنصة" defaultValue={settings?.platform_name} /><Input label="العملة" defaultValue={settings?.currency} /><Input label="اللغة الافتراضية" defaultValue={settings?.default_language} /><Input label="شعار المنصة (URL)" defaultValue={settings?.logo_url} /><Button onClick={() => updateSettingsMutation.mutate({ platform_name: 'سوقنا' })}>حفظ</Button></div>}
          {activeSubTab === 'roles' && <div>{roles?.map(r => <div key={r.id} className="bg-primary-card p-3 rounded mb-2"><div className="flex justify-between"><span className="font-bold">{r.name}</span><button className="text-gold underline">تعديل الصلاحيات</button></div></div>)}</div>}
          {activeSubTab === 'backup' && <div className="bg-primary-card p-6 rounded-2xl"><Button onClick={() => backupMutation.mutate()}><Database size={16} /> إنشاء نسخة احتياطية</Button></div>}
        </div>
      )}

      {/* Modals simplifiés */}
      {showCouponModal && <Modal onClose={() => setShowCouponModal(false)} title="إنشاء كوبون"><Input placeholder="رمز الكوبون" /><Input placeholder="قيمة الخصم" type="number" /><Input placeholder="تاريخ الانتهاء" type="date" /><Button onClick={() => createCouponMutation.mutate({ code: 'TEST', discount_value: 10, expiry_date: new Date() })}>حفظ</Button></Modal>}
      {showBannerModal && <Modal onClose={() => setShowBannerModal(false)} title="بانر جديد"><Input placeholder="رابط الصورة" /><Input placeholder="عنوان البانر" /><Input placeholder="رابط الوجهة" /><Button>حفظ</Button></Modal>}
      {showFlashSaleModal && <Modal onClose={() => setShowFlashSaleModal(false)} title="عرض فلاش"><Input placeholder="العنوان" /><Input placeholder="نسبة الخصم" type="number" /><Input placeholder="تاريخ البدء" type="date" /><Input placeholder="تاريخ الانتهاء" type="date" /><Button>حفظ</Button></Modal>}
    </div>
  )
}


