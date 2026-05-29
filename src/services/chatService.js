import { supabase } from './supabase'

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

