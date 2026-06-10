import { supabase } from './supabase'

export let audioCtx = null;   // تم التصدير للاختبار

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export const enableAudio = async () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return false
  if (!audioCtx) audioCtx = new AudioContext()
  await audioCtx.resume()
  return audioCtx.state === 'running'
}

export const playNotificationSound = () => {
  if (!audioCtx) return
  audioCtx.resume().then(() => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    gain.gain.value = 0.3
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 800
    osc.start()
    osc.stop(audioCtx.currentTime + 0.3)
  }).catch(() => {})
}

const mapType = (type) => {
  switch (type) {
    case 'message': case 'inquiry': return 'info'
    case 'payment': case 'order_status': case 'return': return 'success'
    default: return 'info'
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
  if (relatedId !== null) insertData.related_id = String(relatedId)
  const { data, error } = await supabase.from('notifications').insert(insertData).select().single()
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


