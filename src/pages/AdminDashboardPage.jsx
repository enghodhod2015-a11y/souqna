import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct,
  getOrdersForAdmin, reviewReceipt, getAuditLogs, getPendingSellers,
  approveSeller, getSellerWallet, getWithdrawalRequests, processWithdrawal,
  getPlatformCommissions, getDisputes, resolveDispute, getCoupons, createCoupon,
  getBanners, updateBanner, getFeaturedProducts, toggleFeatured,
  getFlashSales, createFlashSale, getSettings, updateSettings,
  getRoles, updateRole, backupDatabase, exportReport,
  getSellerReceipts, addSellerReceipt
} from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Search,
  AlertTriangle, TrendingUp, Activity, RefreshCw,
  Wallet, Send, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Loader
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

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

const mockTopCategories = [
  { name: 'الإلكترونيات', sales: 45200 },
  { name: 'الأزياء', sales: 38700 },
  { name: 'المنزل', sales: 29300 },
  { name: 'الجمال', sales: 18700 },
  { name: 'السيارات', sales: 12400 },
]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [activeMainTab, setActiveMainTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sellerDetailTab, setSellerDetailTab] = useState('profile')
  const [buyerDetailTab, setBuyerDetailTab] = useState('profile')
  const [sellerStats, setSellerStats] = useState({
    totalProducts: 0, soldProducts: 0, shippingProducts: 0,
    notShippedWithReceipt: 0, noReceiptPurchased: 0, notPurchased: 0,
    duplicateProducts: 0, inappropriateProducts: 0,
    unansweredInquiries: 0, answeredInquiries: 0
  })
  const [sellerFilterId, setSellerFilterId] = useState(null)
  const [sellerFinance, setSellerFinance] = useState({ totalSales: 0, totalReceived: 0, remaining: 0 })

  // الحالات المضافة
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [sellerReceiptsList, setSellerReceiptsList] = useState([]);

  const queryClient = useQueryClient()

  // جلب إحصائيات البائع المحدد
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchSellerStats = async () => {
      try {
        const sellerId = selectedSeller.id
        const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

        const { data: soldData } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order.status', 'completed')
        .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const soldProducts = soldData?.length || 0

        const { data: shippingData } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order.status', 'shipped')
        .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const shippingProducts = shippingData?.length || 0

        const { data: notShippedData } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order.status', 'payment_approved')
        .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const notShippedWithReceipt = notShippedData?.length || 0

        const { data: noReceiptData } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order.status', 'pending_payment_review')
        .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const noReceiptPurchased = noReceiptData?.length || 0

        const { data: allProducts } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId)
        const productIds = allProducts?.map(p => p.id) || []
        const { data: orderedProductIds } = await supabase
        .from('order_items')
        .select('product_id')
        .in('product_id', productIds)
        const orderedSet = new Set(orderedProductIds?.map(o => o.product_id))
        const notPurchased = productIds.filter(id =>!orderedSet.has(id)).length

        setSellerStats({
          totalProducts: totalProducts || 0,
          soldProducts, shippingProducts, notShippedWithReceipt,
          noReceiptPurchased, notPurchased, duplicateProducts: 0,
          inappropriateProducts: 0, unansweredInquiries: 0, answeredInquiries: 0
        })
      } catch (err) {
        console.error(err)
        toast.error('فشل تحميل إحصائيات البائع')
      }
    }
    fetchSellerStats()
  }, [selectedSeller])

  // جلب ملخص مالي للبائع المحدد
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchFinanceSummary = async () => {
      try {
        const { data: allProducts } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', selectedSeller.id)
        const productIds = allProducts?.map(p => p.id) || []
        let totalSales = 0
        if (productIds.length > 0) {
          const { data: sales } = await supabase
          .from('order_items')
          .select('unit_price, quantity')
          .eq('order.status', 'completed')
          .in('product_id', productIds)
          totalSales = sales?.reduce((s, i) => s + (i.unit_price * i.quantity), 0) || 0
        }
        const { data: transfers } = await supabase
        .from('seller_transfers')
        .select('amount')
        .eq('seller_id', selectedSeller.id)
        const totalReceived = transfers?.reduce((s, t) => s + t.amount, 0) || 0
        setSellerFinance({ totalSales, totalReceived, remaining: totalSales - totalReceived })
      } catch (err) {
        console.error(err)
      }
    }
    fetchFinanceSummary()
  }, [selectedSeller])

  // Queries
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
    queryKey: ['adminProducts', sellerFilterId],
    queryFn: () => getProductsForAdmin({ seller_id: sellerFilterId }),
    enabled: activeMainTab === 'products'
  })

  const refreshAllData = async () => {
    await Promise.all([refetchStats(), refetchUsers(), refetchPendingSellers(), refetchProducts()])
    toast.success('تم تحديث جميع البيانات')
  }

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => { queryClient.invalidateQueries(['adminUsers']); toast.success('تم تحديث المستخدم') },
    onError: (err) => toast.error(err.message)
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => { queryClient.invalidateQueries(['pendingSellers']); toast.success('تم تحديث حالة البائع') }
  })

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, title, message }) => {
      const { data: { user: adminUser } = await supabase.auth.getUser()
      const adminId = adminUser.id
      let conversationId = null
      const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(buyer_id.eq.${adminId},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${adminId})`)
      .maybeSingle()
      if (existingConv) conversationId = existingConv.id
      else {
        const { data: newConv, error } = await supabase.from('conversations').insert({
          buyer_id: adminId, seller_id: userId, product_id: null,
          created_at: new Date().toISOString(), last_message: message, last_message_at: new Date().toISOString()
        }).select().single()
        if (error) throw error
        conversationId = newConv.id
      }
      await supabase.from('notifications').insert({
        user_id: userId, type: 'info', title, message,
        related_id: conversationId.toString(), is_read: false, created_at: new Date().toISOString()
      })
      await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: adminId, receiver_id: userId,
        message, created_at: new Date().toISOString(), is_read: false
      })
    },
    onSuccess: () => toast.success('تم إرسال الإشعار وفتح محادثة مع الإدارة')
  })

  // دالة تحميل الإيصالات وفتح المودال
  const loadSellerReceipts = async () => {
    if (!selectedSeller) return;
    try {
      const data = await getSellerReceipts(selectedSeller.id);
      setSellerReceiptsList(data);
      setShowReceiptsModal(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ================== التعديل الأساسي: رفع الصورة وإدراج التحويل ==================
  const handleAddTransfer = async () => {
    if (!selectedSeller) {
      toast.error('اختر بائعاً أولاً')
      return
    }
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('أدخل مبلغاً صحيحاً')
      return
    }
    if (!receiptFile) {
      toast.error('يرجى اختيار صورة الإيصال')
      return
    }

    setUploading(true)
    try {
      // 1. رفع الصورة إلى Supabase Storage
      const fileName = `seller_transfers/${selectedSeller.id}/${Date.now()}_${receiptFile.name}`
      const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

      // 2. إدراج السجل عبر الدالة
      await addSellerReceipt(selectedSeller.id, parseFloat(transferAmount), publicUrl, transferNote || '')

      toast.success('تم تسجيل التحويل بنجاح')
      setTransferAmount('')
      setTransferNote('')
      setReceiptFile(null)
      document.getElementById('receiptFileInput').value = ''

      // تحديث الملخص المالي
      const { data: transfers } = await supabase
      .from('seller_transfers')
      .select('amount')
      .eq('seller_id', selectedSeller.id)
      const totalReceived = transfers?.reduce((s, t) => s + t.amount, 0) || 0
      setSellerFinance(prev => ({...prev, totalReceived, remaining: prev.totalSales - totalReceived }))
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'فشل إضافة التحويل')
    } finally {
      setUploading(false)
    }
  }
  // =====================================================================

  const pendingProducts = products?.filter(p =>!p.is_approved).length || 0
  const pendingSellersCount = pendingSellers?.length || 0
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading)

  if (isLoading && activeMainTab === 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || []
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button variant="secondary" onClick={refreshAllData} className="flex items-center gap-2">
          <RefreshCw size={16} /> تحديث الكل
        </Button>
      </div>

      {/* Tabs الرئيسية */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveMainTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'dashboard'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><BarChart3 size={18} /> لوحة المعلومات</button>
        <button onClick={() => setActiveMainTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'users'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'products'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات</button>
      </div>

      {/* Dashboard Tab */}
      {activeMainTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingProducts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Wallet className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">سحوبات معلقة</p><p className="text-2xl font-bold">0</p></div>
          </div>
          <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><h2 className="text-xl font-bold mb-4"><LineChartIcon className="inline ml-2 text-gold" /> المبيعات الشهرية</h2><ResponsiveContainer width="100%" height={300}><LineChart data={mockMonthlySales}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#ddd" /><YAxis stroke="#ddd" /><Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} /><Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </div>
      )}

      {/* ========== المستخدمين ========== */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers'? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers'? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers'? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام {pendingSellersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellersCount}</span>}</button>
          </div>

          {/* البائعين */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select value={selectedSeller?.id || ''} onChange={(e) => { const seller = sellerUsers.find(u => u.id === e.target.value); setSelectedSeller(seller); setSellerDetailTab('profile'); setSellerFilterId(null); }} className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30">
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(seller => <option key={seller.id} value={seller.id}>{seller.store_name || seller.full_name} ({seller.email})</option>)}
                </Select>
              </div>

              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl border-gold/30 p-4 mt-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'profile'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الملف الشخصي</button>
                    <button onClick={() => setSellerDetailTab('finance')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'finance'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المالية</button>
                    <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'stats'? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المتابعة والتقييم</button>
                  </div>

                  {sellerDetailTab === 'profile' && (
                    <>
                      <div className="overflow-x-auto"><table className="w-full text-right"><tbody>
                        <tr><td className="p-2 font-bold text-gold">الاسم</td><td>{selectedSeller.full_name || '-'}</td><td className="p-2 font-bold text-gold">البريد</td><td>{selectedSeller.email}</td></tr>
                        <tr><td className="p-2 font-bold text-gold">نوع الحساب</td><td>{selectedSeller.account_type === 'seller'? 'بائع' : 'مشتري'}</td><td className="p-2 font-bold text-gold">الحالة</td><td>{selectedSeller.is_banned? 'محظور' : 'نشط'}</td></tr>
                        <tr><td className="p-2 font-bold text-gold">تاريخ التسجيل</td><td>{formatDate(selectedSeller.created_at)}</td><td className="p-2 font-bold text-gold">رقم الهاتف</td><td>{selectedSeller.phone || '-'}</td></tr>
                      </tbody></table></div>
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button onClick={() => updateUserMutation.mutate({ userId: selectedSeller.id, updates: { is_banned:!selectedSeller.is_banned })} className={`px-3 py-1 rounded text-white ${selectedSeller.is_banned? 'bg-green-600' : 'bg-red-600'}`}>{selectedSeller.is_banned? 'إلغاء الحظر' : 'حظر'}</button>
                        <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationMutation.mutate({ userId: selectedSeller.id, title: 'إشعار من الإدارة', message: msg }); }} className="bg-purple-600 px-3 py-1 rounded text-white flex items-center gap-1"><Send size={14} /> إرسال إشعار</button>
                      </div>
                    </>
                  )}

                  {sellerDetailTab === 'finance' && (
                    <>
                      <div className="bg-secondary-blue/30 p-4 rounded-xl mb-4">
                        <label className="block text-gold mb-2">إضافة إيصال تحويل (المبلغ المرسل للبائع)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="number" placeholder="المبلغ" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                          <input type="text" placeholder="ملاحظة (اختياري)" value={transferNote} onChange={e => setTransferNote(e.target.value)} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                          <input id="receiptFileInput" type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                          <Button onClick={handleAddTransfer} disabled={uploading} className="bg-gold text-primary-blue">
                            {uploading? 'جاري الرفع...' : 'إدخال'}
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-right border-collapse">
                          <thead><tr className="border-b border-gold/30"><th>القسم</th><th>التفاصيل</th></tr></thead>
                          <tbody>
                            <tr><td className="p-2 font-bold">إجمالي المبيعات</td><td>{formatCurrency(sellerFinance.totalSales)}</td></tr>
                            <tr><td className="p-2 font-bold">إجمالي المرتجعات</td><td>{formatCurrency(0)}</td></tr>
                            <tr><td className="p-2 font-bold">إجمالي الاستلامات</td><td>{formatCurrency(sellerFinance.totalReceived)}</td></tr>
                            <tr><td className="p-2 font-bold">المبلغ المتبقي</td><td>{formatCurrency(sellerFinance.remaining)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4">
                        <Button variant="secondary" onClick={loadSellerReceipts}>
                          عرض جميع الإيصالات
                        </Button>
                      </div>
                    </>
                  )}

                  {sellerDetailTab === 'stats' && (
                    <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr><th>القسم</th><th>التفاصيل</th><th>طلب البيانات</th></tr></thead><tbody>
                      <tr><td>جميع المنتجات</td><td>{sellerStats.totalProducts}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                      <tr><td>المنتجات المباعة</td><td>{sellerStats.soldProducts}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                      <tr><td>المنتجات قيد الشحن</td><td>{sellerStats.shippingProducts}</td><td><button className="text-gold underline">عرض</button></td></tr>
                      <tr><td>لم تشحن (تم رفع الإيصال)</td><td>{sellerStats.notShippedWithReceipt}</td><td><button className="text-gold underline">عرض</button></td></tr>
                      <tr><td>مشتريات بدون إيصال</td><td>{sellerStats.noReceiptPurchased}</td><td><button className="text-gold underline">عرض</button></td></tr>
                      <tr><td>غير مشتراة</td><td>{sellerStats.notPurchased}</td><td><button className="text-gold underline">عرض</button></td></tr>
                    </tbody></table></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* المشترين (مختصر) */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-white" />
                <Button variant="secondary" onClick={() => refetchUsers()}><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-right border-collapse"><thead><tr><th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>
                {buyerUsers.map(user => (
                  <tr key={user.id}><td>{user.full_name}</td><td>{user.email}</td><td>{user.order_count || 0}</td><td>{formatCurrency(user.total_spent || 0)}</td><td>{user.is_banned? 'محظور' : 'نشط'}</td>
                  <td><button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned:!user.is_banned })} className={`px-2 py-1 rounded text-xs ${user.is_banned? 'bg-green-600' : 'bg-red-600'}`}>{user.is_banned? 'إلغاء الحظر' : 'حظر'}</button>
                  <button onClick={() => { setSelectedBuyer(user); setBuyerDetailTab('profile'); }} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs">تفاصيل</button>
                  <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationMutation.mutate({ userId: user.id, title: 'إشعار من الإدارة', message: msg }); }} className="bg-purple-600 px-2 py-1 rounded text-xs"><Send size={12} /></button></td></tr>
                ))}
              </tbody></table></div>
            </div>
          )}

          {/* طلبات الانضمام */}
          {activeSubTab === 'pending_sellers' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl border-gold/30">
                  <div><h3 className="font-bold">{s.full_name}</h3><p>{s.email} | {s.phone}</p><p>طلب انضمام: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2"><button onClick={() => approveSellerMutation.mutate({ sellerId: s.id, approved: true })} className="bg-green-600 px-4 py-2 rounded">قبول</button><button onClick={() => { const notes = prompt('سبب الرفض:'); if (notes) approveSellerMutation.mutate({ sellerId: s.id, approved: false, notes }); }} className="bg-red-600 px-4 py-2 rounded">رفض</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* المنتجات */}
      {activeMainTab === 'products' && (
        <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
          <h3 className="text-xl font-bold mb-4 text-gold">قائمة المنتجات</h3>
          <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr><th>اسم المنتج</th><th>البائع</th><th>السعر</th><th>الحالة</th></tr></thead><tbody>
            {products?.map(p => (
              <tr key={p.id}><td>{p.name}</td><td>{p.seller_name}</td><td>{formatCurrency(p.price)}</td><td>{p.is_approved? 'موافق' : 'قيد المراجعة'}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* Modal عرض الإيصالات */}
      {showReceiptsModal && (
        <Modal onClose={() => setShowReceiptsModal(false)} title="جميع إيصالات التحويل">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gold/30 bg-primary-card/50">
                  <th className="p-2">المبلغ</th>
                  <th className="p-2">تاريخ الإضافة</th>
                  <th className="p-2">صورة الإيصال</th>
                  <th className="p-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {sellerReceiptsList.map(rec => (
                  <tr key={rec.id}>
                    <td className="p-2">{formatCurrency(rec.amount)}</td>
                    <td className="p-2">{formatDate(rec.created_at)}</td>
                    <td className="p-2">
                      {rec.receipt_image? (
                        <a href={rec.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline">عرض</a>
                      ) : '-'}
                    </td>
                    <td className="p-2">{rec.notes || '-'}</td>
                  </tr>
                ))}
                {sellerReceiptsList.length === 0 && (
                  <tr><td colSpan="4" className="text-center p-4">لا توجد إيصالات</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-left">
            <Button variant="secondary" onClick={() => setShowReceiptsModal(false)}>إغلاق</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}


