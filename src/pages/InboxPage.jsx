import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserConversations } from '../services/chatService'
import { MessageCircle } from 'lucide-react'

export default function InboxPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [user])

  const loadConversations = async () => {
    try {
      const data = await getUserConversations(user.id)
      setConversations(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gold mb-6">المحادثات</h1>
      {conversations.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد محادثات بعد</p>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer
            const unreadCount = conv.buyer_id === user.id ? conv.buyer_unread_count : conv.seller_unread_count
            return (
              <Link to={`/chat/${conv.product_id}/${otherUser.id}`} key={conv.id}>
                <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:border-gold transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{conv.product?.title}</h3>
                      <p className="text-text-secondary text-sm">مع: {otherUser.full_name}</p>
                      <p className="text-sm text-text-secondary truncate">{conv.last_message || 'بدء المحادثة'}</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}