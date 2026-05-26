import { supabase } from './supabase'

// الحصول على الإحصائيات العامة
export const getAdminStats = async () => {
  // عدد المستخدمين
  const { count: usersCount, error: usersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  if (usersError) throw usersError

  // عدد المنتجات
  const { count: productsCount, error: productsError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  if (productsError) throw productsError

  // عدد الطلبات
  const { count: ordersCount, error: ordersError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  if (ordersError) throw ordersError

  // إجمالي المبيعات (الطلبات المكتملة)
  const { data: salesData, error: salesError } = await supabase
    .from('orders')
    .select('total_price')
    .eq('order_status', 'completed')
  if (salesError) throw salesError
  const totalSales = salesData.reduce((sum, o) => sum + o.total_price, 0)

  // الطلبات المعلقة للمراجعة
  const { count: pendingReceipts, error: pendingError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'pending')
  if (pendingError) throw pendingError

  return { usersCount, productsCount, ordersCount, totalSales, pendingReceipts }
}

// جلب قائمة المستخدمين مع إمكانية البحث
export const getUsers = async (filters = {}) => {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (filters.search) query = query.ilike('email', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

// تحديث صلاحيات المستخدم (حظر، تعيين أدمن، تغيير الدور)
export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// جلب قائمة المنتجات (للمراقبة)
export const getProductsForAdmin = async (filters = {}) => {
  let query = supabase.from('products').select('*, seller:profiles(full_name, email)').order('created_at', { ascending: false })
  if (filters.status === 'pending') query = query.eq('is_approved', false)
  if (filters.status === 'hidden') query = query.eq('is_hidden', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

// تحديث حالة الموافقة على المنتج
export const approveProduct = async (productId, approve) => {
  const { data, error } = await supabase
    .from('products')
    .update({ is_approved: approve, is_hidden: !approve })
    .eq('id', productId)
    .select()
    .single()
  if (error) throw error
  return data
}

// جلب قائمة الطلبات مع تفاصيل الإيصالات
export const getOrdersForAdmin = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, product:products(title), buyer:profiles!orders_buyer_id_fkey(full_name, email), seller:profiles!orders_seller_id_fkey(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// مراجعة الإيصال (قبول أو رفض)
export const reviewReceipt = async (orderId, approved, notes = '') => {
  const paymentStatus = approved ? 'paid' : 'failed'
  const orderStatus = approved ? 'payment_approved' : 'cancelled'
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus, order_status: orderStatus, receipt_notes: notes })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

// تسجيل عملية في Audit Log
export const addAuditLog = async (action, targetType, targetId, details) => {
  const { error } = await supabase
    .from('audit_logs')
    .insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action, target_type: targetType, target_id: targetId, details })
  if (error) console.error('Audit log error:', error)
}

// جلب سجل العمليات
export const getAuditLogs = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, admin:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}