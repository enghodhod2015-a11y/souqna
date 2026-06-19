import { supabase } from './supabase'
import { addNotification } from './notificationService'

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

  try {
    const { data: senderProfile } = await supabase
     .from('profiles')
     .select('full_name')
     .eq('id', senderId)
     .single()
    const senderName = senderProfile?.full_name || 'مستخدم'
    const shortMessage = message.length > 50? message.substring(0, 50) + '...' : message

    await addNotification(
      receiverId,
      'message',
      'رسالة جديدة',
      `${senderName} أرسل لك: ${shortMessage}`,
      conversationId
    )
  } catch (err) {
    console.error('خطأ في إضافة الإشعار:', err)
  }

  try {
    if (Notification.permission === 'granted') {
      const { data: senderProfile } = await supabase
       .from('profiles')
       .select('full_name')
       .eq('id', senderId)
       .single()
      const senderName = senderProfile?.full_name || 'مستخدم'
      new Notification('رسالة جديدة', {
        body: `${senderName}: ${message.substring(0, 100)}`,
        icon: '/logo192.png'
      })
    }
  } catch (err) { console.error('خطأ في إشعار المتصفح:', err) }

  const { data: senderFullProfile } = await supabase
   .from('profiles')
   .select('full_name, account_type')
   .eq('id', senderId)
   .single()

  return {...data, sender: senderFullProfile }
}

export const getMessages = async (conversationId) => {
  const { data, error } = await supabase
   .from('messages')
   .select(`
      *,
      sender:profiles!messages_sender_id_fkey(full_name, account_type)
    `)
   .eq('conversation_id', conversationId)
   .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const getUserConversations = async (userId) => {
  const { data: conversations, error } = await supabase
   .from('conversations')
   .select(`
      *,
      buyer:profiles!conversations_buyer_id_fkey(full_name),
      seller:profiles!conversations_seller_id_fkey(full_name)
    `)
   .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
   .order('last_message_at', { ascending: false })
  if (error) throw error

  const conversationsWithProduct = await Promise.all(
    (conversations || []).map(async (conv) => {
      if (!conv.product_id) return {...conv, product: null }
      const { data: product, error: prodError } = await supabase
       .from('products')
       .select('id, name, cover_image, seller_id')
       .eq('id', conv.product_id)
       .maybeSingle()
      if (prodError) return {...conv, product: null }
      const productWithTitle = product? {...product, title: product.name } : null
      return {...conv, product: productWithTitle }
    })
  )
  return conversationsWithProduct
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

