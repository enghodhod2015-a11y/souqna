import { supabase } from './supabase'

// ==========================================
// دوال الإحصائيات العامة (معدلة)
// ==========================================
export const getAdminStats = async () => {
  const { count: usersCount, error: usersError } = await supabase
   .from('profiles')
   .select('*', { count: 'exact', head: true })
  if (usersError) throw usersError

  const { count: productsCount, error: productsError } = await supabase
   .from('products')
   .select('*', { count: 'exact', head: true })
  if (productsError) throw productsError

  const { count: ordersCount, error: ordersError } = await supabase
   .from('orders')
   .select('*', { count: 'exact', head: true })
  if (ordersError) throw ordersError

  const { data: salesData, error: salesError } = await supabase
   .from('orders')
   .select('total_amount')
   .eq('status', 'completed')
  if (salesError) throw salesError
  const totalSales = salesData.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  const { count: pendingReceipts, error: pendingError } = await supabase
   .from('orders')
   .select('*', { count: 'exact', head: true })
   .eq('payment_status', 'pending')
   .not('receipt_image', 'is', null)
  if (pendingError) throw pendingError

  let stats = {}

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todaySales, error: todayError } = await supabase
   .from('orders')
   .select('total_amount')
   .eq('status', 'completed')
   .gte('created_at', today.toISOString())
  if (!todayError) {
    const dailySales = todaySales.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    stats.dailySales = dailySales
    stats.dailyCommission = dailySales * 0.1
  } else {
    stats.dailySales = 0
    stats.dailyCommission = 0
  }

  const { count: newOrders, error: newOrdersError } = await supabase
   .from('orders')
   .select('*', { count: 'exact', head: true })
   .gte('created_at', today.toISOString())
  stats.newOrders = newOrdersError? 0 : newOrders

  stats.openDisputes = 0

  const { count: completedOrders, error: completedError } = await supabase
   .from('orders')
   .select('*', { count: 'exact', head: true })
   .eq('status', 'completed')
  const { count: totalOrders, error: totalOrdersError } = await supabase
   .from('orders')
   .select('*', { count: 'exact', head: true })
  if (!completedError &&!totalOrdersError && totalOrders > 0) {
    stats.completionRate = Math.round((completedOrders / totalOrders) * 100)
  } else {
    stats.completionRate = 0
  }

  return {
    usersCount,
    productsCount,
    ordersCount,
    totalSales,
    pendingReceipts,
    dailySales: stats.dailySales,
    dailyCommission: stats.dailyCommission,
    newOrders: stats.newOrders,
    openDisputes: stats.openDisputes,
    completionRate: stats.completionRate
  }
}

// ==========================================
// دوال المستخدمين (مطورة)
// ==========================================
export const getUsers = async (filters = {}) => {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (filters.search) query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error

  for (const user of data) {
    const { count: orderCount, error: orderErr } = await supabase
     .from('orders')
     .select('*', { count: 'exact', head: true })
     .eq('user_id', user.id)
    if (!orderErr) user.order_count = orderCount

    const { data: spentData, error: spentErr } = await supabase
     .from('orders')
     .select('total_amount')
     .eq('user_id', user.id)
     .eq('status', 'completed')
    if (!spentErr) user.total_spent = spentData.reduce((s, o) => s + (o.total_amount || 0), 0)

    const { data: lastOrder, error: lastErr } = await supabase
     .from('orders')
     .select('created_at')
     .eq('user_id', user.id)
     .order('created_at', { ascending: false })
     .limit(1)
    if (!lastErr && lastOrder.length) user.last_order_date = lastOrder[0].created_at

    if (user.account_type === 'seller') {
      const { data: productsData, error: productsErr } = await supabase
       .from('products')
       .select('price')
       .eq('seller_id', user.id)
       .eq('is_approved', true)
      if (!productsErr) user.total_sales = productsData.reduce((s, p) => s + (p.price || 0), 0)
      user.completion_rate = 0
      user.rating = 0
      user.is_verified = user.is_verified || false
    }
  }
  return data
}

export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
   .from('profiles')
   .update(updates)
   .eq('id', userId)
   .select()
   .single()
  if (error) throw error
  return data
}

export const getPendingSellers = async () => {
  const { data, error } = await supabase
   .from('profiles')
   .select('*')
   .eq('account_type', 'seller')
   .eq('is_verified', false)
   .order('created_at', { ascending: false })
  if (error) {
    console.warn('Column is_verified might not exist in profiles table')
    return []
  }
  return data.map(seller => ({...seller, license_document: null }))
}

