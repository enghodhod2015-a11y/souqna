import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, requestNotificationPermission } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // طلب الإذن للإشعارات عند تحميل التطبيق (إذا لم يمنح بعد)
    requestNotificationPermission();

    // الاستماع للإشعارات الجديدة الخاصة بهذا المستخدم
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const newNotif = payload.new;
        if (!newNotif) return;

        // تشغيل الصوت
        playNotificationSound();

        // عرض إشعار المتصفح
        if (Notification.permission === 'granted') {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/logo192.png',
          });
        } else {
          // في حال عدم الإذن، نعرض تنبيه باستخدام toast (اختياري)
          toast(`${newNotif.title}: ${newNotif.message}`, {
            icon: '🔔',
            duration: 5000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return children;
};

