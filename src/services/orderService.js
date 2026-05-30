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
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', buyerId)
    .order('created_at', { ascending: false })
  if (ordersError) throw ordersError
  if (!orders || orders.length === 0) return []

  const orderIds = orders.map(o => o.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*, product:products(name, cover_image, seller_id)')
    .in('order_id', orderIds)
  if (itemsError) throw itemsError

  return orders.map(order => {
    const orderItems = items.filter(i => i.order_id === order.id)
    const firstItem = orderItems[0]
    return {
      ...order,
      product: firstItem?.product ? { ...firstItem.product, title: firstItem.product.name } : null,
      total_price: order.total_amount,
      order_status: order.status
    }
  })
}

export const getSellerOrders = async (sellerId) => {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  const productIds = products.map(p => p.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*, product:products(name, cover_image), order:orders(*)')
    .in('product_id', productIds)
  if (itemsError) throw itemsError
  if (!items || items.length === 0) return []

  // ✅ التصحيح: إضافة const قبل كل تعيين
  const orderIds = [...new Set(items.map(i => i.order_id))];
  const buyerIds = [...new Set(items.map(i => i.order?.user_id).filter(Boolean))];
  
  let buyersMap = new Map()
  if (buyerIds.length) {
    const { data: buyers, error: buyersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', buyerIds)
    if (!buyersError && buyers) {
      buyers.forEach(b => buyersMap.set(b.id, b))
    }
  }

  const ordersMap = new Map()
  items.forEach(item => {
    if (!item.order) return
    const orderId = item.order.id
    if (!ordersMap.has(orderId)) {
      ordersMap.set(orderId, {
        id: orderId,
        order_status: item.order.status,
        payment_status: item.order.payment_status,
        total_price: item.total_price,
        shipping_address: item.order.shipping_address,
        receipt_image: item.order.receipt_image,
        buyer: buyersMap.get(item.order.user_id) || null,
        created_at: item.order.created_at,
        items: []
      })
    }
    const orderObj = ordersMap.get(orderId)
    orderObj.items.push({
      product: item.product ? { ...item.product, title: item.product.name } : null,
      quantity: item.quantity,
      total_price: item.total_price
    })
    if (!orderObj.product) {
      orderObj.product = item.product ? { ...item.product, title: item.product.name } : null
    }
  })

  let result = Array.from(ordersMap.values())
  result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return result
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
  let totalSales = 0
  let statusCount = { pending_payment_review: 0, processing: 0, completed: 0 }
  
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (prodError) throw prodError
  if (!products || products.length === 0) {
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
    const { count: conversationsCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
    return { totalSales: 0, productsCount: productsCount || 0, conversationsCount: conversationsCount || 0, pendingOrders: 0, processingOrders: 0, completedOrders: 0 }
  }

  const productIds = products.map(p => p.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price, order_id')
    .in('product_id', productIds)
  if (itemsError) throw itemsError
  if (!items || items.length === 0) {
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
    const { count: conversationsCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
    return { totalSales: 0, productsCount: productsCount || 0, conversationsCount: conversationsCount || 0, pendingOrders: 0, processingOrders: 0, completedOrders: 0 }
  }

  const orderIds = [...new Set(items.map(i => i.order_id))]
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .in('id', orderIds)
  if (ordersError) throw ordersError

  const ordersMap = new Map(orders.map(o => [o.id, o]))
  items.forEach(item => {
    const order = ordersMap.get(item.order_id)
    if (order) {
      if (order.status === 'completed') totalSales += (item.total_price || 0)
      if (order.status === 'pending_payment_review') statusCount.pending_payment_review++
      else if (order.status === 'processing') statusCount.processing++
      else if (order.status === 'completed') statusCount.completed++
    }
  })

  const { count: productsCount, error: prodCountErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (prodCountErr) throw prodCountErr

  const { count: conversationsCount, error: convCountErr } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  if (convCountErr) throw convCountErr

  return {
    totalSales,
    productsCount: productsCount || 0,
    conversationsCount: conversationsCount || 0,
    pendingOrders: statusCount.pending_payment_review,
    processingOrders: statusCount.processing,
    completedOrders: statusCount.completed
  }
}

export const getMonthlySales = async (sellerId) => {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 5)
  const months = {}

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  const productIds = products.map(p => p.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price, order_id')
    .in('product_id', productIds)
  if (itemsError) throw itemsError
  if (!items || items.length === 0) return []

  const orderIds = [...new Set(items.map(i => i.order_id))]
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .in('id', orderIds)
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())
  if (ordersError) throw ordersError

  const ordersMap = new Map(orders.map(o => [o.id, o]))
  items.forEach(item => {
    const order = ordersMap.get(item.order_id)
    if (order && order.status === 'completed') {
      const month = new Date(order.created_at).toLocaleString('ar', { month: 'short' })
      months[month] = (months[month] || 0) + (item.total_price || 0)
    }
  })

  return Object.entries(months).map(([name, sales]) => ({ name, sales }))
}