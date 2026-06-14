import { supabase } from './supabase'

// استبدل دالة fixImageUrl الموجودة بهذه النسخة المحسنة
const fixImageUrl = (url, width = 400) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('supabase.co/storage')) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}width=${width}&format=webp`
    }
    return url
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://utmhjbeyrwohrvfobibl.supabase.co'
  let baseUrl
  if (url.startsWith('/')) {
    baseUrl = `${supabaseUrl}/storage/v1/object/public/product-images${url}`
  } else {
    baseUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${url}`
  }
  return `${baseUrl}?width=${width}&format=webp`
}

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
    if (filters.city) query = query.eq('city', filters.city)

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
        if (p.cover_image) p.cover_image = fixImageUrl(p.cover_image, 400)
        if (p.images && Array.isArray(p.images)) {
          p.images = p.images.map(img => fixImageUrl(img, 200)).filter(Boolean)
        }
      })
    }
    return products || []
  } catch (error) {
    if (error.name === 'AbortError') return []
    console.error('⚠️ فشل جلب المنتجات:', error)
    return []
  }
}

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
      cover_image: fixImageUrl(p.cover_image, 200),
      images: p.images ? p.images.map(img => fixImageUrl(img, 100)).filter(Boolean) : []
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
      .maybeSingle()
    
    if (error) throw error
    if (!product) return null
    
    if (product?.seller_id) {
      const { data: seller } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, city')
        .eq('id', product.seller_id)
        .maybeSingle()
      if (seller) product.seller = seller
    }
    
    product.title = product.name
    if (product.compare_at_price && product.compare_at_price > product.price) {
      product.discount_percentage = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      product.final_price = product.price
    } else {
      product.discount_percentage = 0
      product.final_price = product.price
    }
    product.cover_image = fixImageUrl(product.cover_image, 600)
    if (product.images) product.images = product.images.map(img => fixImageUrl(img, 200)).filter(Boolean)
    
    return product
  } catch (error) {
    console.error('❌ فشل جلب المنتج:', error)
    throw error
  }
}

// ✅ دالة addProduct المعدلة (تضمن وجود slug)
export const addProduct = async (productData) => {
  try {
    const { title, discount_percentage, final_price, contact_number, ...rest } = productData
    const name = title || rest.name
    
    // إنشاء slug من name إذا لم يتم توفيره
    let slug = rest.slug
    if (!slug && name) {
      slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    }
    
    const cleanData = {
      ...rest,
      name,
      slug,
      compare_at_price: rest.compare_at_price || null,
      stock_quantity: rest.stock_quantity || 0,
      category: rest.category || 'other',
      city: rest.city || '',
      condition: rest.condition || 'new',
      is_featured: rest.is_featured || false,
      is_hidden: rest.is_hidden !== undefined ? rest.is_hidden : false,
      is_approved: rest.is_approved !== undefined ? rest.is_approved : true,
      is_active: rest.is_active !== undefined ? rest.is_active : true,
      images: rest.images || [],
      cover_image: rest.cover_image || '',
      contact_number: rest.contact_number || null
    }
    
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

// ✅ إخفاء المنتج (Soft Delete)
export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ 
        is_hidden: true,
        is_approved: false
      })
      .eq('id', id)
    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ فشل إخفاء المنتج:', error)
    throw error
  }
}

// ✅ إعادة تنشيط منتج مخفي (Restore)
export const restoreProduct = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ 
        is_hidden: false,
        is_approved: true
      })
      .eq('id', id)
    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ فشل استعادة المنتج:', error)
    throw error
  }
}

export const uploadProductImages = async (files, productId, onProgress = null) => {
  try {
    const urls = []
    let completed = 0
    for (const file of files) {
      const fileName = `${productId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
      urls.push(data.publicUrl)
      completed++
      if (onProgress) {
        onProgress(Math.round((completed / files.length) * 100))
      }
    }
    return urls
  } catch (error) {
    console.error('❌ فشل رفع الصور:', error)
    throw error
  }
}

// ✅ تحديث مخزون منتج معين (زيادة أو نقصان)
export const updateProductStock = async (productId, quantityChange) => {
  if (!productId || typeof quantityChange !== 'number') {
    throw new Error('معرف المنتج وقيمة التغيير مطلوبة')
  }
  try {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single()
    if (fetchError) throw fetchError

    const newQuantity = Math.max(0, (product.stock_quantity || 0) + quantityChange)
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)
    if (updateError) throw updateError

    return newQuantity
  } catch (error) {
    console.error('❌ فشل تحديث مخزون المنتج:', error)
    throw error
  }
}


