import { supabase } from './supabase'

export const getProducts = async (filters = {}) => {
  try {
    // 1. بناء الاستعلام الأساسي مع جلب اسم البائع
    let query = supabase
      .from('products')
      .select('*, seller:profiles(full_name)')
      .eq('is_hidden', false)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    // 2. تطبيق الفلاتر بأمان
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)

    const { data, error } = await query

    // 3. التحقق من وجود خطأ قادم من Supabase
    if (error) {
      console.error("❌ Supabase getProducts Error:", error.message)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("⚠️ فشل جلب البيانات بالربط، جاري تشغيل خطة الطوارئ البديلة:", error)
    
    /* 
      💡 خطة الطوارئ البديلة (Fallback):
      إذا فشل الربط بسبب جدول الحسابات profiles، سنقوم بجلب المنتجات 
      وحدها بدون اسم البائع حتى لا يتعطل الموقع وتظهر المنتجات للمستخدم!
    */
    try {
      console.log("🔄 جاري محاولة جلب المنتجات بشكل مستقل دون جدول profiles...");
      let fallbackQuery = supabase
        .from('products')
        .select('*')
        .eq('is_hidden', false)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      if (filters.category) fallbackQuery = fallbackQuery.eq('category', filters.category)
      
      const { data: fallbackData } = await fallbackQuery
      return fallbackData || []
    } catch (fallbackErr) {
      console.error("❌ فشل كامل في الاتصال بقاعدة البيانات:", fallbackErr)
      return [] // إرجاع مصفوفة فارغة لإنهاء حالة الـ Loading فوراً في كل الأحوال
    }
  }
}


export const getSellerProducts = async (sellerId) => {
  const { data, error } = await supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProductById = async (id) => {
  // الجديد هنا: تم حذف حقل city من علاقة profiles لأن المدينة تُجلب تلقائياً من جدول المنتجات الأساسي
  const { data, error } = await supabase.from('products').select('*, seller:profiles(full_name)').eq('id', id).single()
  if (error) throw error
  return data
}

export const addProduct = async (productData) => {
  const { data, error } = await supabase.from('products').insert([productData]).select().single()
  if (error) throw error
  return data
}

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  return true
}

export const uploadProductImages = async (files, productId) => {
  const urls = []
  for (const file of files) {
    const fileName = `${productId}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
    urls.push(publicUrl)
  }
  return urls
}






