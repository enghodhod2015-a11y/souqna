import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// إنشاء طلب جديد (بدون RPC، باستخدام إدراج مباشر)
// ─────────────────────────────────────────────────────────────
export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData

  // 1. إنشاء الطلب في جدول orders
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: buyer_id,
      total_amount: total_amount,
      shipping_address: shipping_address,
      shipping_city: shipping_city,
      payment_method: payment_method,
      notes: notes,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (orderError) throw orderError

  // 2. جلب أسماء المنتجات لجميع العناصر
  const itemsWithNames = await Promise.all(items.map(async (item) => {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name')
      .eq('id', item.product_id)
      .single()
    if (productError) throw productError
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product_price: item.unit_price,
      product_name: product.name
    }
  }))

  // 3. إدراج عناصر الطلب في order_items
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithNames)

  if (itemsError) {
    // حذف الطلب إذا فشلت إضافة العناصر
    await supabase.from('orders').delete().eq('id', order.id)
    throw itemsError
  }

  return { id: order.id }
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
// جلب طلبات البائع (نسخة معدلة تعمل مع هيكل الجداول الحالي)
// ─────────────────────────────────────────────────────────────
export const getSellerOrders = async (sellerId) => {
  console.log('🔍 getSellerOrders called with sellerId:', sellerId);
  try {
    // استعلام واحد يجلب order_items التي ترتبط بمنتجات يملكها هذا البائع
    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        *,
        order:orders(*),
        product:products!inner(id, name, cover_image, seller_id)
      `)
      .eq('product.seller_id', sellerId)
      .order('order.created_at', { ascending: false });

    if (error) {
      console.error('❌ error fetching seller orders:', error);
      return [];
    }

    if (!items || items.length === 0) {
      console.log('⚠️ no orders found for seller', sellerId);
      return [];
    }

    console.log('✅ items found:', items.length);

    // تجميع النتائج حسب order
    const ordersMap = new Map();
    for (const item of items) {
      const order = item.order;
      if (!order) continue;
      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          id: order.id,
          order_status: order.status,
          payment_status: order.payment_status,
          total_price: order.total_amount,
          shipping_address: order.shipping_address,
          receipt_image: order.receipt_image,
          buyer: null, // سيتم تعبئته لاحقاً
          created_at: order.created_at,
          product: item.product ? { ...item.product, title: item.product.name } : null,
          quantity: item.quantity,
          return_status: order.return_status,
          return_reason: order.return_reason,
          completed_at: order.completed_at,
          status: order.status,
          total_amount: order.total_amount
        });
      }
    }

    // جلب بيانات المشترين
    const buyerIds = [...new Set(items.map(i => i.order?.user_id).filter(Boolean))];
    if (buyerIds.length) {
      const { data: buyers } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', buyerIds);
      if (buyers) {
        const buyerMap = new Map(buyers.map(b => [b.id, b]));
        for (const order of ordersMap.values()) {
          const buyerId = items.find(i => i.order?.id === order.id)?.order?.user_id;
          if (buyerId) order.buyer = buyerMap.get(buyerId) || null;
        }
      }
    }

    const result = Array.from(ordersMap.values());
    console.log('🎉 final orders for seller:', result.length);
    return result;
  } catch (err) {
    console.error('💥 error in getSellerOrders:', err);
    return [];
  }
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
// تأكيد الاستلام
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
// طلب استرجاع
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
// الموافقة على الاسترجاع
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
// رفع إيصال الدفع
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

  const updates = {
    receipt_image: publicUrl,
    payment_status: 'paid',
    status: 'processing'
  }
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
// المبيعات الشهرية للبائع
// ─────────────────────────────────────────────────────────────
export const getMonthlySales = async (sellerId) => {
  return []
}

