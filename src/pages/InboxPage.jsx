import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserConversations } from '../services/chatService';
import { supabase } from '../services/supabase';
import { useAbortController } from '../hooks/useAbortController';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortController = useAbortController();

  const markAllMessagesAsRead = async () => {
    if (!user) return;

    try {
      const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      if (convError) throw convError;

      if (!convs || convs.length === 0) return;

      const conversationIds = convs.map(c => c.id);

      const { error: msgError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .in('conversation_id', conversationIds);
      if (msgError) throw msgError;

      const updates = [];
      for (const conv of convs) {
        const updateData = {};
        const { data: convData } = await supabase
          .from('conversations')
          .select('buyer_id, seller_id')
          .eq('id', conv.id)
          .single();
        if (convData) {
          if (convData.buyer_id === user.id) updateData.buyer_unread_count = 0;
          if (convData.seller_id === user.id) updateData.seller_unread_count = 0;
          if (Object.keys(updateData).length) {
            updates.push(
              supabase
                .from('conversations')
                .update(updateData)
                .eq('id', conv.id)
            );
          }
        }
      }
      await Promise.all(updates);

      setConversations(prev =>
        prev.map(conv => {
          const isBuyer = conv.buyer_id === user.id;
          const updatedConv = { ...conv };
          if (isBuyer) updatedConv.buyer_unread_count = 0;
          else updatedConv.seller_unread_count = 0;
          return updatedConv;
        })
      );

      console.log('✅ تم تعليم جميع الرسائل كمقروءة');
    } catch (err) {
      if (err?.code === 'PGRST303' || err?.message?.includes('JWT expired')) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }
      console.error('خطأ في تعليم الرسائل كمقروءة:', err);
      toast.error('حدث خطأ أثناء تحديث حالة القراءة');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await getUserConversations(user.id);
        if (isMounted) setConversations(data || []);
      } catch (err) {
        if (isMounted) console.error('Error loading inbox conversations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (user?.id) loadConversations();
    return () => {
      isMounted = false;
      abortController?.abort();
    };
  }, [user?.id, abortController]);

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      markAllMessagesAsRead();
    }
  }, [loading, conversations]);

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">المحادثات</h1>
        <button
          onClick={markAllMessagesAsRead}
          className="px-3 py-1 text-sm bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition"
        >
          تعليم الكل كمقروء
        </button>
      </div>

      {conversations.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد محادثات بعد</p>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            if (!conv?.id) return null;
            const isBuyer = conv.buyer_id === user?.id;
            const unreadCount = isBuyer ? conv.buyer_unread_count : conv.seller_unread_count;
            const anonymousLabel = isBuyer ? 'البائع' : 'مشتري محتمل';
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
            );
          })}
        </div>
      )}
    </div>
  );
}


