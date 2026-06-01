import { supabase } from './supabase'

// طلب إذن الإشعارات من المستخدم
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('المتصفح لا يدعم الإشعارات')
    return false
  }
  if (Notification.permission === 'granted') {
    return true
  }
  if (Notification.permission === 'denied') {
    console.log('الإشعارات ممنوعة من قبل المستخدم')
    return false
  }
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// تشغيل صوت الإشعار (مع ملف احتياطي)
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      // إذا فشل تشغيل الصوت (ملف غير موجود)، استخدم صوت تنبيه بسيط عبر Web Audio API
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.frequency.value = 800
        gain.gain.value = 0.3
        oscillator.start()
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5)
        oscillator.stop(audioContext.currentTime + 0.5)
        audioContext.close()
      } catch (e) {
        console.log('تعذر تشغيل الصوت:', e)
      }
    })
  } catch (err) {
    console.log('خطأ في تشغيل الصوت:', err)
  }
}

// إرسال إشعار داخلي (يُضاف إلى جدول notifications)
export const addNotification = async (userId, type, title, message, relatedId) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,   // ✅ استخدام related_id الموجود في الجدول
      is_read: false
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// جلب إشعارات المستخدم
export const getUserNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

// تعليم الإشعار كمقروء
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}

// إلغاء الاشتراك من Push Notifications (غير مستخدم حالياً)
export const unsubscribeFromPush = async () => {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    // حذف الاشتراك من قاعدة البيانات إن وجد
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    if (error) console.error(error)
  }
}


