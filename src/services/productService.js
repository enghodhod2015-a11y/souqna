import { supabase } from './supabase'

export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: buyer_id,
      order_number: `ORD-${Date.now()}`,
      status: 'pending_payment_review',
      total_amount: total_amount,
      shipping_address,
      shipping_city,
      payment_method,
      payment_status: 'pending',
      notes
    }])
    .select()
    .single()
  if (orderError) throw orderError

  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    total_price: item.unit_price * item.quantity
  }))
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
  if (itemsError) throw itemsError

  return order
}

export const getBuyerOrders = async (buyerId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items!inner (
        product_id,
        quantity,
        total_price,
        product:products (name, cover_image, seller_id)
      )
    `)
    .eq('user_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(order => ({
    ...order,
    product: order.order_items?.[0]?.product ? { ...order.order_items[0].product, title: order.order_items[0].product.name } : null,
    total_price: order.total_amount
  }))
}

export const getSellerOrders = async (sellerId) => {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      order:orders (*, buyer:profiles!orders_user_id_fkey (full_name, email, phone)),
      product:products (name, cover_image)
    `)
    .eq('product.seller_id', sellerId)
    .order('order.created_at', { ascending: false })
  if (error) throw error
  return data.map(item => ({
    id: item.order.id,
    order_status: item.order.status,
    payment_status: item.order.payment_status,
    total_price: item.total_price,
    shipping_address: item.order.shipping_address,
    receipt_image: item.order.receipt_image,
    product: item.product ? { ...item.product, title: item.product.name } : null,
    buyer: item.order.buyer,
    quantity: item.quantity
  }))
}

export const updateOrderStatus = async (orderId, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: status })
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

export const getSellerStats = async (sellerId) => {
  // ✅ إصلاح جذري: استخدام استعلامين منفصلين بسيطين بدلاً من orders!inner
  let totalSales = 0
  let statusCount = { pending_payment_review: 0, processing: 0, completed: 0 }
  
  // 1. جلب جميع الطلبات التي تحتوي على منتجات هذا البائع
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price, order_id')
    .eq('product.seller_id', sellerId)
  if (!itemsError && orderItems) {
    // 2. جلب حالات الطلبات بشكل منفصل
    const orderIds = [...new Set(orderItems.map(item => item.order_id))]
    if (orderIds.length) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount')
        .in('id', orderIds)
      if (!ordersError && orders) {
        const ordersMap = new Map(orders.map(o => [o.id, o]))
        orderItems.forEach(item => {
          const order = ordersMap.get(item.order_id)
          if (order) {
            if (order.status === 'completed') {
              totalSales += (item.total_price || 0)
            }
            if (order.status === 'pending_payment_review') statusCount.pending_payment_review++
            else if (order.status === 'processing') statusCount.processing++
            else if (order.status === 'completed') statusCount.completed++
          }
        })
      }
    }
  }

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
    pendingOrders: statusCount.pending_payment_review,
    processingOrders: statusCount.processing,
    completedOrders: statusCount.completed
  }
}

export const getMonthlySales = async (sellerId) => {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 5)
  const months = {}
  
  // جلب order_items للمنتجات ثم الطلبات المرتبطة
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price, order_id')
    .eq('product.seller_id', sellerId)
    .gte('created_at', startDate.toISOString())
  if (!itemsError && orderItems && orderItems.length) {
    const orderIds = [...new Set(orderItems.map(item => item.order_id))]
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .in('id', orderIds)
      .eq('status', 'completed')
    if (!ordersError && orders) {
      const ordersMap = new Map(orders.map(o => [o.id, o]))
      orderItems.forEach(item => {
        const order = ordersMap.get(item.order_id)
        if (order && order.status === 'completed') {
          const month = new Date(order.created_at).toLocaleString('ar', { month: 'short' })
          months[month] = (months[month] || 0) + (item.total_price || 0)
        }
      })
    }
  }
  return Object.entries(months).map(([name, sales]) => ({ name, sales }))
}