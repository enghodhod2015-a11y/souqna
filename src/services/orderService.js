import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// استخدام RPC لإنشاء الطلب وعناصره دفعة واحدة (تجاوز RLS والأعمدة المحسوبة)
// ─────────────────────────────────────────────────────────────
export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData

  // تحويل items إلى الصيغة المطلوبة للـ RPC
  const rpcItems = items.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity
  }))

  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_user_id: buyer_id,
    p_total_amount: total_amount,
    p_shipping_address: shipping_address,
    p_shipping_city: shipping_city,
    p_payment_method: payment_method,
    p_notes: notes,
    p_items: rpcItems
  })

  if (error) throw error
  return { id: data.id }
}

// ─────────────────────────────────────────────────────────────
// جلب طلبات المشتري (مع بيانات المنتج من order_items)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// جلب طلبات البائع (مبسط مؤقتاً)
// ─────────────────────────────────────────────────────────────
export const getSellerOrders = async (sellerId) => {
  return []
}

// ─────────────────────────────────────────────────────────────
// تحديث حالة الطلب
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// رفع إيصال الدفع
// ─────────────────────────────────────────────────────────────
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
    .update({ receipt_image: publicUrl, payment_status: 'paid' })
    .eq('id', orderId)
  if (updateError) throw updateError
  return publicUrl
}

// ─────────────────────────────────────────────────────────────
// إحصائيات البائع (مبسطة مؤقتاً)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// المبيعات الشهرية (مبسطة مؤقتاً)
// ─────────────────────────────────────────────────────────────
export const getMonthlySales = async (sellerId) => {
  return []
}


