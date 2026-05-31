import { supabase } from './supabase'

export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData
  const rpcItems = items.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_user_id: buyer_id,
    p_total_amount: total_amount,
    p_shipping_address: shipping_address,
    p_shipping_city: shipping_city,
    p_payment_method: payment_method,
    p_notes: notes,
    p_items: rpcItems
  })
  if (error) throw new Error(error.message)
  return { id: data.id }
}

export const getBuyerOrders = async (buyerId) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw error
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
  const { data, error } = await supabase.rpc('get_seller_orders', { p_seller_id: sellerId })
  if (error) throw error
  return data || []
}

export const updateOrderStatus = async (orderId, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ✅ تأكيد الاستلام مع تسجيل تاريخ الإكمال
export const confirmDelivery = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'delivered')
    .select()
    .single()
  if (error) throw error
  return data
}

// ✅ طلب استرجاع المنتج (مع التحقق من مهلة 3 أيام)
export const requestReturn = async (orderId, reason) => {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('completed_at')
    .eq('id', orderId)
    .single()
  if (fetchError) throw fetchError
  
  if (!order.completed_at) {
    throw new Error('الطلب لم يكتمل بعد، لا يمكن الاسترجاع')
  }
  
  const completedDate = new Date(order.completed_at)
  const now = new Date()
  const daysDiff = (now - completedDate) / (1000 * 60 * 60 * 24)
  
  if (daysDiff > 3) {
    throw new Error('انتهت مهلة الاسترجاع (3 أيام فقط من تاريخ الاستلام)')
  }
  
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      return_status: 'requested',
      return_reason: reason,
      status: 'return_requested'
    })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ✅ الموافقة على الاسترجاع (للبائع)
export const approveReturn = async (orderId, approve, adminNotes = '') => {
  const newStatus = approve ? 'return_approved' : 'return_rejected'
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      return_status: approve ? 'approved' : 'rejected',
      status: newStatus,
      return_admin_notes: adminNotes
    })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const uploadReceipt = async (orderId, file, transferData) => {
  const { transfer_number, transfer_name, buyer_phone } = transferData
  const fileName = `receipts/${orderId}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      receipt_image: publicUrl,
      payment_status: 'paid',
      status: 'processing',
      transfer_number,
      transfer_name,
      buyer_phone
    })
    .eq('id', orderId)
  if (updateError) throw updateError
  return publicUrl
}

export const getSellerStats = async (sellerId) => {
  const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
  const { count: conversationsCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
  return { totalSales: 0, productsCount: productsCount || 0, conversationsCount: conversationsCount || 0, pendingOrders: 0, processingOrders: 0, completedOrders: 0 }
}

export const getMonthlySales = async () => []


