import { supabase } from './supabase'

let audioCtx = null

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// تهيئة السياق الصوتي (لن يُنشأ إلا عند تفعيله بنقرة)
const initAudioContext = () => {
  if (audioCtx) return audioCtx
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  audioCtx = new AudioContext()
  return audioCtx
}

// تشغيل الصوت – يعمل فقط إذا كان السياق قد فُعِّل بنقرة سابقة
export const playNotificationSound = () => {
  try {
    const ctx = initAudioContext()
    if (!ctx) return
    // نستأنف السياق (آمن بعد تفعيل المستخدم)
    ctx.resume().then(() => {
      const gain = ctx.createGain()
      gain.gain.value = 0.3
      gain.connect(ctx.destination)
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.frequency.value = 800
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }).catch(e => console.log('صوت:', e))
  } catch (err) {
    console.log('خطأ في تشغيل الصوت:', err)
  }
}

// استدعاء هذه الدالة بعد تفعيل المستخدم (مرة واحدة)
export const enableAudio = async () => {
  const ctx = initAudioContext()
  if (ctx && ctx.state !== 'running') {
    await ctx.resume()
    return true
  }
  return false
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


