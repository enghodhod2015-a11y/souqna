import { supabase } from './supabase'

// إضافة منتج إلى المفضلة
export const addToWishlist = async (userId, productId) => {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .single()
  if (error) throw error
  return data
}

// إزالة منتج من المفضلة
export const removeFromWishlist = async (userId, productId) => {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw error
  return true
}

// التحقق مما إذا كان المنتج مفضلاً لدى المستخدم
export const isProductInWishlist = async (userId, productId) => {
  const { data, error } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// جلب قائمة المنتجات المفضلة للمستخدم (مع تفاصيل المنتج)
export const getUserWishlist = async (userId) => {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      product_id,
      product:products (
        id,
        name,
        price,
        compare_at_price,
        cover_image,
        seller_id,
        seller:profiles!products_seller_id_fkey (full_name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  // تنسيق البيانات لإضافة title و final_price
  return (data || []).map(item => {
    const p = item.product
    if (!p) return null
    let finalPrice = p.price
    let discountPercentage = 0
    if (p.compare_at_price && p.compare_at_price > p.price) {
      discountPercentage = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
      finalPrice = p.price
    }
    return {
      id: p.id,
      title: p.name,
      price: p.price,
      final_price: finalPrice,
      discount_percentage: discountPercentage,
      cover_image: p.cover_image,
      seller_name: p.seller?.full_name || 'بائع',
      added_at: item.created_at
    }
  }).filter(Boolean)
}

