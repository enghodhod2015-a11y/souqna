// src/components/NotificationListener.jsx
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  const isAudioAllowedRef = useRef(false);
  const isNotificationAllowedRef = useRef(false);

  // دالة لطلب الإذن للإشعارات وتفعيل الصوت بعد تفاعل المستخدم
  const enableNotifications = async (notif = null) => {
    if (!isNotificationAllowedRef.current) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        isNotificationAllowedRef.current = true;
        toast.success('تم تفعيل الإشعارات', { icon: '✅' });
        if (notif) {
          new Notification(notif.title, { body: notif.message, icon: '/logo192.png' });
        }
      } else {
        toast.error('لا يمكن عرض الإشعارات، يرجى تفعيلها يدوياً في إعدادات المتصفح', { icon: '🔕' });
        return false;
      }
    }
    return true;
  };

  const enableAudio = () => {
    if (!isAudioAllowedRef.current) {
      // محاولة تشغيل صوت قصير جداً لتفعيل AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.1;
      gain.connect(audioCtx.destination);
      const oscillator = audioCtx.createOscillator();
      oscillator.connect(gain);
      oscillator.frequency.value = 440;
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
      audioCtx.resume().then(() => {
        isAudioAllowedRef.current = true;
        toast.success('تم تفعيل الصوت', { icon: '🔊' });
      }).catch(() => {});
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

        // عرض رسالة للمستخدم لتفعيل الإشعارات والصوت (إذا لم يفعّل من قبل)
        if (!isNotificationAllowedRef.current || !isAudioAllowedRef.current) {
          toast(
            (t) => (
              <div className="flex flex-col gap-2 rtl">
                <span className="font-bold text-gold">🔔 تفعيل التنبيهات</span>
                <span className="text-sm">اضغط على الزر لتفعيل الصوت والإشعارات</span>
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    if (!isNotificationAllowedRef.current) {
                      await enableNotifications(newNotif);
                    }
                    if (!isAudioAllowedRef.current) {
                      enableAudio();
                    }
                    // إذا تم التفعيل، نحاول تشغيل الصوت وعرض الإشعار لهذه الرسالة
                    if (isNotificationAllowedRef.current && newNotif) {
                      new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
                    }
                    if (isAudioAllowedRef.current) {
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
        } else {
          // إذا كان مفعلاً مسبقاً، نشغل الصوت ونعرض الإشعار مباشرة
          if (isAudioAllowedRef.current) {
            playNotificationSound();
          }
          if (isNotificationAllowedRef.current && Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return children;
};

