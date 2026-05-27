import { supabase } from './supabase'

// ==========================================
// خدمات المنتجات (productService)
// ==========================================

export const getProducts = async (filters = {}) => {
  try {
    let query = supabase
      .from('products')
      .select('*, seller:profiles(full_name)')
      .eq('is_hidden', false)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("⚠️ فشل جلب البيانات بالربط، جاري تشغيل خطة الطوارئ البديلة:", error)
    try {
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
      console.error("❌ فشل كامل في قاعدة البيانات:", fallbackErr)
      return []
    }
  }
}

export const getSellerProducts = async (sellerId) => {
  const { data, error } = await supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProductById = async (id) => {
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

// ==========================================
// خدمات المحادثات (chatService)
// ==========================================

export const getOrCreateConversation = async (productId, buyerId, sellerId) => {
  let { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('product_id', productId)
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { data: newConv, error: insertError } = await supabase
    .from('conversations')
    .insert({ product_id: productId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single()
  if (insertError) throw insertError
  return newConv
}

export const sendMessage = async (conversationId, senderId, receiverId, message) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, receiver_id: receiverId, message })
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('conversations')
    .update({ last_message: message, last_message_at: new Date() })
    .eq('id', conversationId)

  return data
}

export const getMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const getUserConversations = async (userId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, product:products(title, cover_image), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
  if (error) throw error
  return data
}

export const markMessagesAsRead = async (conversationId, userId) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

