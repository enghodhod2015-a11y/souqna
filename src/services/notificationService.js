import { supabase } from './supabase'

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

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
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

// ✅ تعديل: relatedId اختياري (يمكن أن يكون null أو integer)
export const addNotification = async (userId, type, title, message, relatedId = null) => {
  const insertData = {
    user_id: userId,
    type,
    title,
    message,
    is_read: false
  }
  // فقط إذا كان relatedId رقماً (ليس UUID) نضيفه
  if (relatedId && typeof relatedId === 'number') {
    insertData.related_id = relatedId
  }
  // إذا كان relatedId من نوع string (مثل UUID) نضيفه في حقل related_id? لا، لأنه integer. نتجاهله.
  
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
    .limit(20)
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

export const unsubscribeFromPush = async () => {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    if (error) console.error(error)
  }
}

