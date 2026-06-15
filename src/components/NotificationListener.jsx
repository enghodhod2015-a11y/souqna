import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { playNotificationSound, audioCtx, enableAudio } from '../services/notificationService';

export const NotificationListener = ({ children }) => {
  const { user } = useAuth();
  const lastNotifIdRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // إلغاء القناة السابقة إذا كانت موجودة
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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
        console.log('🎵 audioCtx state:', audioCtx ? audioCtx.state : 'null');
        console.log('🔔 Notification.permission:', Notification.permission);

        if (!audioCtx && Notification.permission === 'granted') {
          await enableAudio();
        }

        if (Notification.permission === 'granted') {
          const notification = new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/logo192.png'
          });
          notification.onclick = () => {
            window.focus();
            if (newNotif.related_id) {
              window.location.href = `/chat/c/${newNotif.related_id}`;
            }
          };
        }
        await playNotificationSound();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [NotificationListener] مشترك في القناة بنجاح');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return children;
};


