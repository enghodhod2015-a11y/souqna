/**
 * services/orderService.js
 * 
 * دوال إدارة الطلبات (Orders)
 */

import { supabase } from './supabase'
import { updateProductStock } from './productService'

// 1️⃣ إنشاء طلب جديد (مع خصم المخزون)
export const createOrder = async (orderData) => {
  const { buyer_id, total_amount, shipping_address, shipping_city, payment_method, notes, items } = orderData

  // التحقق من توفر المخزون
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .single()
    if (!product || product.stock_quantity < item.quantity) {
      throw new Error(`المنتج غير متوفر بالكمية المطلوبة (المتبقي: ${product?.stock_quantity || 0})`)
    }
  }

  // إنشاء الطلب
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: buyer_id,
      total_amount: total_amount,
      original_amount: orderData.original_amount || total_amount,
      discount_amount: orderData.discount_amount || 0,
      coupon_id: orderData.coupon_id || null,
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

  // إضافة عناصر الطلب
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

  // خصم الكميات من المخزون
  for (const item of items) {
    await updateProductStock(item.product_id, -item.quantity)
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
          finalized_at: row.finalized_at,
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

// 4️⃣ تحديث حالة الطلب (مع إعادة المخزون إذا أصبح ملغياً)
export const updateOrderStatus = async (orderId, status) => {
  if (status === 'cancelled') {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)
    if (!itemsError && items) {
      for (const item of items) {
        await updateProductStock(item.product_id, item.quantity)
      }
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

// 5️⃣ تأكيد الاستلام (مع تعيين finalized_at بعد 3 أيام)
export const confirmDelivery = async (orderId) => {
  const completedAt = new Date().toISOString();
  const finalizedAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      completed_at: completedAt,
      finalized_at: finalizedAt
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

// 7️⃣ الموافقة على الاسترجاع (مع إعادة المخزون إذا قُبل)
export const approveReturn = async (orderId, approve, adminNotes = '') => {
  const newStatus = approve ? 'return_approved' : 'return_rejected'
  
  if (approve) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)
    if (!itemsError && items) {
      for (const item of items) {
        await updateProductStock(item.product_id, item.quantity)
      }
    }
  }

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

// 8️⃣ رفع إيصال الدفع (معدل لمراجعة الأدمن - يتوافق مع قيود قاعدة البيانات)
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

  // ✅ استخدام القيم المسموح بها في قيود قاعدة البيانات
  const updates = {
    receipt_image: publicUrl,
    status: 'pending_payment_review',   // ينتظر مراجعة الأدمن
    payment_status: 'unpaid',            // لا يزال غير مدفوع حتى الموافقة
    transfer_number: transfer_number || null,
    transfer_name: transfer_name || null,
    buyer_phone: buyer_phone || null,
    receipt_uploaded_at: new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
  if (updateError) throw updateError

  return publicUrl
}

// 🆕 جلب الطلبات المنتظرة مراجعة الأدمن (التي رفع فيها إيصال)
export const getPendingAdminReceipts = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:profiles!orders_user_id_fkey(id, full_name, email, phone),
      order_items(product_id, quantity, product_price, product_name)
    `)
    .eq('status', 'pending_payment_review')
    .not('receipt_image', 'is', null)
    .order('receipt_uploaded_at', { ascending: true })
  if (error) throw error
  return data || []
}

// 🆕 قبول أو رفض الإيصال من الأدمن (يتوافق مع قيود قاعدة البيانات)
export const reviewReceiptByAdmin = async (orderId, approved, rejectionReason = '') => {
  if (approved) {
    // قبول الإيصال → يصبح الطلب قيد التجهيز والدفع مؤكد
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: null
      })
      .eq('id', orderId)
    if (error) throw error

    // إرسال إشعار للبائع
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId)
      .limit(1)
    if (items && items.length > 0) {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', items[0].product_id)
        .single()
      if (product?.seller_id) {
        const { addNotification } = await import('./notificationService')
        await addNotification(
          product.seller_id,
          'order_status',
          'تم قبول إيصال الدفع',
          `الطلب #${orderId} أصبح قيد التجهيز`,
          orderId
        )
      }
    }
  } else {
    // رفض الإيصال → إلغاء الطلب مع إعادة المخزون
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)
    if (!itemsError && items) {
      for (const item of items) {
        await updateProductStock(item.product_id, item.quantity)
      }
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'unpaid',
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: rejectionReason
      })
      .eq('id', orderId)
    if (error) throw error

    // إرسال إشعار للمشتري بالرفض
    const { data: order } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single()
    if (order?.user_id) {
      const { addNotification } = await import('./notificationService')
      await addNotification(
        order.user_id,
        'payment',
        'تم رفض إيصال الدفع',
        rejectionReason || `الطلب #${orderId} تم رفضه، يرجى التواصل مع الدعم`,
        orderId
      )
    }
  }
  return { success: true }
}

// 9️⃣ إحصائيات البائع (معدلة لتحتسب فقط المستحق)
export const getSellerStats = async (sellerId) => {
  console.log('📊 getSellerStats called for seller:', sellerId);
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId);
    if (productsError) throw productsError;
    const productIds = products?.map(p => p.id) || [];
    
    const productsCount = productIds.length;

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
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, completed_at, finalized_at, return_status')
      .in('id', orderIds);
    if (ordersError) throw ordersError;

    const orderMap = new Map(orders?.map(o => [o.id, o]) || []);
    const now = new Date().toISOString();

    let totalSales = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;

    for (const item of orderItems) {
      const order = orderMap.get(item.order_id);
      if (!order) continue;

      const saleAmount = item.product_price * item.quantity;

      // حساب المبيعات المستحقة للبائع (المبلغ الذي يستحق دفعه)
      const isEligible = (order.status === 'completed' && order.finalized_at && order.finalized_at <= now && order.return_status !== 'approved')
                      || (order.status === 'delivered' && order.completed_at && (new Date(order.completed_at) < new Date(Date.now() - 3*24*60*60*1000)) && order.return_status !== 'approved');
      if (isEligible) {
        totalSales += saleAmount;
      }

      // إحصائيات إضافية (للشاشة)
      if (order.status === 'pending' || order.status === 'pending_payment_review') {
        pendingOrders++;
      } else if (order.status === 'payment_approved' || order.status === 'processing' || order.status === 'shipped') {
        processingOrders++;
      } else if (order.status === 'delivered' || order.status === 'completed') {
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


