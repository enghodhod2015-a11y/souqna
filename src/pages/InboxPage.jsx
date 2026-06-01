import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserConversations } from '../services/chatService'

export default function InboxPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadConversations = async () => {
      try {
        setLoading(true)
        const data = await getUserConversations(user.id)
        if (isMounted) setConversations(data || [])
      } catch (err) {
        if (isMounted) console.error("Error loading inbox conversations:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    if (user?.id) loadConversations()
    return () => { isMounted = false }
  }, [user?.id])

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gold mb-6">المحادثات</h1>
      {conversations.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد محادثات بعد</p>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            if (!conv?.id) return null
            const isBuyer = conv.buyer_id === user?.id
            const unreadCount = isBuyer ? conv.buyer_unread_count : conv.seller_unread_count
            const anonymousLabel = isBuyer ? "البائع" : "مشتري محتمل"
            return (
              <Link to={`/chat/c/${conv.id}`} key={conv.id}>
                <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:border-gold transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gold">{conv.product?.title || 'منتج غير متوفر'}</h3>
                      <p className="text-text-secondary text-sm">الطرف الآخر: {anonymousLabel}</p>
                      <p className="text-sm text-text-secondary mt-1 truncate max-w-md">
                        {conv.last_message || 'بدء المحادثة'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
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


