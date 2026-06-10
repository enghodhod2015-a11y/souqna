import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getOrCreateConversation, sendMessage, getMessages, markMessagesAsRead } from '../services/chatService'
import { getProductById } from '../services/productService'
import { supabase } from '../services/supabase' 
import { Button } from '../components/ui/Button'
import { Send, CheckCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'

// دالة للتحقق من صحة UUID
const isValidUUID = (id) => {
  if (!id) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id.toString())
}

export default function ChatPage() {
  const { productId, conversationId } = useParams() 
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const [product, setProduct] = useState(null)
  const channelRef = useRef(null)
  // متغيرات لتخزين أسماء الأطراف
  const [buyerName, setBuyerName] = useState('')
  const [sellerName, setSellerName] = useState('')

  useEffect(() => {
    if (user) initChat()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [productId, conversationId, user])

  const initChat = async () => {
    try {
      setLoading(true)
      let currentConv = null
      let currentProduct = null

      if (conversationId) {
        if (!isValidUUID(conversationId)) {
          console.error('معرف المحادثة غير صالح (ليس UUID):', conversationId)
          toast.error('رابط المحادثة غير صالح')
          navigate('/inbox')
          return
        }
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single()
        if (convErr) throw convErr
        currentConv = convData
        if (currentConv.product_id) {
          currentProduct = await getProductById(currentConv.product_id)
        }
      } 
      else if (productId) {
        currentProduct = await getProductById(productId)
        if (!currentProduct) throw new Error('المنتج غير موجود')
        const buyerId = user.id
        const sellerId = currentProduct.seller_id
        if (buyerId === sellerId) {
          toast.error('لا يمكنك مراسلة نفسك!')
          navigate('/')
          return
        }
        currentConv = await getOrCreateConversation(productId, buyerId, sellerId)
      }

      setProduct(currentProduct)
      setConversation(currentConv)

      if (currentConv) {
        // جلب أسماء المشتري والبائع
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentConv.buyer_id)
          .single()
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentConv.seller_id)
          .single()
        setBuyerName(buyerProfile?.full_name || 'مشتري')
        setSellerName(sellerProfile?.full_name || 'بائع')

        const msgs = await getMessages(currentConv.id)
        setMessages(msgs || [])
        await markMessagesAsRead(currentConv.id, user.id)
        const updatedMsgs = await getMessages(currentConv.id)
        setMessages(updatedMsgs || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل المحادثة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!conversation?.id || !user?.id) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        if (payload?.new) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          if (payload.new.receiver_id === user.id) {
            markMessagesAsRead(conversation.id, user.id).then(() => {
              setMessages(prev => prev.map(m => 
                m.id === payload.new.id ? { ...m, is_read: true } : m
              ))
            })
          }
        }
      })
      .subscribe()

    const readChannel = supabase
      .channel(`read:${conversation.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        if (payload.new && payload.new.is_read === true) {
          setMessages(prev => prev.map(m => 
            m.id === payload.new.id ? { ...m, is_read: true } : m
          ))
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(readChannel)
      channelRef.current = null
    }
  }, [conversation?.id, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation) return
    setSending(true)
    const messageText = newMessage.trim()
    const tempId = Date.now()
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: user.id,
      receiver_id: conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    try {
      const sent = await sendMessage(conversation.id, user.id, optimisticMessage.receiver_id, messageText)
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m))
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/inbox')
  }

  if (loading) return <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
  
  const isAdminChat = conversation && !product && !productId && conversation.product_id === null
  const isBuyer = conversation?.buyer_id === user?.id
  const chatPartnerRole = isBuyer ? 'البائع' : 'المشتري المحتمل'
  const pageTitle = isAdminChat ? '💬 محادثة مع الإدارة' : `💬 محادثة مع: ${chatPartnerRole}`
  const productInfo = isAdminChat ? null : product

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gold/40 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gold/30 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
              {pageTitle}
            </h2>
            {productInfo && (
              <p className="text-sm text-gray-600 mt-1">بخصوص منتج: <span className="text-gold font-medium">{productInfo.title}</span></p>
            )}
            {isAdminChat && (
              <p className="text-sm text-gray-600 mt-1">هذه محادثة مع فريق الدعم والإدارة</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
            title="إغلاق"
          >
            <X size={24} />
          </button>
        </div>

        <div className="h-[500px] overflow-y-auto p-5 space-y-4 bg-gray-50">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user.id
            // تحديد اسم المرسل
            let senderDisplayName = ''
            if (msg.sender_id === conversation?.buyer_id) senderDisplayName = buyerName
            else if (msg.sender_id === conversation?.seller_id) senderDisplayName = sellerName
            else senderDisplayName = 'مستخدم'

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-fadeIn`}
              >
                <div className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                  {isOwn ? 'أنت' : senderDisplayName}
                </div>
                <div
                  className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm transition-all ${
                    isOwn
                      ? 'bg-gold text-gray-900 rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                  }`}
                >
                  <p className="text-base break-words leading-relaxed">{msg.message}</p>
                  <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${isOwn ? 'text-gray-700/70' : 'text-gray-500'}`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isOwn && msg.is_read && <CheckCheck size={14} className="text-blue-500" />}
                    {isOwn && !msg.is_read && <span className="text-gray-400">✓</span>}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gold/30 bg-white">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 px-5 py-3 rounded-full bg-gray-100 text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && !sending && handleSend()}
            />
            <Button
              onClick={handleSend}
              disabled={sending}
              className="!rounded-full !px-5 !py-3 bg-gold text-gray-900 hover:bg-amber-500 transition-all duration-200 shadow-md flex items-center gap-2"
            >
              <Send size={18} />
              <span>إرسال</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


