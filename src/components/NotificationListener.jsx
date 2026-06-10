import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, enableAudio, requestNotificationPermission } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  
  // استخدم دالة مساعدة لقراءة localStorage بأمان
  const isActivated = () => {
    try {
      return localStorage.getItem('notifications_activated') === 'true';
    } catch(e) { return false; }
  };
  const setActivated = () => {
    try {
      localStorage.setItem('notifications_activated', 'true');
    } catch(e) {}
  };
  
  const activatedRef = useRef(isActivated());

  const handleActivation = async (notif) => {
    // طلب الإذن للإشعارات
    const granted = await requestNotificationPermission();
    if (granted) {
      // تفعيل الصوت
      await enableAudio();
      setActivated();
      activatedRef.current = true;
      toast.success('✅ تم تفعيل الإشعارات والصوت');
      if (notif && Notification.permission === 'granted') {
        new Notification(notif.title, { body: notif.message, icon: '/logo192.png' });
      }
      playNotificationSound();
    } else {
      toast.error('❌ لم يتم تفعيل الإشعارات، يمكنك المحاولة لاحقاً من إعدادات المتصفح');
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

        console.log('🔔 إشعار جديد:', newNotif);

        if (activatedRef.current) {
          // مفعل مسبقاً -> شغل الصوت والإشعار
          if (Notification.permission === 'granted')
            new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
          playNotificationSound();
        } else {
          // لم يفعّل بعد -> أظهر زر التفعيل (مرة واحدة فقط)
          toast(
            (t) => (
              <div className="flex flex-col gap-2 rtl">
                <span className="font-bold text-gold">🔔 تفعيل التنبيهات</span>
                <span className="text-sm">لسماع الصوت ورؤية الإشعارات</span>
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await handleActivation(newNotif);
                    // بعد التفعيل، حاول إظهار إشعار هذه الرسالة
                    if (activatedRef.current) {
                      if (Notification.permission === 'granted')
                        new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
                      playNotificationSound();
                    }
                  }}
                  className="mt-1 px-4 py-2 bg-gold text-primary-blue rounded-lg font-bold"
                >
                  تفعيل الآن
                </button>
              </div>
            ),
            { duration: 20000, icon: '🔔' }
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return children;
};


