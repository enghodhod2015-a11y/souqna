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

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
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
    })
  } catch (err) { console.log('خطأ في تشغيل الصوت:', err) }
}

// CHANGED: تحويل type إلى القيم المسموحة: info, success, warning, error
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
  if (relatedId !== null && !isNaN(Number(relatedId))) {
    insertData.related_id = Number(relatedId)
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


