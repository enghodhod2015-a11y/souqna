import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

/**
 * معالجة أخطاء Supabase بشكل مركزي
 * @param {Error} error - كائن الخطأ
 * @param {Function} navigate - دالة التوجيه من react-router
 * @param {Function} logout - دالة تسجيل الخروج من AuthContext
 * @returns {Promise<boolean>} - تعيد true إذا تمت المعالجة، false إذا لم يتم
 */
export const handleSupabaseError = async (error, navigate, logout) => {
  console.error('Supabase error:', error)

  // انتهاء صلاحية الجلسة
  if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired')) {
    toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى')
    if (logout) await logout()
    if (navigate) navigate('/login')
    return true
  }

  // خطأ صلاحيات (RLS)
  if (error?.code === '42501') {
    toast.error('ليس لديك صلاحية للقيام بهذا الإجراء')
    return true
  }

  // خطأ اتصال
  if (error?.message?.includes('Failed to fetch')) {
    toast.error('فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت')
    return true
  }

  // خطأ فريد (duplicate key)
  if (error?.code === '23505') {
    toast.error('هذه البيانات موجودة مسبقاً')
    return true
  }

  return false
}

/**
 * نسخة مبسطة للاستخدام داخل hooks (بدون navigate)
 * @param {Error} error
 * @returns {boolean}
 */
export const handleErrorSimple = (error) => {
  console.error(error)
  if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired')) {
    toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى')
    return true
  }
  if (error?.code === '42501') {
    toast.error('ليس لديك صلاحية')
    return true
  }
  return false
}