export const approveSeller = async (sellerId, approved, notes = '') => {
  const { data, error } = await supabase
   .from('profiles')
   .update({ is_verified: approved, admin_notes: notes })
   .eq('id', sellerId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog(approved? 'approve_seller' : 'reject_seller', 'profile', sellerId, { notes })
  return data
}

// ==========================================
// دوال المنتجات (معدلة لضمان جلب اسم البائع)
// ==========================================
export const getProductsForAdmin = async (filters = {}) => {
  let query = supabase
   .from('products')
   .select(`
      *,
      seller:profiles!products_seller_id_fkey (
        id,
        full_name,
        email,
        phone
      )
    `)
   .order('created_at', { ascending: false })

  if (filters.status === 'pending') query = query.eq('is_approved', false)
  if (filters.status === 'hidden') query = query.eq('is_hidden', true)

  const { data, error } = await query
  if (error) throw error

  return data.map(product => ({
   ...product,
    title: product.name,
    seller_name: product.seller?.full_name || 'غير معروف',
    seller_email: product.seller?.email || '',
    seller_phone: product.seller?.phone || ''
  }))
}

export const approveProduct = async (productId, approve, is_hidden = null) => {
  const updates = { is_approved: approve }
  if (is_hidden!== null) updates.is_hidden = is_hidden
  const { data, error } = await supabase
   .from('products')
   .update(updates)
   .eq('id', productId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog(approve? 'approve_product' : (is_hidden? 'hide_product' : 'reject_product'), 'product', productId, {})
  return data
}

// ==========================================
// دوال الطلبات (معدلة)
// ==========================================
export const getOrdersForAdmin = async () => {
  const { data, error } = await supabase
   .from('orders')
   .select('*, product:products(title, name), buyer:profiles!orders_user_id_fkey(full_name, email)')
   .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(order => ({
   ...order,
    commission: (order.total_amount || 0) * 0.1,
    product: order.product? {...order.product, title: order.product.name || order.product.title } : null
  }))
}

export const reviewReceipt = async (orderId, approved, notes = '') => {
  const paymentStatus = approved? 'paid' : 'failed'
  const orderStatus = approved? 'payment_approved' : 'cancelled'
  const { data, error } = await supabase
   .from('orders')
   .update({ payment_status: paymentStatus, status: orderStatus, receipt_notes: notes })
   .eq('id', orderId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog(approved? 'approve_receipt' : 'reject_receipt', 'order', orderId, { notes })
  return data
}

// ==========================================
// دوال المالية (محافظ البائعين، طلبات السحب، العمولات)
// ==========================================
export const getSellerWallet = async () => {
  // ✅ استخدام id للترتيب بدلاً من created_at
  const { data, error } = await supabase
   .from('seller_wallets')
   .select('*, seller:profiles(full_name)')
   .order('id', { ascending: false })
  if (error) {
    console.warn('seller_wallets table not found, returning mock data')
    const { data: sellers } = await supabase.from('profiles').select('id, full_name').eq('account_type', 'seller')
    return (sellers || []).map(s => ({
      seller_id: s.id,
      seller_name: s.full_name,
      pending_balance: 0,
      available_balance: 0,
      withdrawn_total: 0
    }))
  }
  return data
}

export const getWithdrawalRequests = async () => {
  const { data, error } = await supabase
   .from('withdrawal_requests')
   .select('*, seller:profiles(full_name)')
   .order('created_at', { ascending: false })
  if (error) {
    console.warn('withdrawal_requests table not found, returning empty array')
    return []
  }
  return data
}

export const processWithdrawal = async (requestId, approved, transactionId = null) => {
  const updates = { status: approved? 'completed' : 'rejected' }
  if (transactionId) updates.transaction_id = transactionId
  const { data, error } = await supabase
   .from('withdrawal_requests')
   .update(updates)
   .eq('id', requestId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog(approved? 'approve_withdrawal' : 'reject_withdrawal', 'withdrawal_request', requestId, { transactionId })
  return data
}

export const getPlatformCommissions = async ({ start, end } = {}) => {
  let query = supabase
   .from('orders')
   .select('*, seller:profiles!orders_seller_id_fkey(full_name)')
   .eq('status', 'completed')
  if (start) query = query.gte('created_at', new Date(start).toISOString())
  if (end) query = query.lte('created_at', new Date(end).toISOString())
  const { data, error } = await query
  if (error) throw error

  const sellerMap = new Map()
  for (const order of data) {
    const sellerId = order.seller_id
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, {
        seller_id: sellerId,
        seller_name: order.seller?.full_name || 'غير معروف',
        total_sales: 0,
        commission_amount: 0,
        commission_rate: 10
      })
    }
    const seller = sellerMap.get(sellerId)
    seller.total_sales += order.total_amount || 0
    seller.commission_amount += (order.total_amount || 0) * 0.1
  }
  return Array.from(sellerMap.values())
}

// ==========================================
// إدارة إيصالات تحويل البائعين
// ==========================================
export const addSellerReceipt = async (sellerId, amount, receiptImageUrl, notes = '') => {
  const { data, error } = await supabase
   .from('seller_transfers')
   .insert({
      seller_id: sellerId,
      amount: amount,
      receipt_image: receiptImageUrl,
      notes: notes
    })
   .select()
   .single();

  if (error) throw error;
  await addAuditLog('add_seller_receipt', 'seller_transfer', data.id, { sellerId, amount });
  return data;
};

export const getSellerReceipts = async (sellerId) => {
  const { data, error } = await supabase
   .from('seller_transfers')
   .select('*')
   .eq('seller_id', sellerId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getSellerFinanceSummary = async (sellerId) => {
  // إجمالي المبيعات (من الطلبات المكتملة)
  const { data: salesData, error: salesError } = await supabase
   .from('orders')
   .select('total_amount')
   .eq('seller_id', sellerId)
   .eq('status', 'completed');

  if (salesError) throw salesError;
  const totalSales = salesData.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // إجمالي المرتجعات (من الطلبات ذات return_status = 'approved')
  const { data: returnsData, error: returnsError } = await supabase
   .from('orders')
   .select('total_amount')
   .eq('seller_id', sellerId)
   .eq('return_status', 'approved');

  const totalReturns = returnsError? 0 : returnsData.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // إجمالي الاستلامات (من seller_transfers)
  const { data: receiptsData, error: receiptsError } = await supabase
   .from('seller_transfers')
   .select('amount')
   .eq('seller_id', sellerId);

  const totalReceived = receiptsError? 0 : receiptsData.reduce((sum, r) => sum + (r.amount || 0), 0);

  // إجمالي المتبقي = إجمالي المبيعات - إجمالي المرتجعات - إجمالي الاستلامات
  const remainingBalance = totalSales - totalReturns - totalReceived;

  return {
    total_sales: totalSales,
    total_returns: totalReturns,
    total_received: totalReceived,
    remaining_balance: remainingBalance
  };
};

// ==========================================
// دوال النزاعات
// ==========================================
export const getDisputes = async () => {
  const { data, error } = await supabase
   .from('disputes')
   .select('*, order:orders(*), buyer:profiles!disputes_buyer_id_fkey(full_name), seller:profiles!disputes_seller_id_fkey(full_name)')
   .order('created_at', { ascending: false })
  if (error) {
    console.warn('disputes table not found, returning empty array')
    return []
  }
  return data
}

export const resolveDispute = async (disputeId, resolution, notes = '') => {
  const { data, error } = await supabase
   .from('disputes')
   .update({ status: 'resolved', resolution, notes })
   .eq('id', disputeId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog('resolve_dispute', 'dispute', disputeId, { resolution, notes })
  return data
}

// ==========================================
// دوال التسويق
// ==========================================
export const getCoupons = async () => {
  const { data, error } = await supabase
   .from('coupons')
   .select('*')
   .order('created_at', { ascending: false })
  if (error) {
    console.warn('coupons table not found, returning mock data')
    return [
      { id: 1, code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, expiry_date: new Date(Date.now() + 30 * 86400000), is_active: true },
      { id: 2, code: 'SAVE50', discount_type: 'fixed', discount_value: 50, expiry_date: new Date(Date.now() + 15 * 86400000), is_active: true }
    ]
  }
  return data
}

export const createCoupon = async (couponData) => {
  const { data, error } = await supabase
   .from('coupons')
   .insert(couponData)
   .select()
   .single()
  if (error) throw error
  await addAuditLog('create_coupon', 'coupon', data.id, couponData)
  return data
}

export const getBanners = async () => {
  const { data, error } = await supabase
   .from('banners')
   .select('*')
   .order('order', { ascending: true })
  if (error) {
    console.warn('banners table not found, returning empty array')
    return []
  }
  return data
}

export const updateBanner = async (bannerId, data) => {
  const { data: updated, error } = await supabase
   .from('banners')
   .update(data)
   .eq('id', bannerId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog('update_banner', 'banner', bannerId, data)
  return updated
}

export const getFeaturedProducts = async () => {
  const { data, error } = await supabase
   .from('products')
   .select('*, seller:profiles(full_name)')
   .eq('is_featured', true)
   .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(p => ({...p, title: p.name, seller_name: p.seller?.full_name }))
}

export const toggleFeatured = async (productId, featured) => {
  const { data, error } = await supabase
   .from('products')
   .update({ is_featured: featured })
   .eq('id', productId)
   .select()
   .single()
  if (error) throw error
  await addAuditLog(featured? 'add_featured' : 'remove_featured', 'product', productId, {})
  return data
}

export const getFlashSales = async () => {
  const { data, error } = await supabase
   .from('flash_sales')
   .select('*')
   .order('created_at', { ascending: false })
  if (error) {
    console.warn('flash_sales table not found, returning empty array')
    return []
  }
  return data
}

export const createFlashSale = async (saleData) => {
  const { data, error } = await supabase
   .from('flash_sales')
   .insert(saleData)
   .select()
   .single()
  if (error) throw error
  await addAuditLog('create_flash_sale', 'flash_sale', data.id, saleData)
  return data
}

// ==========================================
// دوال الإعدادات العامة والصلاحيات
// ==========================================
export const getSettings = async () => {
  const { data, error } = await supabase
   .from('settings')
   .select('*')
   .single()
  if (error) {
    console.warn('settings table not found, returning default settings')
    return { platform_name: 'سوقنا', currency: 'SAR', default_language: 'ar', logo_url: '/logo.png' }
  }
  return data
}

export const updateSettings = async (settingsData) => {
  const { data, error } = await supabase
   .from('settings')
   .upsert(settingsData)
   .select()
   .single()
  if (error) throw error
  await addAuditLog('update_settings', 'settings', 1, settingsData)
  return data
}

export const getRoles = async () => {
  const { data, error } = await supabase
   .from('roles')
   .select('*, role_permissions(permission)')
  if (error) {
    console.warn('roles table not found, returning default roles')
    return [
      { id: 1, name: 'Super Admin', permissions: ['all'] },
      { id: 2, name: 'Product Manager', permissions: ['manage_products'] },
      { id: 3, name: 'Finance Manager', permissions: ['manage_finance'] },
      { id: 4, name: 'Support Agent', permissions: ['manage_disputes'] }
    ]
  }
  return data.map(role => ({...role, permissions: role.role_permissions.map(rp => rp.permission) }))
}

export const updateRole = async (roleId, permissions) => {
  const { error: deleteError } = await supabase
   .from('role_permissions')
   .delete()
   .eq('role_id', roleId)
  if (deleteError) throw deleteError
  const newPerms = permissions.map(perm => ({ role_id: roleId, permission: perm }))
  if (newPerms.length) {
    const { error: insertError } = await supabase
     .from('role_permissions')
     .insert(newPerms)
    if (insertError) throw insertError
  }
  await addAuditLog('update_role', 'role', roleId, { permissions })
  return { success: true }
}

// ==========================================
// دوال النسخ الاحتياطي وتصدير التقارير
// ==========================================
export const backupDatabase = async () => {
  console.log('Database backup requested')
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { success: true, url: null }
}

export const exportReport = async (type, format, dateRange) => {
  let data = []
  if (type === 'commissions') {
    data = await getPlatformCommissions(dateRange)
  } else if (type === 'audit') {
    data = await getAuditLogs()
  } else if (type === 'summary') {
    data = [await getAdminStats()]
  }
  let csv = ''
  if (format === 'csv' && data.length) {
    const headers = Object.keys(data[0])
    csv = headers.join(',') + '\n'
    for (const row of data) {
      csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n'
    }
  }
  return csv
}

// ==========================================
// دوال سجل العمليات
// ==========================================
export const addAuditLog = async (action, targetType, targetId, details) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
   .from('audit_logs')
   .insert({ admin_id: user.id, action, target_type: targetType, target_id: targetId, details: JSON.stringify(details), ip_address: null })
  if (error) console.error('Audit log error:', error)
}

export const getAuditLogs = async () => {
  const { data, error } = await supabase
   .from('audit_logs')
   .select('*, admin:profiles(full_name, email)')
   .order('created_at', { ascending: false })
   .limit(200)
  if (error) throw error
  return data
}

// ==========================================
// دوال المبيعات الشهرية (معدلة)
// ==========================================
export const getMonthlySalesAll = async () => {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      start: date,
      name: date.toLocaleString('ar', { month: 'long' }),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    })
  }
  const results = []
  for (const month of months) {
    const { data, error } = await supabase
     .from('orders')
     .select('total_amount')
     .eq('status', 'completed')
     .gte('created_at', month.start.toISOString())
     .lte('created_at', month.end.toISOString())
    const sales = error? 0 : data.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    results.push({ name: month.name, sales })
  }
  return results
}

