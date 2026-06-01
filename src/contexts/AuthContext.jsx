import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('خطأ في جلب البروفايل:', error)
        return null
      }
      return data
    } catch (err) {
      console.error('استثناء في جلب البروفايل:', err)
      return null
    }
  }

  useEffect(() => {
    isMounted.current = true

    const initAuth = async () => {
      try {
        // ✅ إضافة مهلة قصيرة لمنع التعلق الأبدي
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة الاتصال بخادم المصادقة')), 8000)
        )
        const sessionPromise = supabase.auth.getSession()
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        
        if (!isMounted.current) return
        
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id)
          if (!isMounted.current) return
          if (profileData) {
            setProfile(profileData)
          } else {
            // إنشاء بروفايل جديد إذا لم يوجد
            const newProfile = {
              id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
              email: currentUser.email,
              account_type: currentUser.user_metadata?.account_type || 'buyer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([newProfile])
            if (!insertError) {
              setProfile(newProfile)
            } else {
              console.error('فشل إنشاء البروفايل:', insertError)
              setProfile(newProfile) // استخدام بيانات محلية مؤقتة
            }
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('خطأ في تهيئة المصادقة:', err)
        // ✅ في حالة الخطأ، نضع user و profile كـ null ونخرج من حالة التحميل
        if (isMounted.current) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id)
        if (!isMounted.current) return
        setProfile(profileData || {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email,
          account_type: currentUser.user_metadata?.account_type || 'buyer'
        })
      } else {
        setProfile(null)
      }
      // ✅ لا نغير loading هنا لأنها أصبحت false بالفعل
    })

    return () => {
      isMounted.current = false
      subscription?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      toast.success('تم تسجيل الخروج')
      window.location.href = '/'
    } catch (err) {
      toast.error(err.message)
    }
  }

  // إذا ظل loading بعد 5 ثوانٍ من أول محاولة، نعيد تعيينه قسراً (أمان إضافي)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && isMounted.current) {
        console.warn('انتهت مهلة التحميل، سيتم إعادة تعيين حالة التحميل قسراً')
        setLoading(false)
      }
    }, 10000)
    return () => clearTimeout(timeout)
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-blue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-white">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading: false, logout }}>
      {children}
    </AuthContext.Provider>
  )
}


