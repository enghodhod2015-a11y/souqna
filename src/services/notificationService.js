import { supabase } from './supabase'

export let audioCtx = null;

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const enableAudio = async () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;
  if (!audioCtx) audioCtx = new AudioContext();
  await audioCtx.resume();
  return audioCtx.state === 'running';
};

export const playNotificationSound = async () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  await audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 0.3;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 800;
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

export const addNotification = async (userId, type, title, message, relatedId = null) => {
  const { data, error } = await supabase.rpc('add_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_related_id: relatedId !== null ? String(relatedId) : null,
    p_related_order_id: relatedId !== null ? Number(relatedId) : null
  });
  if (error) throw error;
  return data;
};

// ✅ improved getUserNotifications with retry logic
export const getUserNotifications = async (userId, retryCount = 0) => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 500;
  try {
    // 1. الحصول على العدد الحقيقي للإشعارات غير المقروءة
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (countError) throw countError;

    // 2. الحصول على أحدث 50 إشعاراً
    const { data: recent, error: recentError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (recentError) throw recentError;

    return {
      notifications: recent || [],
      unreadCount: count || 0
    };
  } catch (error) {
    // إذا كان الخطأ بسبب قطع الاتصال (ERR_CONNECTION_CLOSED) أو الشبكة، نحاول إعادة المحاولة
    if ((error.message?.includes('Connection closed') || error.message?.includes('Failed to fetch')) && retryCount < MAX_RETRIES) {
      console.warn(`⚠️ فشل جلب الإشعارات، إعادة المحاولة ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return getUserNotifications(userId, retryCount + 1);
    }
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
};


