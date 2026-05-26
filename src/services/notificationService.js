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
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// تسجيل Service Worker
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration)
    return registration
  } catch (err) {
    console.error('Service Worker registration failed:', err)
  }
}

// الحصول على VAPID public key (من Supabase)
const getVapidPublicKey = () => {
  // يجب استبداله بالمفتاح الحقيقي من Supabase Settings → API → VAPID Key
  return 'YOUR_VAPID_PUBLIC_KEY'
}

// الاشتراك في Push Notifications
export const subscribeToPush = async () => {
  const registration = await navigator.serviceWorker.ready
  const vapidPublicKey = getVapidPublicKey()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  })
  // حفظ الاشتراك في Supabase (يمكن تخزينه في جدول push_subscriptions)
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      subscription: subscription
    })
  if (error) console.error(error)
  return subscription
}

// مساعدة دالة لتحويل VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// تشغيل صوت الإشعار
export const playNotificationSound = () => {
  const audio = new Audio('/notification.mp3')
  audio.play().catch(e => console.log('Audio play failed:', e))
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
      related_id: relatedId
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
  return data
}

// تعليم الإشعار كمقروء
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}