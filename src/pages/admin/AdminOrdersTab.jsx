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
          toast.error('⚠ هذه الصفحة مخصصة للأدمن فقط، سيتم توجيهك');
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
          const { data: products, error: prodError } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
          if (prodError) {
            console.error('خطأ في جلب المنتجات:', prodError);
          } else if (products) {
            productsMap = new Map(products.map(p => [p.id, p]));
            const missingProducts = productIds.filter(id =>!productsMap.has(id));
            if (missingProducts.length > 0) {
              console.warn('⚠ منتجات غير موجودة في قاعدة البيانات:', missingProducts);
            }
          }
        }

        const userIds = [...new Set([
        ...conversations.map(c => c.buyer_id),
        ...conversations.map(c => c.seller_id)
        ].filter(Boolean))];
        let profilesMap = new Map();
        if (userIds.length) {
          const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
          if (!profError && profiles) {
            profilesMap = new Map(profiles.map(p => [p.id, p]));
          }
        }

        const conversationIds = conversations.map(c => c.id);
        const lastMessageMap = new Map();
        for (const convId of conversationIds) {
          const { data: msgData } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1);
          if (msgData && msgData.length > 0) {
            lastMessageMap.set(convId, {
              sender_id: msgData[0].sender_id,
              created_at: msgData[0].created_at
            });
          }
        }

        const enrichedConversations = conversations.map(conv => {
          const lastMsg = lastMessageMap.get(conv.id);
          let status = 'لا توجد رسائل';
          let statusColor = 'text-gray-500';

          if (lastMsg) {
            if (lastMsg.sender_id === conv.seller_id) {
              status = 'تم الرد من البائع';
              statusColor = 'text-green-500';
            } else {
              status = 'في انتظار رد البائع';
              statusColor = 'text-yellow-500';
            }
          }

          const product = productsMap.get(conv.product_id) || null;
          if (conv.product_id &&!product) {
            console.warn(`⚠ المحادثة ${conv.id} لها product_id=${conv.product_id} ولكن المنتج غير موجود`);
          }

          return {
          ...conv,
            product,
            buyer: profilesMap.get(conv.buyer_id) || null,
            seller: profilesMap.get(conv.seller_id) || null,
            last_message_sender_id: lastMsg?.sender_id,
            last_message_date: lastMsg?.created_at,
            status,
            statusColor
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

  const sendNotificationToUser = async (userId, message, title = 'إشعار من الإدارة', type = 'info', relatedId = null) => {
    const { data: { user: adminUser } = await supabase.auth.getUser();
    const adminId = adminUser.id;
    let conversationId = null;

    const { data: existingList, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${adminId},seller_id.eq.${userId}`)
    .limit(1);

    if (findError) {
      console.error('خطأ في البحث عن المحادثة:', findError);
      toast.error('فشل البحث عن محادثة');
      return;
    }

    if (existingList && existingList.length > 0) {
      conversationId = existingList[0].id;
      await supabase
      .from('conversations')
      .update({ last_message: message, last_message_at: new Date() })
      .eq('id', conversationId);
    } else {
      const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
          buyer_id: adminId,
          seller_id: userId,
          product_id: relatedId || null,
          last_message: message,
          last_message_at: new Date()
        })
      .select()
      .single();

      if (insertError) {
        console.error('خطأ في إنشاء المحادثة:', insertError);
        toast.error('فشل إنشاء محادثة جديدة');
        return;
      }
      conversationId = newConv.id;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: type,
        title,
        message,
        related_id: conversationId.toString(),
      });
    } catch (notifErr) {
      console.error('خطأ في إدراج الإشعار:', notifErr);
    }

    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: adminId,
      receiver_id: userId,
      message,
    });

    if (msgError) {
      console.error('خطأ في إدراج الرسالة:', msgError);
      toast.error('فشل إرسال الرسالة، لكن الإشعار قد يصل');
    } else {
      toast.success('تم إرسال الإشعار والرسالة بنجاح');
    }
  };

  const sendReminderForConversation = async (conv, targetRole) => {
    const targetUserId = targetRole === 'seller'? conv.seller_id : conv.buyer_id;
    const targetName = targetRole === 'seller'? conv.seller?.full_name : conv.buyer?.full_name;

    const { data: lastMessageData, error: msgError } = await supabase
    .from('messages')
    .select(`
        message,
        created_at,
        sender_id,
        profiles!messages_sender_id_fkey ( full_name )
      `)
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(1);

    let lastMessageText = 'لا توجد رسائل سابقة في هذه المحادثة';
    if (!msgError && lastMessageData && lastMessageData.length > 0) {
      const lastMsg = lastMessageData[0];
      const senderName = lastMsg.profiles?.full_name || 'مستخدم';
      const formattedDate = new Date(lastMsg.created_at).toLocaleString('ar', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      lastMessageText = `📝 ${senderName} (${formattedDate}): ${lastMsg.message}`;
    }

    const adminMessage = prompt(
      `📢 إرسال تذكير إلى: ${targetName || (targetRole === 'seller'? 'البائع' : 'المشتري')}\n\n` +
      `🔄 آخر رسالة في هذه المحادثة:\n${lastMessageText}\n\n` +
      `✏ رسالة التذكير (اكتب هنا):`
    );
    if (!adminMessage) return;

    const productName = conv.product?.name || (conv.product_id? 'منتج محذوف' : 'بدون منتج');
    const fullReminderMessage = `📌 **تذكير من الإدارة**\n\n` +
                                `🔄 **آخر رسالة في المحادثة:**\n${lastMessageText}\n\n` +
                                `✉ **رسالة الإدارة:** ${adminMessage}`;

    await sendNotificationToUser(
      targetUserId,
      fullReminderMessage,
      `تذكير بخصوص المحادثة (${productName})`,
      'message',
      conv.id
    );
  };

  if (!checked) {
    return <div className="text-center py-20 text-text-secondary">جاري التحقق من الصلاحيات...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-2">⛔ غير مصرح بالوصول</p>
        <p className="text-text-secondary text-sm">هذه الصفحة مخصصة للأدمن فقط</p>
        <Button onClick={() => window.location.href = '/'} className="mt-4">العودة للرئيسية</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="w-48 h-8 rounded-lg" />
          <Skeleton className="w-24 h-10 rounded-lg" />
        </div>
        {[1, 2, 3].map(i => <SkeletonConversationItem key={i} />)}
      </div>
    );
  }

  const exportData = conversations.map(conv => ({
    'المنتج': conv.product?.name || (conv.product_id? 'منتج محذوف' : 'بدون منتج'),
    'المشتري': conv.buyer?.full_name || conv.buyer_name || 'غير معروف',
    'البائع': conv.seller?.full_name || conv.seller_name || 'غير معروف',
    'آخر رسالة': conv.last_message || 'لا توجد رسائل',
    'التاريخ': conv.last_message_at? formatDate(conv.last_message_at) : '-',
    'الحالة': conv.status,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-gold">المحادثات بين المستخدمين</h2>
        <div className="flex gap-2">
          <ExportButtons
            data={exportData}
            filename="conversations_report"
            title="تقرير المحادثات"
            columns={[
              { header: 'المنتج', dataKey: 'المنتج' },
              { header: 'المشتري', dataKey: 'المشتري' },
              { header: 'البائع', dataKey: 'البائع' },
              { header: 'آخر رسالة', dataKey: 'آخر رسالة' },
              { header: 'التاريخ', dataKey: 'التاريخ' },
              { header: 'الحالة', dataKey: 'الحالة' }
            ]}
            showCSV
          />
          <Button onClick={() => refetchConversations()} className="bg-gray-700 hover:bg-gray-600 text-white shadow-md rounded-lg px-4 py-2 text-sm flex items-center gap-1">
            <RefreshCw size={14} /> تحديث
          </Button>
        </div>
      </div>

      {!conversations || conversations.length === 0? (
        <div className="bg-primary-card rounded-2xl shadow-lg border-gold/20 p-6 text-center">
          <p className="text-text-secondary mb-2">⚠ لا توجد محادثات معروضة.</p>
          <p className="text-sm text-gold">تأكد من أن الأدمن يملك صلاحية رؤية جميع المحادثات. قم بتشغيل الأمر التالي في SQL Editor في Supabase:</p>
          <pre className="bg-gray-900 text-white text-right p-3 rounded-md mt-2 overflow-x-auto text-sm">
            {`CREATE POLICY "Admins can view all conversations" ON conversations
  FOR SELECT USING (auth.role() = 'authenticated');`}
          </pre>
        </div>
      ) : (
        <div className="bg-primary-card rounded-2xl shadow-lg border border-gold/20 overflow-x-auto">
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
                <tr key={conv.id} className="border-b border-gold/20 hover:bg-secondary-blue/10 transition">
                  <td className="p-3 text-white">
                    {conv.product?.name || (conv.product_id? '⚠ منتج محذوف' : 'بدون منتج')}
                  </td>
                  <td className="p-3 text-white">{conv.buyer?.full_name || conv.buyer_name || 'غير معروف'}</td>
                  <td className="p-3 text-white">{conv.seller?.full_name || conv.seller_name || 'غير معروف'}</td>
                  <td className="p-3 text-white max-w-xs truncate">{conv.last_message || 'لا توجد رسائل'}</td>
                  <td className="p-3 text-white">{conv.last_message_at? formatDate(conv.last_message_at) : '-'}</td>
                  <td className="p-3 text-white">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${conv.statusColor} ${conv.status === 'تم الرد من البائع'? 'bg-green-900/30' : 'bg-yellow-900/30'}`}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link to={`/chat/c/${conv.id}`} state={{ fromAdminOrders: true }} className="bg-[#0b2f5c] text-white px-3 py-1 rounded-lg text-sm shadow hover:bg-[#041C3A] transition inline-flex items-center gap-1">
                        <MessageCircle size={14} /> فتح المحادثة
                      </Link>
                      {conv.status === 'في انتظار رد البائع' && (
                        <Button onClick={() => sendReminderForConversation(conv, 'seller')} className="bg-[#D4AF37] hover:bg-[#E8C84A] text-[#041C3A] px-3 py-1 rounded-lg text-sm shadow inline-flex items-center gap-1">
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
      )}
    </div>
  );
}



