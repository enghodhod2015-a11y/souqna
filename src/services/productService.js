import { supabase } from './supabase'

// دالة مساعدة لإصلاح روابط الصور
const fixImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://utmhjbeyrwohrvfobibl.supabase.co'
  if (url.startsWith('/')) {
    return `${supabaseUrl}/storage/v1/object/public/product-images${url}`
  }
  return `${supabaseUrl}/storage/v1/object/public/product-images/${url}`
}

// استبدل دالة getProducts بهذه النسخة:
export const getProducts = async (filters = {}, signal = null) => {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_hidden', false)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.ilike('name', '%' + filters.search + '%')

    // ✅ دعم الإلغاء
    const { data: products, error } = signal 
      ? await query.abortSignal(signal)
      : await query

    if (error) throw error

    if (products?.length) {
      const sellerIds = [...new Set(products.map(p => p.seller_id))].filter(Boolean)
      if (sellerIds.length) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', sellerIds)
        if (sellers) {
          const sellersMap = Object.fromEntries(sellers.map(s => [s.id, s]))
          products.forEach(p => { p.seller = sellersMap[p.seller_id] || null })
        }
      }
      products.forEach(p => {
        p.title = p.name
        if (p.compare_at_price && p.compare_at_price > p.price) {
          p.discount_percentage = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
          p.final_price = p.price
        } else {
          p.discount_percentage = 0
          p.final_price = p.price
        }
        if (p.cover_image) p.cover_image = fixImageUrl(p.cover_image)
        if (p.images && Array.isArray(p.images)) {
          p.images = p.images.map(img => fixImageUrl(img)).filter(Boolean)
        }
      })
    }
    return products || []
  } catch (error) {
    if (error.name === 'AbortError') throw error
    console.error('⚠️ فشل جلب المنتجات:', error)
    return []
  }
}

// باقي الدوال بدون تغيير
export const getSellerProducts = async (sellerId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const dataWithTitle = (data || []).map(p => ({
      ...p,
      title: p.name,
      final_price: p.price,
      discount_percentage: 0,
      cover_image: fixImageUrl(p.cover_image),
      images: p.images ? p.images.map(img => fixImageUrl(img)).filter(Boolean) : []
    }))
    return dataWithTitle
  } catch (error) {
    console.error('❌ فشل جلب منتجات البائع:', error)
    return []
  }
}

export const getProductById = async (id) => {
  try {
    if (!id || id === 'undefined') throw new Error('معرف المنتج غير صالح')
    const numericId = parseInt(id, 10)
    if (isNaN(numericId)) throw new Error('معرف المنتج يجب أن يكون رقماً')
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', numericId)
      .single()
    if (error) throw error
    if (product?.seller_id) {
      const { data: seller } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, city')
        .eq('id', product.seller_id)
        .maybeSingle()
      if (seller) product.seller = seller
    }
    if (product) {
      product.title = product.name
      if (product.compare_at_price && product.compare_at_price > product.price) {
        product.discount_percentage = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        product.final_price = product.price
      } else {
        product.discount_percentage = 0
        product.final_price = product.price
      }
      product.cover_image = fixImageUrl(product.cover_image)
      if (product.images) product.images = product.images.map(img => fixImageUrl(img)).filter(Boolean)
    }
    return product
  } catch (error) {
    console.error('❌ فشل جلب المنتج:', error)
    throw error
  }
}

export const addProduct = async (productData) => {
  try {
    const { title, discount_percentage, final_price, contact_number, ...rest } = productData
    const cleanData = { ...rest, name: title || rest.name }
    const { data, error } = await supabase
      .from('products')
      .insert([cleanData])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ فشل إضافة المنتج:', error)
    throw error
  }
}

export const updateProduct = async (id, updates) => {
  try {
    const { title, discount_percentage, final_price, contact_number, ...rest } = updates
    const cleanUpdates = { ...rest }
    if (title) cleanUpdates.name = title
    const { data, error } = await supabase
      .from('products')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ فشل تحديث المنتج:', error)
    throw error
  }
}

export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ فشل حذف المنتج:', error)
    throw error
  }
}

export const uploadProductImages = async (files, productId) => {
  try {
    const urls = []
    for (const file of files) {
      const fileName = `${productId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
      urls.push(data.publicUrl)
    }
    return urls
  } catch (error) {
    console.error('❌ فشل رفع الصور:', error)
    throw error
  }
}

