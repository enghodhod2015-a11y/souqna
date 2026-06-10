import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  const pendingNotifRef = useRef(null);

  const requestPermissionAndNotify = async (notif) => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/logo192.png',
        silent: false,
      });
      pendingNotifRef.current = null;
    } else {
      toast.error('لا يمكن عرض الإشعارات، يرجى تفعيلها من إعدادات المتصفح', { icon: '🔕' });
    }
  };

  useEffect(() => {
    if (!user) return;

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
        if (lastNotifIdRef.current === newNotif.id) return;
        lastNotifIdRef.current = newNotif.id;

        console.log('🔔 [NotificationListener] إشعار جديد:', newNotif);

        // تشغيل الصوت دائماً (حتى لو لم يُمنح إذن الإشعارات)
        try {
          playNotificationSound();
          console.log('🎵 تم تشغيل الصوت');
        } catch (err) {
          console.error('فشل تشغيل الصوت:', err);
        }

        // إشعار المتصفح
        if (Notification.permission === 'granted') {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/logo192.png',
            silent: false,
          });
        } else if (Notification.permission === 'default') {
          // حفظ الإشعار لطلبه لاحقاً
          pendingNotifRef.current = newNotif;
          toast(
            (t) => (
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gold">تفعيل الإشعارات</span>
                <span className="text-sm">لتصلك التنبيهات الصوتية والبصرية</span>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    requestPermissionAndNotify(newNotif);
                  }}
                  className="mt-1 px-3 py-1 bg-gold text-primary-blue rounded-lg text-sm font-bold"
                >
                  تفعيل الآن
                </button>
              </div>
            ),
            { duration: 10000, icon: '🔔' }
          );
        }
        // إذا كان 'denied' لا نفعل شيئاً
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return children;
};



