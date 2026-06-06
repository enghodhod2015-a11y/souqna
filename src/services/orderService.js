/**
 * services/orderService.js
 * 
 * دوال إدارة الطلبات (Orders)
 * 
 * قائمة الدوال:
 * 1. createOrder(orderData)        - إنشاء طلب جديد
 * 2. getBuyerOrders(buyerId)       - جلب طلبات المشتري
 * 3. getSellerOrders(sellerId)     - جلب طلبات البائع (باستخدام RPC)
 * 4. updateOrderStatus(orderId, status) - تحديث حالة الطلب
 * 5. confirmDelivery(orderId)      - تأكيد استلام الطلب
 * 6. requestReturn(orderId, reason)- طلب استرجاع المنتج
 * 7. approveReturn(orderId, approve, adminNotes) - قبول/رفض الاسترجاع
 * 8. uploadReceipt(orderId, file, transferData) - رفع إيصال الدفع
 * 9. getSellerStats(sellerId)      - إحصائيات البائع (معدلة لجلب بيانات حقيقية)
 * 10. getMonthlySales(sellerId)    - المبيعات الشهرية (غير مفعلة)
 */

import { supabase } from './supabase'

// 1️⃣ إنشاء طلب جديد
export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData

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

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithNames)

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    throw itemsError
  }

  return { id: order.id }
}

// 2️⃣ جلب طلبات المشتري
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

// 3️⃣ جلب طلبات البائع (باستخدام RPC)
export const getSellerOrders = async (sellerId) => {
  console.log('🔍 getSellerOrders called with sellerId:', sellerId);
  try {
    const { data, error } = await supabase.rpc('get_seller_orders', { p_seller_id: sellerId });
    if (error) {
      console.error('❌ RPC error:', error);
      return [];
    }
    if (!data || data.length === 0) {
      console.log('⚠️ no data from RPC');
      return [];
    }
    console.log('✅ RPC returned rows:', data.length);
    
    const ordersMap = new Map();
    for (const row of data) {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          order_status: row.order_status,
          payment_status: row.payment_status,
          total_price: row.total_price,
          total_amount: row.total_price,
          shipping_address: row.shipping_address,
          receipt_image: row.receipt_image,
          buyer: row.buyer_id ? { 
            id: row.buyer_id, 
            full_name: row.buyer_name, 
            email: row.buyer_email, 
            phone: row.buyer_phone 
          } : null,
          created_at: row.created_at,
          product: { 
            id: row.product_id, 
            name: row.product_name, 
            title: row.product_name,
            cover_image: row.product_cover_image 
          },
          quantity: row.quantity,
          return_status: row.return_status,
          return_reason: row.return_reason,
          completed_at: row.completed_at,
          status: row.order_status
        });
      }
    }
    const result = Array.from(ordersMap.values());
    console.log('🎉 final orders count:', result.length);
    return result;
  } catch (err) {
    console.error('💥 error in getSellerOrders:', err);
    return [];
  }
}

// 4️⃣ تحديث حالة الطلب
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

// 5️⃣ تأكيد الاستلام
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

// 6️⃣ طلب استرجاع
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

// 7️⃣ الموافقة على الاسترجاع
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

// 8️⃣ رفع إيصال الدفع
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

// 9️⃣ إحصائيات البائع (معدلة لجلب بيانات حقيقية)
export const getSellerStats = async (sellerId) => {
  try {
    // 1. جلب جميع منتجات البائع
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId);
    if (productsError) throw productsError;
    const productIds = products?.map(p => p.id) || [];
    
    // عدد المنتجات
    const productsCount = productIds.length;

    // عدد المحادثات (الاستفسارات)
    const { count: conversationsCount, error: convCountErr } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);
    if (convCountErr) throw convCountErr;

    if (productIds.length === 0) {
      return {
        totalSales: 0,
        productsCount,
        conversationsCount: conversationsCount || 0,
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
      };
    }

    // 2. جلب order_items للمنتجات
    const { data: orderItems, error: oiError } = await supabase
      .from('order_items')
      .select('order_id, product_price, quantity')
      .in('product_id', productIds);
    if (oiError) throw oiError;

    if (!orderItems || orderItems.length === 0) {
      return {
        totalSales: 0,
        productsCount,
        conversationsCount: conversationsCount || 0,
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
      };
    }

    const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];

    // 3. جلب حالات الطلبات
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .in('id', orderIds);
    if (ordersError) throw ordersError;

    const orderStatusMap = new Map(orders?.map(o => [o.id, o.status]) || []);

    let totalSales = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;

    for (const item of orderItems) {
      const status = orderStatusMap.get(item.order_id);
      if (!status) continue;

      const saleAmount = item.product_price * item.quantity;
      totalSales += saleAmount;

      if (status === 'pending' || status === 'pending_payment_review') {
        pendingOrders++;
      } else if (status === 'payment_approved' || status === 'processing' || status === 'shipped') {
        processingOrders++;
      } else if (status === 'delivered' || status === 'completed') {
        completedOrders++;
      }
    }

    return {
      totalSales,
      productsCount,
      conversationsCount: conversationsCount || 0,
      pendingOrders,
      processingOrders,
      completedOrders,
    };
  } catch (err) {
    console.error('❌ خطأ في جلب إحصائيات البائع:', err);
    return {
      totalSales: 0,
      productsCount: 0,
      conversationsCount: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
    };
  }
};

// 🔟 المبيعات الشهرية للبائع (غير مفعلة)
export const getMonthlySales = async (sellerId) => {
  return []
}

