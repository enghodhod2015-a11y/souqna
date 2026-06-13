import { supabase } from './supabase'

export const addReview = async (productId, userId, rating, comment, orderId = null) => {
  if (rating < 1 || rating > 5) {
    throw new Error('التقييم يجب أن يكون بين 1 و 5')
  }
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      user_id: userId,
      rating,
      comment: comment?.trim() || null,
      order_id: orderId,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getProductReviews = async (productId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!reviews_user_id_fkey (full_name, avatar_url)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const getAverageRating = async (productId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
  if (error) throw error
  if (!data || data.length === 0) {
    return { average: 0, count: 0 }
  }
  const sum = data.reduce((acc, r) => acc + r.rating, 0)
  const average = sum / data.length
  return {
    average: Math.round(average * 10) / 10,
    count: data.length
  }
}

export const canUserReviewProduct = async (userId, productId) => {
  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      order_id,
      order:orders!inner (user_id, status)
    `)
    .eq('order.user_id', userId)
    .eq('order.status', 'completed')
    .eq('product_id', productId)
    .limit(1)
  if (error) {
    console.error('خطأ في التحقق من إمكانية المراجعة:', error)
    return false
  }
  if (!items || items.length === 0) return false

  const { data: existing, error: existingError } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existingError && existingError.code !== 'PGRST116') {
    console.error('خطأ في التحقق من المراجعة السابقة:', existingError)
  }
  return !existing
}

