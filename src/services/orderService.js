import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// استخدام RPC لإنشاء الطلب وعناصره دفعة واحدة (تجاوز RLS والأعمدة المحسوبة)
// ─────────────────────────────────────────────────────────────
export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData

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

  if (error) {
    console.error('RPC Error:', error)
    throw new Error(error.message)
  }

  return { id: data.id }
}

// ─────────────────────────────────────────────────────────────
// جلب طلبات المشتري
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// جلب طلبات البائع (بدون RPC، باستعلام مباشر)
// ─────────────────────────────────────────────────────────────
export const getSellerOrders = async (sellerId) => {
  // جلب منتجات البائع أولاً
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
  if (productsError) throw productsError
  if (!products || products.length === 0) return []

  const productIds = products.map(p => p.id)
  // جلب order_items لهذه المنتجات
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*, order:orders(*), product:products(name, cover_image)')
    .in('product_id', productIds)
    .order('order.created_at', { ascending: false })
  if (itemsError) throw itemsError
  if (!items || items.length === 0) return []

  // جلب بيانات المشترين بشكل منفصل لتجنب مشاكل العلاقات
  const buyerIds = [...new Set(items.map(i => i.order?.user_id).filter(Boolean))]
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

  // تجميع النتائج
  const ordersMap = new Map()
  items.forEach(item => {
    if (!item.order) return
    const orderId = item.order.id
    if (!ordersMap.has(orderId)) {
      ordersMap.set(orderId, {
        id: orderId,
        order_status: item.order.status,
        payment_status: item.order.payment_status,
        total_price: item.order.total_amount,
        shipping_address: item.order.shipping_address,
        receipt_image: item.order.receipt_image,
        buyer: buyersMap.get(item.order.user_id) || null,
        created_at: item.order.created_at,
        product: item.product ? { ...item.product, title: item.product.name } : null,
        quantity: item.quantity,
        return_status: item.order.return_status,
        return_reason: item.order.return_reason,
        completed_at: item.order.completed_at
      })
    } else {
      const existing = ordersMap.get(orderId)
      if (!existing.product && item.product) {
        existing.product = item.product ? { ...item.product, title: item.product.name } : null
      }
    }
  })

  return Array.from(ordersMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ─────────────────────────────────────────────────────────────
// تحديث حالة الطلب
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// تأكيد الاستلام مع تسجيل تاريخ الإكمال
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// طلب استرجاع المنتج (مع التحقق من مهلة 3 أيام)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// الموافقة على الاسترجاع (للبائع أو الأدمن)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// رفع إيصال الدفع مع بيانات التحويل (تعديل: إزالة الحقول غير الموجودة)
// ─────────────────────────────────────────────────────────────
export const uploadReceipt = async (orderId, file, transferData = {}) => {
  const { transfer_number, transfer_name, buyer_phone } = transferData

  const fileName = `receipts/${orderId}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName)

  // تحديث فقط الحقول الموجودة في جدول orders
  const updates = {
    receipt_image: publicUrl,
    payment_status: 'paid',
    status: 'processing'
  }
  // إضافة بيانات التحويل فقط إذا كانت الأعمدة موجودة (قد لا تكون موجودة في الجدول)
  if (transfer_number) updates.transfer_number = transfer_number
  if (transfer_name) updates.transfer_name = transfer_name
  if (buyer_phone) updates.buyer_phone = buyer_phone

  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
  if (updateError) throw updateError

  return publicUrl
}

// ─────────────────────────────────────────────────────────────
// إحصائيات البائع
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

  // يمكن حساب المبيعات والإحصائيات الأخرى إذا لزم الأمر
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
// المبيعات الشهرية (للبائع)
// ─────────────────────────────────────────────────────────────
export const getMonthlySales = async (sellerId) => {
  // تنفيذ لاحق إذا احتجت
  return []
}


