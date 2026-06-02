import { supabase } from './supabase'

// ─── التسجيل مع رقم الهاتف ───
export const signUp = async (email, password, fullName, accountType, phone) => {
  if (!email || !password || !fullName || !phone) {
    throw new Error('جميع الحقول مطلوبة')
  }
  
  if (password.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  }
  
  const { data, error } = await supabase.auth.signUp({
    email, 
    password,
    options: { 
      data: { 
        full_name: fullName,
        account_type: accountType
      } 
    }
  })
  
  if (error) {
    if (error.message.includes('User already registered')) {
      throw new Error('البريد الإلكتروني مستخدم مسبقاً')
    }
    throw error
  }
  
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        account_type: accountType,
        phone: phone
      })
    if (profileError) console.error('Profile creation error:', profileError)
  }
  
  return data
}

// ─── تسجيل الدخول ───
export const signIn = async (email, password) => {
  if (!email || !password) {
    throw new Error('البريد وكلمة المرور مطلوبان')
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message.includes('Invalid login')) {
      throw new Error('البريد أو كلمة المرور غير صحيحة')
    }
    throw error
  }
  return data
}

// ─── تسجيل الخروج ───
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// CHANGED: تبسيط redirectTo إلى المسار النسبي '/reset-password' (بدون host)
// Supabase يضيف الهاش تلقائياً، ويجب أن يكون المسار متطابقاً مع Route في AppRoutes
export const resetPassword = async (email) => {
  if (!email) throw new Error('البريد الإلكتروني مطلوب')
  // استخدام المسار النسبي فقط - سيعمل مع أي basename تلقائياً
  const redirectUrl = `${window.location.origin}/reset-password`
  console.log('🔐 إرسال رابط إعادة التعيين إلى:', redirectUrl)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })
  if (error) throw error
}

// ─── تحديث كلمة المرور بعد النقر على الرابط ───
export const updatePassword = async (newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

