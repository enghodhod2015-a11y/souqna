import { supabase } from './supabase'

export const createOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const getBuyerOrders = async (buyerId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, product:products(title, cover_image), seller:profiles(full_name)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getSellerOrders = async (sellerId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, product:products(title, cover_image), buyer:profiles(full_name, email, phone)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const updateOrderStatus = async (orderId, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const uploadReceipt = async (orderId, file) => {
  const fileName = `receipts/${orderId}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName)
  const { error: updateError } = await supabase
    .from('orders')
    .update({ receipt_image: publicUrl, payment_status: 'pending' })
    .eq('id', orderId)
  if (updateError) throw updateError
  return publicUrl
}

// إحصائيات البائع (مرحلة 7)
export const getSellerStats = async (sellerId) => {
  // إجمالي المبيعات (من الطلبات المكتملة)
  const { data: salesData, error: salesError } = await supabase
    .from('orders')
    .select('total_price')
    .eq('seller_id', sellerId)
    .eq('order_status', 'completed')
  if (salesError) throw salesError
  const totalSales = salesData.reduce((sum, o) => sum + o.total_price, 0)

  // عدد الطلبات حسب الحالة
  const { data: ordersCount, error: countError } = await supabase
    .from('orders')
    .select('order_status', { count: 'exact', head: false })
    .eq('seller_id', sellerId)
  if (countError) throw countError
  const statusCount = ordersCount.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1
    return acc
  }, {})

  // عدد المنتجات
  const { count: productsCount, error: prodError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (prodError) throw prodError

  // عدد المحادثات
  const { count: conversationsCount, error: convError } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (convError) throw convError

  return {
    totalSales,
    productsCount,
    conversationsCount,
    pendingOrders: statusCount.pending_payment_review || 0,
    processingOrders: statusCount.processing || 0,
    completedOrders: statusCount.completed || 0
  }
}

export const getMonthlySales = async (sellerId) => {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 5)
  const { data, error } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .eq('seller_id', sellerId)
    .eq('order_status', 'completed')
    .gte('created_at', startDate.toISOString())
  if (error) throw error
  const months = {}
  data.forEach(order => {
    const month = new Date(order.created_at).toLocaleString('ar', { month: 'short' })
    months[month] = (months[month] || 0) + order.total_price
  })
  return Object.entries(months).map(([name, sales]) => ({ name, sales }))
}