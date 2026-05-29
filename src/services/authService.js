import { supabase } from './supabase'

// ─── التسجيل ───
export const signUp = async (email, password, fullName, accountType) => {
  if (!email || !password || !fullName) {
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
  
  // إنشاء profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        account_type: accountType
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
  
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  })
  
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

