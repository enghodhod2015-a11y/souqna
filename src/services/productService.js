import { supabase } from './supabase'

export const getProducts = async (filters = {}) => {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_hidden', false)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.ilike('name', '%' + filters.search + '%')  // ✅ name بدلاً من title

    const { data: products, error } = await query
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
    }
    return products || []
  } catch (error) {
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
    // ✅ إضافة اسم مستعار title ليتوافق مع الـ UI الذي يتوقع title
    const dataWithTitle = (data || []).map(p => ({ ...p, title: p.name }))
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
    console.log("🔍 جلب المنتج بالرقم:", numericId)
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', numericId)
      .single()
    if (error) throw error
    console.log("✅ المنتج المستلم:", product)
    if (product?.seller_id) {
      const { data: seller } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, city')
        .eq('id', product.seller_id)
        .maybeSingle()
      if (seller) product.seller = seller
    }
    // ✅ إضافة اسم مستعار title و final_price
    if (product) {
      product.title = product.name
      if (product.compare_at_price && product.compare_at_price > product.price) {
        product.discount_percentage = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      } else {
        product.discount_percentage = 0
      }
      product.final_price = product.price
    }
    return product
  } catch (error) {
    console.error('❌ فشل جلب المنتج:', error)
    throw error
  }
}

export const addProduct = async (productData) => {
  try {
    // تحويل title إلى name
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
    // تحويل title إلى name إذا وجد
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