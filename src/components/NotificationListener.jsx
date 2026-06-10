import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, requestNotificationPermission } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // طلب الإذن للإشعارات عند تحميل التطبيق (إذا لم يمنح بعد)
    requestNotificationPermission().then(granted => {
      if (!granted) {
        console.warn('إذن الإشعارات لم يُمنح');
      }
    });

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

        // ✅ تشغيل الصوت (بنفس طريقة chatService)
        try {
          playNotificationSound(); // هذه الدالة تستخدم new Audio أو AudioContext
        } catch (err) {
          console.error('فشل تشغيل الصوت:', err);
        }

        // ✅ عرض إشعار المتصفح
        if (Notification.permission === 'granted') {
          // نافذة الإشعار تظهر مع اسم التطبيق
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/logo192.png',
            silent: false, // يسمح بالصوت (لكن الصوت يعتمد على المتصفح)
          });
        } else {
          // محاولة طلب الإذن مرة أخرى إذا لم يكن ممنوحًا
          const permission = await requestNotificationPermission();
          if (permission) {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/logo192.png',
            });
          } else {
            // إشعار عبر toast
            toast(`${newNotif.title}: ${newNotif.message}`, {
              icon: '🔔',
              duration: 5000,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [user]);

  return children;
};


