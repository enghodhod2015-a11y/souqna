import { supabase } from './supabase'

export const signUp = async (email, password, fullName, accountType) => {
  if (!email || !password || !fullName) {
    throw new Error('جميع الحقول مطلوبة')
  }
  
  if (password.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  }
  
  try {
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
      // التعامل مع أخطاء محددة
      if (error.message.includes('User already registered')) {
        throw new Error('البريد الإلكتروني مستخدم مسبقاً')
      }
      if (error.message.includes('Password should be')) {
        throw new Error('كلمة المرور ضعيفة جداً')
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
      
      if (profileError) {
        console.error('Profile creation error:', profileError)
      }
    }
    
    return data
    
  } catch (err) {
    console.error('Signup error:', err)
    throw err
  }
}