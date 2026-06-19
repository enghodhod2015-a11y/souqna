import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import { SkeletonConversationItem, Skeleton } from '../../components/ui/Skeleton';
import { ExportButtons } from '../../components/ui/ExportButtons';
import { isCurrentUserAdmin } from '../../services/adminGuard';

export default function AdminOrdersTab({ navigate }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          toast.error('⚠️ هذه الصفحة مخصصة للأدمن فقط، سيتم توجيهك');
          setTimeout(() => {
            if (navigate) navigate('/');
          }, 2000);
        }
      } catch (err) {
        console.error('خطأ في التحقق من صلاحية الأدمن:', err);
      } finally {
        setChecked(true);
      }
    };
    checkAdmin();
  }, [navigate]);

  const { data: conversations = [], refetch: refetchConversations, isLoading } = useQuery({
    queryKey: ['adminConversations'],
    queryFn: async () => {
      if (!isAdmin) return [];

      try {
        const { data: conversations, error: convError } = await supabase
         .from('conversations')
         .select('*')
         .order('last_message_at', { ascending: false });
        if (convError) throw convError;
        if (!conversations || conversations.length === 0) return [];

        const productIds = [...new Set(conversations.map(c => c.product_id).filter(Boolean))];
        let productsMap = new Map();
        if (productIds.length) {
          const { data: products } = await supabase
           .from('products')
           .select('id, name')
           .in('id', productIds);
          productsMap = new Map(products?.map(p => [p.id, p]) || []);
        }

        const userIds = [...new Set([
         ...conversations.map(c => c.buyer_id),
         ...conversations.map(c => c.seller_id)
        ].filter(Boolean))];
        let profilesMap = new Map();
        if (userIds.length) {
          const { data: profiles } = await supabase
           .from('profiles')
           .select('id, full_name, email, account_type') // أضفت account_type
           .in('id', userIds);
          profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        }

        // جلب آخر رسالة + sender_type
        const conversationIds = conversations.map(c => c.id);
        const lastMessageMap = new Map();

        for (const convId of conversationIds) {
          const { data: msgData } = await supabase
           .from('messages')
           .select('sender_id, created_at, sender_type') // أضفت sender_type
           .eq('conversation_id', convId)
           .order('created_at', { ascending: false })
           .limit(1);
          if (msgData && msgData.length > 0) {
            lastMessageMap.set(convId, {
              sender_id: msgData[0].sender_id,
              sender_type: msgData[0].sender_type, // حفظ نوع المرسل
              created_at: msgData[0].created_at
            });
          }
        }

        const enrichedConversations = conversations.map(conv => {
          const lastMsg = lastMessageMap.get(conv.id);
          let status = 'في انتظار رد البائع';
          let statusColor = 'text-yellow-500';
          let shouldShowReminder = false;

          if (lastMsg) {
            if (lastMsg.sender_id === conv.seller_id) {
              status = 'تم الرد من البائع';
              statusColor = 'text-green-500';
              shouldShowReminder = false;
            } else {
              status = 'في انتظار رد البائع';
              statusColor = 'text-yellow-500';
              shouldShowReminder = true; // هنا الشرط الصحيح
            }
          } else {
            status = 'لا توجد رسائل';
            statusColor = 'text-gray-500';
            shouldShowReminder = false;
          }

          return {
           ...conv,
            product: productsMap.get(conv.product_id) || null,
            buyer: profilesMap.get(conv.buyer_id) || null,
            seller: profilesMap.get(conv.seller_id) || null,
            last_message_sender_id: lastMsg?.sender_id,
            last_message_sender_type: lastMsg?.sender_type,
            last_message_date: lastMsg?.created_at,
            status,
            statusColor,
            shouldShowReminder // استخدم هذا في الـ UI
          };
        });

        return enrichedConversations;
      } catch (err) {
        console.error('خطأ في جلب المحادثات:', err);
        return [];
      }
    },
    enabled: isAdmin,
    staleTime: 1 * 60 * 1000,
  });

  // دالة فتح المحادثة وتجيب الرسائل مع بيانات المرسل
  const openChat = async (convId) => {
    const { data: messages, error } = await supabase
     .from('messages')
     .select(`
        id,
        message,
        sender_type,
        created_at,
        sender:profiles!messages_sender_id_fkey (id, full_name, account_type)
      `)
     .eq('conversation_id', convId)
     .order('created_at', { ascending: true });

    if (error) {
      toast.error('فشل جلب الرسائل');
      return;
    }

    // افتح المودال أو انقل المستخدم لصفحة الشات مع تمرير الرسائل
    console.log(messages); // استخدمها في المودال عندك
    navigate(`/chat/c/${convId}`, { state: { messages } });
  };

  const sendReminderForConversation = async (conv, targetRole) => {
    const targetUserId = targetRole === 'seller'? conv.seller_id : conv.buyer_id;
    const targetName = targetRole === 'seller'? conv.seller?.full_name : conv.buyer?.full_name;

    const { data: lastMessageData } = await supabase
     .from('messages')
     .select(`
        message,
        created_at,
        sender_id,
        profiles!messages_sender_id_fkey ( full_name, account_type )
      `)
     .eq('conversation_id', conv.id)
     .order('created_at', { ascending: false })
     .limit(1);

    let lastMessageText = 'لا توجد رسائل سابقة في هذه المحادثة';
    if (lastMessageData && lastMessageData.length > 0) {
      const lastMsg = lastMessageData[0];
      const senderName = lastMsg.profiles?.full_name || 'مستخدم';
      const accountType = lastMsg.profiles?.account_type || '';
      const formattedDate = new Date(lastMsg.created_at).toLocaleString('ar', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      });
      lastMessageText = `📝 ${senderName} [${accountType}] (${formattedDate}): ${lastMsg.message}`;
    }

    const adminMessage = prompt(
      `📢 إرسال تذكير إلى: ${targetName || 'المستخدم'}\n\n` +
      `🔄 آخر رسالة:\n${lastMessageText}\n\n` +
      `✏️ رسالة التذكير:`
    );
    if (!adminMessage) return;

    // باقي كود الإرسال زي ما هو
    await sendNotificationToUser(targetUserId, adminMessage, `تذكير بخصوص المحادثة`, 'message', conv.id);
  };

  if (!checked) {
    return <div className="text-center py-20 text-text-secondary">جاري التحقق من الصلاحيات...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-900/20 border-red-500 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-2">⛔ غير مصرح بالوصول</p>
        <Button onClick={() => window.location.href = '/'} className="mt-4">العودة للرئيسية</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <SkeletonConversationItem key={i} />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-gold">المحادثات بين المستخدمين</h2>
        <Button onClick={() => refetchConversations()} className="bg-gray-700 hover:bg-gray-600 text-white">
          <RefreshCw size={14} /> تحديث
        </Button>
      </div>

      <div className="bg-primary-card rounded-2xl shadow-lg border-gold/20 overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-gold/30 bg-secondary-blue/30">
              <th className="p-3 text-gold">المنتج</th>
              <th className="p-3 text-gold">المشتري</th>
              <th className="p-3 text-gold">البائع</th>
              <th className="p-3 text-gold">آخر رسالة</th>
              <th className="p-3 text-gold">التاريخ</th>
              <th className="p-3 text-gold">الحالة</th>
              <th className="p-3 text-gold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map(conv => (
              <tr key={conv.id} className="border-b border-gold/20 hover:bg-secondary-blue/10">
                <td className="p-3 text-white">{conv.product?.name || 'بدون منتج'}</td>
                <td className="p-3 text-white">
                  {conv.buyer?.full_name || 'غير معروف'}
                  <span className="text-xs text-gray-400 block">{conv.buyer?.account_type}</span>
                </td>
                <td className="p-3 text-white">
                  {conv.seller?.full_name || 'غير معروف'}
                  <span className="text-xs text-gray-400 block">{conv.seller?.account_type}</span>
                </td>
                <td className="p-3 text-white max-w-xs truncate">{conv.last_message || 'لا توجد رسائل'}</td>
                <td className="p-3 text-white">{conv.last_message_at? formatDate(conv.last_message_at) : '-'}</td>
                <td className="p-3 text-white">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${conv.statusColor}`}>
                    {conv.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button onClick={() => openChat(conv.id)} className="bg-gold text-primary-blue px-3 py-1 rounded-lg text-sm">
                      <MessageCircle size={14} /> فتح المحادثة
                    </Button>

                    {/* الشرط المعدل: يظهر فقط لو آخر رسالة مش من البائع */}
                    {conv.shouldShowReminder && conv.seller_id && (
                      <Button onClick={() => sendReminderForConversation(conv, 'seller')}
                              className="bg-orange-600 hover:bg-orange-700">
                        <Send size={14} /> تذكير البائع
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}