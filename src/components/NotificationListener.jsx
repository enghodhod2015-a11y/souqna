// src/components/NotificationListener.jsx
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound } from '../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  const isAudioAllowedRef = useRef(localStorage.getItem('audio_allowed') === 'true');
  const isNotifAllowedRef = useRef(localStorage.getItem('notif_allowed') === 'true');

  // دالة لحفظ حالة التفعيل
  const setAudioAllowed = (value) => {
    isAudioAllowedRef.current = value;
    localStorage.setItem('audio_allowed', value);
  };
  const setNotifAllowed = (value) => {
    isNotifAllowedRef.current = value;
    localStorage.setItem('notif_allowed', value);
  };

  const requestNotificationPermission = async (notif) => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifAllowed(true);
      toast.success('✅ تم تفعيل الإشعارات');
      if (notif) {
        new Notification(notif.title, { body: notif.message, icon: '/logo192.png' });
      }
      return true;
    } else {
      toast.error('❌ لم يتم تفعيل الإشعارات');
      return false;
    }
  };

  const enableAudio = () => {
    if (isAudioAllowedRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      ctx.resume().then(() => {
        setAudioAllowed(true);
        toast.success('🔊 تم تفعيل الصوت');
        ctx.close();
      }).catch(() => {});
    } else {
      setAudioAllowed(true);
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

        // إذا كان التفعيل مسبقاً، شغل الصوت والإشعار مباشرة
        if (isAudioAllowedRef.current && isNotifAllowedRef.current) {
          playNotificationSound();
          if (Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.message, icon: '/logo192.png' });
          }
        } else {
          // عرض رسالة تفعيل (مرة واحدة فقط)
          toast(
            (t) => (
              <div className="flex flex-col gap-2 rtl">
                <span className="font-bold text-gold">🔔 تفعيل التنبيهات</span>
                <span className="text-sm">اضغط للسماح بالإشعارات والصوت</span>
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    if (!isNotifAllowedRef.current) {
                      await requestNotificationPermission(newNotif);
                    }
                    if (!isAudioAllowedRef.current) {
                      enableAudio();
                    }
                    // بعد التفعيل، حاول تشغيل الإشعار الحالي
                    if (isNotifAllowedRef.current && newNotif) {
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
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return children;
};

