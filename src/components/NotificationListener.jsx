import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, enableAudio, requestNotificationPermission } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  const notifAllowedRef = useRef(localStorage.getItem('notif_allowed') === 'true');
  const audioAllowedRef = useRef(localStorage.getItem('audio_allowed') === 'true');

  const setNotifAllowed = (val) => {
    notifAllowedRef.current = val;
    localStorage.setItem('notif_allowed', val);
  };
  const setAudioAllowed = (val) => {
    audioAllowedRef.current = val;
    localStorage.setItem('audio_allowed', val);
  };

  const handleActivation = async (notif) => {
    // طلب إذن الإشعارات
    if (!notifAllowedRef.current) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifAllowed(true);
        toast.success('✅ تم تفعيل الإشعارات');
        new Notification(notif.title, { body: notif.message, icon: '/logo192.png' });
      } else {
        toast.error('❌ لا يمكن عرض الإشعارات');
      }
    }
    // تفعيل الصوت
    if (!audioAllowedRef.current) {
      const enabled = await enableAudio();
      if (enabled) {
        setAudioAllowed(true);
        toast.success('🔊 تم تفعيل الصوت');
        playNotificationSound(); // تشغيل تجريبي
      } else {
        toast.error('❌ تعذر تفعيل الصوت');
      }
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

        // إذا كان كل شيء مفعلاً مسبقاً -> شغل مباشرة
        if (notifAllowedRef.current && audioAllowedRef.current) {
          if (Notification.permission === 'granted')
            new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
          playNotificationSound();
        }
        // إذا لم يفعّل بعد -> أظهر زر التفعيل (مرة واحدة فقط في العمر)
        else if (!notifAllowedRef.current || !audioAllowedRef.current) {
          // نعرض رسالة تطلب التفعيل – لن تظهر بعد التفعيل لأنه سيتم حفظ الحالة في localStorage
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
                    if (notifAllowedRef.current) {
                      new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
                    }
                    if (audioAllowedRef.current) playNotificationSound();
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


