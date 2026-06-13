import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import { SkeletonConversationItem, Skeleton } from '../../components/ui/Skeleton';

export default function AdminOrdersTab({ navigate }) {
  const { data: conversations = [], refetch: refetchConversations, isLoading } = useQuery({
    queryKey: ['adminConversations'],
    queryFn: async () => {
      // ... نفس الكود الأصلي ...
    },
    staleTime: 1 * 60 * 1000,
  });

  // ... دوال sendNotificationToUser, sendReminderForConversation ...

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

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-gold">المحادثات بين المستخدمين</h2>
        <Button onClick={() => refetchConversations()} className="bg-gray-700 hover:bg-gray-600 text-white shadow-md rounded-lg px-4 py-2 text-sm flex items-center gap-1">
          <RefreshCw size={14} /> تحديث
        </Button>
      </div>

      {!conversations || conversations.length === 0 ? (
        // ... نفس الرسالة ...
      ) : (
        <div className="bg-primary-card rounded-2xl shadow-lg border border-gold/20 overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gold/30 bg-secondary-blue/30">
                <th className="p-3 text-gold">المنتج</th><th className="p-3 text-gold">المشتري</th>
                <th className="p-3 text-gold">البائع</th><th className="p-3 text-gold">آخر رسالة</th>
                <th className="p-3 text-gold">التاريخ</th><th className="p-3 text-gold">الحالة</th>
                <th className="p-3 text-gold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(conv => (
                // ... عرض الصفوف ...
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

