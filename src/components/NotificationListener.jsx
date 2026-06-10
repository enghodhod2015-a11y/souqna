import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, requestNotificationPermission } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    let channel = null;

    const init = async () => {
      // طلب الإذن للإشعارات (مرة واحدة عند تحميل التطبيق)
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.warn('⚠️ إذن الإشعارات لم يُمنح، لن تظهر إشعارات المتصفح');
      }

      if (!isSubscribed) return;

      // استخدام قناة عامة مع مرشح user_id لضمان استقبال الأحداث
      channel = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newNotif = payload.new;
          if (!newNotif) return;

          console.log('🔔 [NotificationListener] تم استلام إشعار:', newNotif);

          // تشغيل الصوت (نفس الدالة التي تعمل عند الاستعلام)
          playNotificationSound();

          // عرض إشعار المتصفح (بشرط أن يكون الإذن ممنوحاً)
          if (Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/logo192.png',
            });
          } else {
            // محاولة طلب الإذن مجدداً (في حال تم رفضه سابقاً)
            requestNotificationPermission().then(perm => {
              if (perm && isSubscribed) {
                new Notification(newNotif.title, {
                  body: newNotif.message,
                  icon: '/logo192.png',
                });
              }
            });
          }
        })
        .subscribe((status) => {
          console.log(`📡 اشتراك الإشعارات: ${status}`);
        });
    };

    init();

    return () => {
      isSubscribed = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  return children;
};


