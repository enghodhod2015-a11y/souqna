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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Search, TrendingUp, Activity, RefreshCw,
  Wallet, Send, BarChart3, LineChart as LineChartIcon, Loader, MessageCircle, Clock, CheckCircle, Star,
  Filter, Eye, Edit, Trash2, UserCheck, UserX, Ban, UserCog, FileText, CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

// ------------------- Helper functions -------------------
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-YE')
}
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(amount || 0)
}

// ------------------- Main Component -------------------
export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Tabs
  const [activeMainTab, setActiveMainTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState('') // 'sellers', 'buyers', 'pending_users', 'products', 'finance', 'orders'

  // General states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [sellerDetailTab, setSellerDetailTab] = useState('profile')
  const [buyerDetailTab, setBuyerDetailTab] = useState('profile')
  const [sellerFilterId, setSellerFilterId] = useState(null) // for product filter
  const [showReceiptsModal, setShowReceiptsModal] = useState(false)
  const [sellerReceiptsList, setSellerReceiptsList] = useState([])

  // Finance related
  const [transferAmount, setTransferAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState(10) // default site commission %
  const [sellerFinance, setSellerFinance] = useState({
    totalSales: 0,
    totalReturns: 0,
    commissionAmount: 0,
    totalReceived: 0,
    remaining: 0
  })

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
    delivered: 0
  })

  // Dashboard extra data
  const [topProducts, setTopProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [pendingActions, setPendingActions] = useState({ products: 0, receipts: 0, sellers: 0, disputes: 0 })
  const [dailySales, setDailySales] = useState(0)
  const [monthlySales, setMonthlySales] = useState(0)
  const [yearlySales, setYearlySales] = useState(0)
  const [newUsers, setNewUsers] = useState(0)
  const [newSellers, setNewSellers] = useState(0)

  // Product filter state
  const [productFilter, setProductFilter] = useState('all') // 'pending', 'approved', 'hidden', etc.

  // Inquiries/Orders tab (all inquiries)
  const [inquiries, setInquiries] = useState([])
  const [filterInquiry, setFilterInquiry] = useState('all') // 'answered', 'unanswered'

  // Queries from adminService
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
    enabled: activeMainTab === 'users' && activeSubTab === 'pending_users'
  })
  const { data: products, refetch: refetchProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts', sellerFilterId, productFilter],
    queryFn: () => getProductsForAdmin({ seller_id: sellerFilterId, status: productFilter }),
    enabled: activeMainTab === 'products'
  })

  // ------------------- Data fetching (dashboard) -------------------
  useEffect(() => {
    if (activeMainTab !== 'dashboard') return
    const fetchDashboardData = async () => {
      try {
        // Sales summaries
        const today = new Date()
        today.setHours(0,0,0,0)
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const startOfYear = new Date(today.getFullYear(), 0, 1)

        const { data: daily } = await supabase.from('orders').select('total_amount').eq('status','completed').gte('created_at', today.toISOString())
        const dailyTotal = daily?.reduce((s,o)=>s+o.total_amount,0) || 0
        setDailySales(dailyTotal)

        const { data: monthly } = await supabase.from('orders').select('total_amount').eq('status','completed').gte('created_at', startOfMonth.toISOString())
        setMonthlySales(monthly?.reduce((s,o)=>s+o.total_amount,0) || 0)

        const { data: yearly } = await supabase.from('orders').select('total_amount').eq('status','completed').gte('created_at', startOfYear.toISOString())
        setYearlySales(yearly?.reduce((s,o)=>s+o.total_amount,0) || 0)

        // new users & sellers (last 30 days)
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30)
        const { count: newUsersCount } = await supabase.from('profiles').select('*',{count:'exact', head:true}).gte('created_at', thirtyDaysAgo.toISOString())
        const { count: newSellersCount } = await supabase.from('profiles').select('*',{count:'exact', head:true}).eq('account_type','seller').gte('created_at', thirtyDaysAgo.toISOString())
        setNewUsers(newUsersCount || 0)
        setNewSellers(newSellersCount || 0)

        // top products (by revenue)
        const { data: items } = await supabase.from('order_items').select('product_id, quantity, product_price').eq('order.status','completed').limit(200)
        if (items && items.length) {
          const prodMap = {}
          for (const it of items) {
            if (!prodMap[it.product_id]) prodMap[it.product_id] = { qty:0, revenue:0 }
            prodMap[it.product_id].qty += it.quantity
            prodMap[it.product_id].revenue += it.product_price * it.quantity
          }
          const prodIds = Object.keys(prodMap)
          const { data: prodNames } = await supabase.from('products').select('id, name').in('id', prodIds)
          const nameMap = Object.fromEntries(prodNames?.map(p=>[p.id, p.name]) || [])
          const top = Object.entries(prodMap).map(([id, d]) => ({ id, name: nameMap[id] || 'غير معروف', revenue: d.revenue, qty: d.qty }))
          top.sort((a,b)=>b.revenue - a.revenue)
          setTopProducts(top.slice(0,5))
        }

        // pending actions
        const { count: pendingProducts } = await supabase.from('products').select('*',{count:'exact',head:true}).eq('is_approved',false)
        const { count: pendingReceipts } = await supabase.from('orders').select('*',{count:'exact',head:true}).eq('payment_status','pending').not('receipt_image','is',null)
        const { count: pendingSellersCount } = await supabase.from('profiles').select('*',{count:'exact',head:true}).eq('account_type','seller').eq('is_verified',false)
        const { count: pendingDisputes } = await supabase.from('disputes').select('*',{count:'exact',head:true}).eq('status','open')
        setPendingActions({ products: pendingProducts || 0, receipts: pendingReceipts || 0, sellers: pendingSellersCount || 0, disputes: pendingDisputes || 0 })

        // recent orders
        const { data: orders } = await supabase.from('orders').select('id, total_amount, status, created_at, user_id').order('created_at',{ascending:false}).limit(10)
        if (orders?.length) {
          const userIds = orders.map(o=>o.user_id).filter(Boolean)
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
          const map = Object.fromEntries(profiles?.map(p=>[p.id, p.full_name]) || [])
          setRecentOrders(orders.map(o => ({ ...o, buyer_name: map[o.user_id] || 'مستخدم' })))
        }
      } catch (err) { console.error(err) }
    }
    fetchDashboardData()
  }, [activeMainTab])

  // ------------------- Seller stats (when selected) -------------------
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchSellerStats = async () => {
      try {
        const sellerId = selectedSeller.id
        // get all products
        const { data: productsList } = await supabase.from('products').select('id').eq('seller_id', sellerId)
        const productIds = productsList?.map(p=>p.id) || []
        let totalProducts = productIds.length
        let soldProducts = 0, shippingProducts = 0, notShippedWithReceipt = 0, noReceiptPurchased = 0, notPurchased = 0
        let pendingPayment = 0, paymentApproved = 0, processing = 0, shipped = 0, delivered = 0

        if (productIds.length) {
          const { data: orderItems } = await supabase.from('order_items').select('order_id, product_id, quantity').in('product_id', productIds)
          const orderIds = [...new Set(orderItems?.map(i=>i.order_id)||[])]
          const { data: orders } = await supabase.from('orders').select('id, status, payment_status').in('id', orderIds)
          const orderMap = new Map(orders?.map(o=>[o.id,o]))
          const productSoldSet = new Set()
          for (const item of orderItems||[]) {
            const order = orderMap.get(item.order_id)
            if (!order) continue
            productSoldSet.add(item.product_id)
            if (order.status === 'completed') soldProducts += item.quantity
            else if (order.status === 'shipped') shippingProducts += item.quantity
            else if (order.status === 'payment_approved') notShippedWithReceipt += item.quantity
            else if (order.payment_status === 'pending' && order.receipt_image) noReceiptPurchased += item.quantity
            // order status counts
            if (order.status === 'pending_payment_review') pendingPayment++
            else if (order.status === 'payment_approved') paymentApproved++
            else if (order.status === 'processing') processing++
            else if (order.status === 'shipped') shipped++
            else if (order.status === 'delivered') delivered++
          }
          notPurchased = totalProducts - productSoldSet.size
          setSellerStats({
            totalProducts, soldProducts, shippingProducts, notShippedWithReceipt, noReceiptPurchased, notPurchased,
            pendingPayment, paymentApproved, processing, shipped, delivered
          })
        } else {
          setSellerStats({ totalProducts:0, soldProducts:0, shippingProducts:0, notShippedWithReceipt:0, noReceiptPurchased:0, notPurchased:0,
            pendingPayment:0, paymentApproved:0, processing:0, shipped:0, delivered:0 })
        }
      } catch (err) { console.error(err) }
    }
    fetchSellerStats()
  }, [selectedSeller])

  // ------------------- Seller Finance (including commission) -------------------
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchFinance = async () => {
      try {
        const sellerId = selectedSeller.id
        const { data: products } = await supabase.from('products').select('id').eq('seller_id', sellerId)
        const productIds = products?.map(p=>p.id) || []
        let totalSales = 0, totalReturns = 0
        if (productIds.length) {
          const { data: orderItems } = await supabase.from('order_items').select('order_id, product_price, quantity').in('product_id', productIds)
          if (orderItems?.length) {
            const orderIds = [...new Set(orderItems.map(i=>i.order_id))]
            const { data: orders } = await supabase.from('orders').select('id, status, return_status').in('id', orderIds)
            const orderMap = new Map(orders?.map(o=>[o.id,o]))
            for (const item of orderItems) {
              const order = orderMap.get(item.order_id)
              if (order) {
                if (order.status === 'completed' || order.status === 'delivered') totalSales += item.product_price * item.quantity
                if (order.return_status === 'approved') totalReturns += item.product_price * item.quantity
              }
            }
          }
        }
        const netAfterReturns = totalSales - totalReturns
        const commissionAmount = netAfterReturns * (sellerCommissionPercent / 100)
        const { data: transfers } = await supabase.from('seller_transfers').select('amount').eq('seller_id', sellerId)
        const totalReceived = transfers?.reduce((s,t)=>s+(t.amount||0),0) || 0
        const remaining = netAfterReturns - commissionAmount - totalReceived
        setSellerFinance({ totalSales, totalReturns, commissionAmount, totalReceived, remaining })
      } catch (err) { console.error(err) }
    }
    fetchFinance()
  }, [selectedSeller, sellerCommissionPercent])

  // ------------------- Fetch all inquiries (for Orders tab) -------------------
  useEffect(() => {
    if (activeMainTab !== 'orders') return
    const fetchInquiries = async () => {
      const { data, error } = await supabase.from('inquiries').select('*, user:profiles(full_name), product:products(name)').order('created_at', {ascending:false})
      if (!error) setInquiries(data || [])
    }
    fetchInquiries()
  }, [activeMainTab])

  // ------------------- Mutations & Handlers -------------------
  const refreshAllData = async () => {
    await Promise.all([refetchStats(), refetchUsers(), refetchPendingSellers(), refetchProducts()])
    toast.success('تم تحديث جميع البيانات')
  }

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => { queryClient.invalidateQueries(['adminUsers']); toast.success('تم تحديث المستخدم') },
    onError: (err) => toast.error(err.message)
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => { queryClient.invalidateQueries(['pendingSellers']); toast.success('تم تحديث حالة البائع') }
  })

  const sendNotificationToUser = async (userId, message) => {
    const title = 'إشعار من الإدارة'
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const adminId = adminUser.id
    let conversationId = null
    const { data: existing } = await supabase.from('conversations').select('id').or(`buyer_id.eq.${adminId},seller_id.eq.${userId}`).maybeSingle()
    if (existing) conversationId = existing.id
    else {
      const { data: newConv } = await supabase.from('conversations').insert({ buyer_id: adminId, seller_id: userId, product_id: null }).select().single()
      conversationId = newConv.id
    }
    await supabase.from('notifications').insert({ user_id: userId, type: 'info', title, message, related_id: conversationId.toString() })
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: adminId, receiver_id: userId, message })
    toast.success('تم إرسال الإشعار')
  }

  const handleAddTransfer = async () => {
    if (!selectedSeller) return toast.error('اختر بائعاً أولاً')
    const amountNum = parseFloat(transferAmount)
    if (isNaN(amountNum) || amountNum <= 0) return toast.error('أدخل مبلغاً صحيحاً')
    if (!receiptFile) return toast.error('يرجى اختيار صورة الإيصال')
    setUploading(true)
    try {
      const fileName = `seller_transfers/${selectedSeller.id}/${Date.now()}_${receiptFile.name}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
      await addSellerReceipt(selectedSeller.id, amountNum, publicUrl, transferNote)
      toast.success('تم تسجيل التحويل بنجاح')
      setTransferAmount(''); setTransferNote(''); setReceiptFile(null); document.getElementById('receiptFileInput').value = ''
      // refresh finance
      const { data: transfers } = await supabase.from('seller_transfers').select('amount').eq('seller_id', selectedSeller.id)
      const totalReceived = transfers?.reduce((s,t)=>s+(t.amount||0),0) || 0
      setSellerFinance(prev => ({ ...prev, totalReceived, remaining: (prev.totalSales - prev.totalReturns) - prev.commissionAmount - totalReceived }))
    } catch (err) { toast.error(err.message) } finally { setUploading(false) }
  }

  const loadSellerReceipts = async () => {
    if (!selectedSeller) return
    const data = await getSellerReceipts(selectedSeller.id)
    setSellerReceiptsList(data)
    setShowReceiptsModal(true)
  }

  // ------------------- Helper: send to all users -------------------
  const sendToAllUsers = async () => {
    const msg = prompt('أدخل نص الإشعار لجميع المستخدمين:')
    if (!msg) return
    const { data: allUsers } = await supabase.from('profiles').select('id')
    if (allUsers) {
      toast.loading(`جاري إرسال الإشعار إلى ${allUsers.length} مستخدم...`)
      for (const u of allUsers) {
        await sendNotificationToUser(u.id, msg).catch(()=>{})
      }
      toast.success('تم إرسال الإشعار لجميع المستخدمين')
    }
  }

  // ------------------- Render -------------------
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading)
  if (isLoading && activeMainTab !== 'users') return <div className="flex justify-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || []
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || []

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button variant="secondary" onClick={refreshAllData} className="flex items-center gap-2"><RefreshCw size={16} /> تحديث الكل</Button>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        {['dashboard','users','products','finance','orders'].map(tab => (
          <button key={tab} onClick={() => { setActiveMainTab(tab); setActiveSubTab(tab==='users'?'sellers':'') }}
            className={`px-4 py-2 rounded-lg transition ${activeMainTab===tab ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>
            {tab === 'dashboard' && <BarChart3 size={18} className="inline ml-1" />}
            {tab === 'users' && <Users size={18} className="inline ml-1" />}
            {tab === 'products' && <Package size={18} className="inline ml-1" />}
            {tab === 'finance' && <DollarSign size={18} className="inline ml-1" />}
            {tab === 'orders' && <ShoppingBag size={18} className="inline ml-1" />}
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
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(dailySales)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات الشهر</p><p className="text-2xl font-bold">{formatCurrency(monthlySales)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Activity className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات السنة</p><p className="text-2xl font-bold">{formatCurrency(yearlySales)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Users className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مستخدمين جدد (30 يوم)</p><p className="text-2xl font-bold">{newUsers} <span className="text-sm">/ {newSellers} بائع</span></p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl text-center"><Package className="mx-auto text-gold mb-2" size={28} /><p className="text-text-secondary">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingActions.products}</p><button onClick={()=>{setActiveMainTab('products'); setProductFilter('pending')}} className="text-gold text-sm underline">مراجعة</button></div>
            <div className="bg-primary-card p-4 rounded-2xl text-center"><Wallet className="mx-auto text-gold mb-2" size={28} /><p className="text-text-secondary">إيصالات معلقة</p><p className="text-2xl font-bold">{pendingActions.receipts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl text-center"><UserCheck className="mx-auto text-gold mb-2" size={28} /><p className="text-text-secondary">طلبات بائعين</p><p className="text-2xl font-bold">{pendingActions.sellers}</p><button onClick={()=>{setActiveMainTab('users'); setActiveSubTab('pending_users')}} className="text-gold text-sm underline">مراجعة</button></div>
          </div>
          {/* Top products & recent orders */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <h2 className="text-xl font-bold mb-4">⭐ أفضل المنتجات مبيعاً</h2>
              {topProducts.length? topProducts.map((p,i)=>(
                <div key={i} className="flex justify-between p-2 border-b border-gold/20"><span>{p.name}</span><span className="text-gold">{formatCurrency(p.revenue)}</span></div>
              )) : <p className="text-text-secondary">لا توجد بيانات كافية</p>}
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
              <h2 className="text-xl font-bold mb-4">📋 أحدث الطلبات</h2>
              {recentOrders.map(o=>(
                <div key={o.id} className="flex justify-between p-2 border-b border-gold/20"><span>طلب #{o.id} - {o.buyer_name}</span><span>{formatCurrency(o.total_amount)}</span></div>
              ))}
            </div>
          </div>
          {/* Pending actions alerts */}
          <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-600 rounded-2xl">
            <h3 className="font-bold text-yellow-500">تنبيهات</h3>
            <ul className="list-disc mr-5 mt-2">
              {pendingActions.products>0 && <li>{pendingActions.products} منتج بانتظار الموافقة</li>}
              {pendingActions.receipts>0 && <li>{pendingActions.receipts} إيصال دفع بحاجة مراجعة</li>}
              {pendingActions.sellers>0 && <li>{pendingActions.sellers} بائع بانتظار الموافقة</li>}
              {pendingActions.disputes>0 && <li>{pendingActions.disputes} نزاع مفتوح</li>}
            </ul>
          </div>
        </div>
      )}

      {/* ========================== USERS ========================== */}
      {activeMainTab === 'users' && (
        <div>
          {/* زر إرسال إشعار للجميع */}
          <div className="flex justify-end mb-4"><Button onClick={sendToAllUsers} className="bg-blue-600">📢 إرسال إشعار لجميع المستخدمين</Button></div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={()=>setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab==='sellers'?'border-b-2 border-gold text-gold':'text-text-secondary'}`}>البائعين</button>
            <button onClick={()=>setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab==='buyers'?'border-b-2 border-gold text-gold':'text-text-secondary'}`}>المشترين</button>
            <button onClick={()=>setActiveSubTab('pending_users')} className={`px-4 py-2 ${activeSubTab==='pending_users'?'border-b-2 border-gold text-gold':'text-text-secondary'}`}>طلبات التسجيل {pendingSellers?.length>0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellers.length}</span>}</button>
          </div>

          {/* ---------- Sellers ---------- */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select value={selectedSeller?.id||''} onChange={e=>{
                  const seller = sellerUsers.find(u=>u.id===e.target.value)
                  setSelectedSeller(seller)
                  setSellerDetailTab('profile')
                  setSellerFilterId(null)
                }} className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30">
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(s=> <option key={s.id} value={s.id}>{s.store_name||s.full_name} ({s.email})</option>)}
                </Select>
              </div>
              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl p-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    {['profile','finance','stats'].map(t=>(
                      <button key={t} onClick={()=>setSellerDetailTab(t)} className={`px-4 py-2 rounded-lg ${sellerDetailTab===t?'bg-gold text-primary-blue':'hover:bg-secondary-blue'}`}>{t==='profile'?'الملف الشخصي':t==='finance'?'المالية':'المبيعات والإحصائيات'}</button>
                    ))}
                  </div>
                  {/* Profile */}
                  {sellerDetailTab==='profile' && (
                    <div>
                      <div className="grid grid-cols-2 gap-2 mb-4"><span className="font-bold">الاسم:</span><span>{selectedSeller.full_name}</span><span className="font-bold">البريد:</span><span>{selectedSeller.email}</span><span className="font-bold">الهاتف:</span><span>{selectedSeller.phone||'-'}</span><span className="font-bold">الحالة:</span><span>{selectedSeller.is_banned?'محظور':'نشط'}</span></div>
                      <div className="flex gap-3 flex-wrap">
                        <Button variant="danger" onClick={()=>updateUserMutation.mutate({userId:selectedSeller.id, updates:{is_banned:!selectedSeller.is_banned}})}>{selectedSeller.is_banned?'إلغاء الحظر':'حظر'}</Button>
                        <Button variant="secondary" onClick={()=>{const msg=prompt('أدخل نص الإشعار:');if(msg) sendNotificationToUser(selectedSeller.id,msg)}}><Send size={14}/> إرسال إشعار</Button>
                        <Button onClick={()=>{
                          const newType = selectedSeller.account_type==='seller'?'buyer':'seller'
                          if(confirm(`تغيير نوع الحساب إلى ${newType==='seller'?'بائع':'مشتري'}؟`))
                            updateUserMutation.mutate({userId:selectedSeller.id, updates:{account_type:newType}})
                        }} className="bg-amber-600"><UserCog size={14}/> تغيير نوع الحساب</Button>
                      </div>
                    </div>
                  )}
                  {/* Finance */}
                  {sellerDetailTab==='finance' && (
                    <div>
                      <div className="mb-4 p-3 bg-secondary-blue/30 rounded-xl">
                        <label className="block text-gold mb-2">نسبة الموقع (%)</label>
                        <input type="number" min="0" max="100" value={sellerCommissionPercent} onChange={e=>setSellerCommissionPercent(parseFloat(e.target.value)||0)} className="bg-white rounded px-3 py-2 w-32 text-gray-900"/>
                      </div>
                      <table className="w-full text-right border-collapse">
                        <thead><tr><th>القسم</th><th>المبلغ</th><th>العملة</th></tr></thead>
                        <tbody>
                          <tr><td>إجمالي المبيعات</td><td>{formatCurrency(sellerFinance.totalSales)}</td><td>ريال يمني</td></tr>
                          <tr><td>إجمالي المرتجعات</td><td>{formatCurrency(sellerFinance.totalReturns)}</td><td>ريال يمني</td></tr>
                          <tr><td>نسبة الموقع</td><td>{formatCurrency(sellerFinance.commissionAmount)}</td><td>ريال يمني</td></tr>
                          <tr><td>إجمالي الاستلامات</td><td>{formatCurrency(sellerFinance.totalReceived)}</td><td>ريال يمني</td></tr>
                          <tr><td className="font-bold">المبلغ المتبقي</td><td className="font-bold text-gold">{formatCurrency(sellerFinance.remaining)}</td><td>ريال يمني</td></tr>
                        </tbody>
                      </table>
                      <div className="mt-4 flex gap-4">
                        <Button variant="secondary" onClick={loadSellerReceipts}>عرض الإيصالات</Button>
                      </div>
                    </div>
                  )}
                  {/* Stats */}
                  {sellerDetailTab==='stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right">
                        <tbody>
                          <tr><td>جميع المنتجات</td><td>{sellerStats.totalProducts}</td><td><button className="text-gold underline" onClick={()=>{setActiveMainTab('products'); setSellerFilterId(selectedSeller.id)}}>عرض</button></td></tr>
                          <tr><td>المنتجات المباعة</td><td>{sellerStats.soldProducts}</td><td><button className="text-gold underline">عرض</button></td></tr>
                          <tr><td>منتظرة الدفع</td><td>{sellerStats.pendingPayment}</td><td></td></tr>
                          <tr><td>تم تأكيد الدفع</td><td>{sellerStats.paymentApproved}</td><td></td></tr>
                          <tr><td>قيد التجهيز</td><td>{sellerStats.processing}</td><td></td></tr>
                          <tr><td>تم الشحن</td><td>{sellerStats.shipped}</td><td></td></tr>
                          <tr><td>تم التسليم</td><td>{sellerStats.delivered}</td><td></td></tr>
                          <tr><td>غير مشتراة</td><td>{sellerStats.notPurchased}</td><td></td></tr>
                        </tbody>
                      </table>
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
                <Input placeholder="ابحث عن مشتري بالاسم أو البريد" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="flex-1 bg-white text-gray-900" style={{color:'#000'}}/>
                <Button variant="secondary" onClick={()=>refetchUsers()}><Search size={16}/> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr><th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>الإنفاق</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {buyerUsers.map(u=>(
                      <tr key={u.id}>
                        <td>{u.full_name}</td><td>{u.email}</td><td>{u.order_count||0}</td><td>{formatCurrency(u.total_spent||0)}</td>
                        <td className="flex gap-2">
                          <button onClick={()=>updateUserMutation.mutate({userId:u.id, updates:{is_banned:!u.is_banned}})} className="px-2 py-1 rounded bg-red-600 text-white text-xs">حظر</button>
                          <button onClick={()=>setSelectedBuyer(u)} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs">تفاصيل</button>
                          <button onClick={()=>{const msg=prompt('أدخل نص الإشعار:');if(msg) sendNotificationToUser(u.id,msg)}} className="bg-purple-600 px-2 py-1 rounded text-xs"><Send size={12}/></button>
                          <button onClick={()=>{
                            const newType = u.account_type==='seller'?'buyer':'seller'
                            if(confirm(`تغيير نوع الحساب إلى ${newType==='seller'?'بائع':'مشتري'}؟`))
                              updateUserMutation.mutate({userId:u.id, updates:{account_type:newType}})
                          }} className="bg-amber-600 px-2 py-1 rounded text-xs">🔄 تغيير</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- Pending registrations ---------- */}
          {activeSubTab === 'pending_users' && (
            <div className="space-y-4">
              {pendingSellers?.map(s=>(
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl">
                  <div><h3 className="font-bold">{s.full_name}</h3><p>{s.email} | {s.phone}</p><p>تاريخ الطلب: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={()=>approveSellerMutation.mutate({sellerId:s.id, approved:true})}>قبول</Button>
                    <Button variant="danger" onClick={()=>{const notes=prompt('سبب الرفض:'); approveSellerMutation.mutate({sellerId:s.id, approved:false, notes})}}>رفض</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================== PRODUCT MANAGEMENT ========================== */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <label className="text-gold">فلترة:</label>
            <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} className="bg-white text-gray-900 rounded px-3 py-2 border border-gold/30">
              <option value="all">الكل</option>
              <option value="pending">منتظرة الموافقة</option>
              <option value="approved">موافق عليها</option>
              <option value="hidden">مخفية</option>
            </select>
            {sellerFilterId && <Button variant="secondary" onClick={()=>setSellerFilterId(null)}>إلغاء فلتر البائع</Button>}
          </div>
          <div className="bg-primary-card p-4 rounded-2xl overflow-x-auto">
            <table className="w-full text-right">
              <thead><tr><th>اسم المنتج</th><th>البائع</th><th>السعر</th><th>تاريخ العملية</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {products?.map(p=>(
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.seller_name}</td><td>{formatCurrency(p.price)}</td><td>{formatDate(p.created_at)}</td>
                    <td>{p.is_approved?'موافق':'قيد المراجعة'}</td>
                    <td><button onClick={()=>approveProduct(p.id, !p.is_approved)} className="text-gold underline">تغيير الحالة</button></td>
                  </tr>
                ))}
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
            <Select value={selectedSeller?.id||''} onChange={e=>{
              const seller = sellerUsers.find(u=>u.id===e.target.value)
              setSelectedSeller(seller)
            }} className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30">
              <option value="">-- اختر بائعاً --</option>
              {sellerUsers.map(s=> <option key={s.id} value={s.id}>{s.store_name||s.full_name}</option>)}
            </Select>
          </div>
          {selectedSeller && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* left: add transfer */}
              <div className="bg-primary-card p-4 rounded-2xl">
                <h3 className="text-lg font-bold text-gold mb-4">تسديد حساب البائع</h3>
                <div className="space-y-3">
                  <Input label="المبلغ (ريال يمني)" type="number" value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} placeholder="أدخل المبلغ" className="text-gray-900"/>
                  <Input label="الملاحظات" value={transferNote} onChange={e=>setTransferNote(e.target.value)} placeholder="اختياري"/>
                  <div><label className="block mb-1 text-text-secondary">رفع سند التحويل</label><input type="file" accept="image/*" onChange={e=>setReceiptFile(e.target.files[0])} className="bg-white rounded px-3 py-2 w-full text-gray-900"/></div>
                  <Button onClick={handleAddTransfer} disabled={uploading} className="w-full">{uploading?'جاري الرفع...':'إدخال'}</Button>
                </div>
              </div>
              {/* right: financial summary */}
              <div className="bg-primary-card p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold text-gold">ملخص حسابات البائع</h3><Button variant="secondary" onClick={loadSellerReceipts}>الاستعلام عن التحويلات</Button></div>
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
          )}
          {!selectedSeller && <div className="text-center text-text-secondary p-8">يرجى اختيار بائع لعرض بياناته المالية</div>}
        </div>
      )}

      {/* ========================== ORDERS / INQUIRIES ========================== */}
      {activeMainTab === 'orders' && (
        <div>
          <div className="flex gap-4 mb-4">
            <select value={filterInquiry} onChange={e=>setFilterInquiry(e.target.value)} className="bg-white text-gray-900 rounded px-3 py-2">
              <option value="all">جميع الاستفسارات</option>
              <option value="unanswered">غير مجاب عنها</option>
              <option value="answered">تم الرد عليها</option>
            </select>
          </div>
          <div className="bg-primary-card p-4 rounded-2xl">
            {inquiries.filter(i=> filterInquiry==='all' ? true : (filterInquiry==='answered' ? i.reply : !i.reply)).map(inq=>(
              <div key={inq.id} className="border-b border-gold/20 py-3">
                <p><span className="font-bold">المستخدم:</span> {inq.user?.full_name}</p>
                <p><span className="font-bold">المنتج:</span> {inq.product?.name}</p>
                <p><span className="font-bold">السؤال:</span> {inq.message}</p>
                {inq.reply && <p><span className="font-bold text-green-500">الرد:</span> {inq.reply}</p>}
                {!inq.reply && <Button size="sm" onClick={()=>{const reply=prompt('أدخل ردك:'); if(reply) supabase.from('inquiries').update({reply, replied_at:new Date()}).eq('id',inq.id)}}>رد</Button>}
                <p className="text-xs text-text-secondary">{formatDate(inq.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for receipts */}
      {showReceiptsModal && (
        <Modal onClose={()=>setShowReceiptsModal(false)} title="إيصالات تحويل البائع">
          <table className="w-full text-right"><thead><tr><th>المبلغ</th><th>التاريخ</th><th>الصورة</th></tr></thead><tbody>
            {sellerReceiptsList.map(r=>(
              <tr key={r.id}><td>{formatCurrency(r.amount)}</td><td>{formatDate(r.created_at)}</td><td><a href={r.receipt_image} target="_blank" rel="noreferrer" className="text-blue-500 underline">عرض</a></td></tr>
            ))}
          </tbody></table>
          <div className="mt-4 text-left"><Button variant="secondary" onClick={()=>setShowReceiptsModal(false)}>إغلاق</Button></div>
        </Modal>
      )}
    </div>
  )
}

