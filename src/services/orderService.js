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
      payment_status: 'unpaid',   // ✅ تم التصحيح: 'pending' → 'unpaid'
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
  return []
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
    .update({ receipt_image: publicUrl, payment_status: 'paid' })   // ✅ تم التصحيح: 'pending' → 'paid'
    .eq('id', orderId)
  if (updateError) throw updateError
  return publicUrl
}

export const getSellerStats = async (sellerId) => {
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
    totalSales: 0,
    productsCount: productsCount || 0,
    conversationsCount: conversationsCount || 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0
  }
}

export const getMonthlySales = async (sellerId) => {
  return []
}

