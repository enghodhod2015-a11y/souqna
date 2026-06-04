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
  Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye, Search,
  AlertTriangle, UserCheck, UserX, Clock, TrendingUp, Activity, RefreshCw,
  Wallet, Download, Plus, Ban, FileText, ClipboardList, Settings, Megaphone, MessageSquare,
  Award, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Edit, Loader
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

// تعريف الدوال المفقودة محلياً (لتجنب أخطاء الاستيراد)
const getSellerReceipts = async () => []
const addSellerReceipt = async () => {}
const getSellerFinanceSummary = async () => null
const getSellerProductsStats = async () => ({ published: 0 })
const getSellerOrdersStats = async () => ({ shipping: 0, sold: 0, returned: 0, no_receipt: 0 })
const getSellerInquiriesStats = async () => ({ unanswered: 0, answered: 0 })

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

  // ---------- Queries ----------
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

  const { data: auditLogs, refetch: refetchLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
    enabled: activeMainTab === 'logs'
  })

  // Mutations
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
    mutationFn: ({ productId, approve, is_hidden }) => approveProduct(productId, approve, is_hidden),
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
  const openDisputes = 0
  const pendingWithdrawals = 0

  // Mock product stats for details view
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

  // Mock product list for tables (replace with real data later)
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

  // Helper to render product list table - CORRECTED
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
              <th>اسم المنتج</th>
              <th>البائع</th>
              <th>السعر</th>
              <th>تاريخ النشر</th>
              <th>تاريخ الطلب</th>
              <th>تاريخ الشحن</th>
              <th>تاريخ الإيصال</th>
              <th>الحالة</th>
            </table>
          </thead>
          <tbody>
            {filtered.map((p) => (
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

      {/* Dashboard Tab (unchanged) */}
      {activeMainTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><ShoppingBag className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">طلبات جديدة</p><p className="text-2xl font-bold">{stats?.newOrders || 0}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingProducts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><AlertTriangle className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">نزاعات مفتوحة</p><p className="text-2xl font-bold">{openDisputes}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Wallet className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">سحوبات معلقة</p><p className="text-2xl font-bold">{pendingWithdrawals}</p></div>
          </div>
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

      {/* Users Tab */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام {pendingSellersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellersCount}</span>}</button>
          </div>

          {/* Sellers sub-tab */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select value={selectedSeller?.id || ''} onChange={(e) => { const seller = sellerUsers.find(u => u.id === e.target.value); setSelectedSeller(seller); setShowSellerModal(true); }} className="w-full md:w-1/2 bg-white text-gray-900 border border-gold/30 rounded-lg focus:outline-none focus:border-gold">
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(seller => <option key={seller.id} value={seller.id}>{seller.store_name || seller.full_name} ({seller.email})</option>)}
                </Select>
              </div>
              {showSellerModal && selectedSeller && (
                <Modal onClose={() => setShowSellerModal(false)} title={`تفاصيل البائع: ${selectedSeller.store_name || selectedSeller.full_name}`} size="lg">
                  <Tabs>
                    <TabList><Tab value="profile">الملف الشخصي</Tab><Tab value="finance">المالية</Tab><Tab value="stats">المتابعة والتقييم</Tab></TabList>
                    <TabPanels>
                      <TabPanel value="profile">
                        <div className="overflow-x-auto"><table className="w-full"><tbody>
                          <tr><td className="p-2 font-bold text-gold">الاسم</td><td>{selectedSeller.full_name || '-'}</td><td className="p-2 font-bold text-gold">البريد</td><td>{selectedSeller.email}</td></tr>
                          <tr><td className="p-2 font-bold text-gold">نوع الحساب</td><td>{selectedSeller.account_type === 'seller' ? 'بائع' : (selectedSeller.account_type === 'buyer' ? 'مشتري' : 'أدمن')}</td><td className="p-2 font-bold text-gold">الحالة</td><td>{selectedSeller.is_banned ? 'محظور' : 'نشط'}</td></tr>
                          <tr><td className="p-2 font-bold text-gold">تاريخ التسجيل</td><td>{formatDate(selectedSeller.created_at)}</td><td className="p-2 font-bold text-gold">رقم الحساب البنكي</td><td>{selectedSeller.bank_account || '-'}</td></tr>
                          <tr><td className="p-2 font-bold text-gold">نوع الحساب البنكي</td><td>{selectedSeller.bank_type || '-'}</td><td className="p-2 font-bold text-gold">التواصل (الهاتف)</td><td>{selectedSeller.phone || '-'}</td></tr>
                        </tbody></table></div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => updateUserMutation.mutate({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })} className={`px-3 py-1 rounded text-white ${selectedSeller.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{selectedSeller.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                          <button onClick={() => window.open(`/store/${selectedSeller.id}`, '_blank')} className="bg-blue-600 px-3 py-1 rounded text-white">عرض المتجر</button>
                          <button onClick={() => updateUserMutation.mutate({ userId: selectedSeller.id, updates: { account_type: selectedSeller.account_type === 'seller' ? 'buyer' : 'seller' } })} className="bg-gold text-primary-blue px-3 py-1 rounded">تغيير نوع الحساب</button>
                          <button onClick={() => toast.success('تم إرسال الإشعار للبائع')} className="bg-purple-600 px-3 py-1 rounded text-white">إرسال إشعار</button>
                        </div>
                      </TabPanel>
                      <TabPanel value="finance">
                        <div className="bg-secondary-blue/30 p-4 rounded-xl mb-4"><label className="block text-gold mb-2">إضافة إيصال تحويل (المبلغ المرسل للبائع)</label><div className="flex gap-2"><input type="number" placeholder="المبلغ" className="bg-white rounded-lg px-3 py-2 text-gray-900" /><Button>إدخال</Button><Button variant="secondary">عرض جميع الإيصالات</Button></div></div>
                        <div><p className="text-text-secondary">سيتم عرض الإيصالات هنا لاحقاً</p></div>
                      </TabPanel>
                      <TabPanel value="stats">
                        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>القسم</th><th>التفاصيل</th><th>طلب البيانات</th></tr></thead><tbody>
                          <tr><td className="p-2">المنتجات المنشورة</td><td>{productStats.all}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('all'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المباعة</td><td>{productStats.sold}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('sold'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات قيد الشحن</td><td>{productStats.shipping}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('shipping'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات لم تشحن (تم رفع الإيصال)</td><td>{productStats.not_shipped_receipt_uploaded}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('not_shipped'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المشتراة بدون إيصال</td><td>{productStats.no_receipt_purchased}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('no_receipt'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات غير المشتراة</td><td>{productStats.not_purchased}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('not_purchased'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المكررة</td><td>{productStats.duplicate}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('duplicate'); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات غير اللائقة</td><td>{productStats.inappropriate}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('inappropriate'); }}>عرض</button></td></tr>
                        </tbody></table></div>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Modal>
              )}
            </div>
          )}

          {/* Buyers sub-tab - CORRECTED */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث بالبريد أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-white text-gray-900 border border-gold/30 rounded-lg focus:outline-none focus:border-gold" />
                <Select value={buyerActivityFilter} onChange={(e) => setBuyerActivityFilter(e.target.value)} className="w-48 bg-white text-gray-900 border border-gold/30 rounded-lg focus:outline-none focus:border-gold">
                  <option value="all">جميع المشترين</option>
                  <option value="active">نشط آخر 30 يوم</option>
                  <option value="inactive">غير نشط &gt; 90 يوم</option>
                </Select>
                <Button variant="secondary" onClick={() => refetchUsers()} className="flex items-center gap-2"><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gold/30 bg-primary-card/50">
                      <th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th><th>الحالة</th><th>إجراءات</th>
                    </tr>
                  </thead>
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
                    {(!users || users.filter(u => u.account_type === 'buyer').length === 0) && (
                      <tr>
                        <td colSpan="7" className="text-center p-8">لا توجد نتائج</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending sellers sub-tab */}
          {activeSubTab === 'pending_sellers' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div><h3 className="font-bold">{s.full_name}</h3><p>{s.email} | {s.phone}</p><p>طلب انضمام: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2"><button onClick={() => approveSellerMutation.mutate({ sellerId: s.id, approved: true })} className="bg-green-600 px-4 py-2 rounded">قبول</button><button onClick={() => { const notes = prompt('سبب الرفض:'); if (notes) approveSellerMutation.mutate({ sellerId: s.id, approved: false, notes }); }} className="bg-red-600 px-4 py-2 rounded">رفض</button></div>
                </div>
              ))}
              {(!pendingSellers || pendingSellers.length === 0) && <div className="text-center p-8 text-text-secondary">لا توجد طلبات انضمام معلقة</div>}
            </div>
          )}

          {/* Buyer details modal */}
          {showBuyerModal && selectedBuyer && (
            <Modal onClose={() => setShowBuyerModal(false)} title={`تفاصيل المشتري: ${selectedBuyer.full_name}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label className="text-gold">الاسم:</label><p>{selectedBuyer.full_name}</p></div>
                <div><label className="text-gold">البريد:</label><p>{selectedBuyer.email}</p></div>
                <div><label className="text-gold">عدد الطلبات الكلي:</label><p>{selectedBuyer.order_count}</p></div>
                <div><label className="text-gold">إجمالي الإنفاق:</label><p>{formatCurrency(selectedBuyer.total_spent)}</p></div>
                <div><label className="text-gold">آخر طلب:</label><p>{formatDate(selectedBuyer.last_order_date)}</p></div>
                <div><label className="text-gold">العناوين المحفوظة:</label><p>{selectedBuyer.addresses || '-'}</p></div>
              </div>
              <button onClick={() => updateUserMutation.mutate({ userId: selectedBuyer.id, updates: { is_banned: !selectedBuyer.is_banned } })} className={`mt-4 px-3 py-1 rounded text-white ${selectedBuyer.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{selectedBuyer.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
            </Modal>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
            <button onClick={() => setProductsView('details')} className={`px-4 py-2 rounded-lg transition ${productsView === 'details' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>تفاصيل المنتجات</button>
            <button onClick={() => setProductsView('all')} className={`px-4 py-2 rounded-lg transition ${productsView === 'all' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>جميع المنتجات</button>
            <button onClick={() => setProductsView('sold')} className={`px-4 py-2 rounded-lg transition ${productsView === 'sold' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المباعة</button>
            <button onClick={() => setProductsView('shipping')} className={`px-4 py-2 rounded-lg transition ${productsView === 'shipping' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات قيد الشحن</button>
            <button onClick={() => setProductsView('not_shipped')} className={`px-4 py-2 rounded-lg transition ${productsView === 'not_shipped' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات التي لم تشحن (تم رفع الإيصال)</button>
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
          {productsView === 'duplicate' && <div className="text-center p-8 text-text-secondary">قريباً: عرض المنتجات المكررة</div>}
          {productsView === 'inappropriate' && <div className="text-center p-8 text-text-secondary">قريباً: عرض المنتجات غير اللائقة</div>}
        </div>
      )}

      {/* Placeholders for other tabs */}
      {(activeMainTab === 'orders' || activeMainTab === 'finance' || activeMainTab === 'marketing' || activeMainTab === 'support' || activeMainTab === 'logs' || activeMainTab === 'settings') && (
        <div className="text-center py-20 text-text-secondary">يتم تطوير هذا القسم ...</div>
      )}
    </div>
  )
}


