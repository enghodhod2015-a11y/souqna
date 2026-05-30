import { supabase } from './supabase'

// ... (الدوال الأخرى تبقى كما هي دون تغيير باستثناء getSellerStats و getMonthlySales)

export const getSellerStats = async (sellerId) => {
  // الحل الجديد: استعلام منفصل لجلب جميع product_id التابعة للبائع
  const { data: sellerProducts, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (productsError) throw productsError
  const productIds = sellerProducts.map(p => p.id)
  if (productIds.length === 0) {
    return {
      totalSales: 0,
      productsCount: 0,
      conversationsCount: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0
    }
  }

  // جلب جميع order_items لهذه المنتجات
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, total_price, order:orders(status)')
    .in('product_id', productIds)
  if (itemsError) throw itemsError

  // حساب المبيعات المكتملة
  let totalSales = 0
  const statusCount = { pending_payment_review: 0, processing: 0, completed: 0 }
  for (const item of orderItems) {
    const orderStatus = item.order?.status
    if (orderStatus === 'completed') {
      totalSales += item.total_price || 0
    }
    if (statusCount.hasOwnProperty(orderStatus)) {
      statusCount[orderStatus]++
    }
  }

  // عدد المنتجات
  const productsCount = productIds.length

  // عدد المحادثات
  const { count: conversationsCount, error: convError } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (convError) throw convError

  return {
    totalSales,
    productsCount,
    conversationsCount: conversationsCount || 0,
    pendingOrders: statusCount.pending_payment_review,
    processingOrders: statusCount.processing,
    completedOrders: statusCount.completed
  }
}

export const getMonthlySales = async (sellerId) => {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 5)
  const startISO = startDate.toISOString()

  // جلب منتجات البائع
  const { data: sellerProducts, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (productsError) throw productsError
  const productIds = sellerProducts.map(p => p.id)
  if (productIds.length === 0) return []

  // جلب order_items مع تواريخ الطلبات
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price, order:orders(created_at, status)')
    .in('product_id', productIds)
    .gte('order.created_at', startISO)
  if (itemsError) throw itemsError

  const months = {}
  for (const item of orderItems) {
    const orderStatus = item.order?.status
    if (orderStatus !== 'completed') continue
    const createdAt = item.order?.created_at
    if (!createdAt) continue
    const month = new Date(createdAt).toLocaleString('ar', { month: 'short' })
    months[month] = (months[month] || 0) + (item.total_price || 0)
  }
  return Object.entries(months).map(([name, sales]) => ({ name, sales }))
}