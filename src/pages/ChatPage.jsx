import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getOrCreateConversation, sendMessage, getMessages, markMessagesAsRead } from '../services/chatService'
import { getProductById } from '../services/productService'
import { supabase } from '../services/supabase' 
import { Button } from '../components/ui/Button'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'

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

  useEffect(() => {
    if (user) initChat()
  }, [productId, conversationId, user])

  const initChat = async () => {
    try {
      setLoading(true)
      let currentConv = null
      let currentProduct = null

      if (conversationId) {
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
        const msgs = await getMessages(currentConv.id)
        setMessages(msgs || [])
        await markMessagesAsRead(currentConv.id, user.id)
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
            markMessagesAsRead(conversation.id, user.id)
          }
        }
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
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

  if (loading) return <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
  if (!product) return <div className="text-center py-20 text-gray-500">المنتج غير موجود</div>

  const isBuyer = conversation?.buyer_id === user?.id
  const chatPartnerRole = isBuyer ? 'البائع' : 'المشتري المحتمل'

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gold/40 shadow-xl overflow-hidden">
        {/* رأس المحادثة */}
        <div className="p-5 border-b border-gold/30 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
            💬 محادثة مع: {chatPartnerRole}
          </h2>
          <p className="text-sm text-gray-600 mt-1">بخصوص منتج: <span className="text-gold font-medium">{product?.title}</span></p>
        </div>

        {/* منطقة الرسائل */}
        <div className="h-[500px] overflow-y-auto p-5 space-y-4 bg-gray-50">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user.id
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm transition-all ${
                    isOwn
                      ? 'bg-gold text-gray-900 rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                  }`}
                >
                  <p className="text-base break-words leading-relaxed">{msg.message}</p>
                  <div className={`text-xs mt-1 ${isOwn ? 'text-gray-700/70' : 'text-gray-500'} text-left`}>
                    {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* شريط إرسال الرسالة */}
        <div className="p-4 border-t border-gold/30 bg-white">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك بخصوص المنتج..."
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


