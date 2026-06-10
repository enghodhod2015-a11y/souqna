import { supabase } from './supabase'

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('المتصفح لا يدعم الإشعارات')
    return false
  }
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// سيتم تشغيل هذه الدالة بعد تفعيل الصوت (عبر نقرة المستخدم)
let audioContext = null;
export const playNotificationSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // نستأنف السياق (مطلوب بعد تفعيل المستخدم)
    audioContext.resume().then(() => {
      const gain = audioContext.createGain();
      gain.gain.value = 0.3;
      gain.connect(audioContext.destination);
      const oscillator = audioContext.createOscillator();
      oscillator.connect(gain);
      oscillator.frequency.value = 800;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      // لا نغلق السياق، نتركه مفتوحاً للإشعارات القادمة
    }).catch(err => console.log('خطأ في استئناف السياق الصوتي:', err));
  } catch (err) {
    console.log('خطأ في تشغيل الصوت:', err);
  }
};

const mapType = (type) => {
  switch (type) {
    case 'message':
    case 'inquiry':
      return 'info'
    case 'payment':
    case 'order_status':
    case 'return':
      return 'success'
    default:
      return 'info'
  }
}

export const addNotification = async (userId, type, title, message, relatedId = null) => {
  const mappedType = mapType(type)
  const insertData = {
    user_id: userId,
    type: mappedType,
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString()
  }
  if (relatedId !== null) {
    insertData.related_id = String(relatedId)
  }
  const { data, error } = await supabase
    .from('notifications')
    .insert(insertData)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getUserNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}


