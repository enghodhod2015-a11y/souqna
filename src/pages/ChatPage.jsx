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
          .select('*, product:products(*)')
          .eq('id', conversationId)
          .single()
        if (convErr) throw convErr 
        currentConv = convData
        currentProduct = convData?.product
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
          // ✅ تجنب إضافة الرسالة إذا كانت موجودة بالفعل (لحالة الإضافة المحلية)
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
    // ✅ إضافة الرسالة محلياً فوراً
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
      // استبدال الرسالة المؤقتة بالرسالة الحقيقية (للتأكد من id الصحيح)
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m))
    } catch (err) {
      // في حالة الخطأ، قم بإزالة الرسالة المؤقتة
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-text-secondary">جاري التحميل...</div>
  if (!product) return <div className="text-center py-20 text-text-secondary">المنتج غير موجود</div>

  const isBuyer = conversation?.buyer_id === user?.id
  const chatPartnerRole = isBuyer ? 'البائع' : 'المشتري المحتمل'

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-primary-card rounded-2xl border border-gold/30 overflow-hidden">
        <div className="p-4 border-b border-gold/30 bg-secondary-blue/20 flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gold">محادثة مع: {chatPartnerRole}</h2>
          <p className="text-sm text-text-secondary">بخصوص منتج: {product?.title}</p>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-lg px-4 py-2 ${msg.sender_id === user.id ? 'bg-gold text-primary-blue' : 'bg-secondary-blue text-white'}`}>
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gold/30 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك بخصوص المنتج..."
            className="flex-1 px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white focus:outline-none focus:border-gold"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={sending}>
            <Send size={18} /> إرسال
          </Button>
        </div>
      </div>
    </div>
  )
}

