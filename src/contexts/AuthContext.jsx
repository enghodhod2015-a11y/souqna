import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef(null)

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
    let isMounted = true

    // مهلة احتياطية: بعد 5 ثوانٍ إجبار إنهاء حالة التحميل
    timeoutRef.current = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Auth loading timeout reached, forcing loading=false')
        setLoading(false)
      }
    }, 5000)

    const initAuth = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id)
          if (!isMounted) return
          
          if (profileData) {
            setProfile(profileData)
          } else {
            // إنشاء بروفايل تلقائي إذا لم يكن موجوداً
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
              setProfile(newProfile) // استخدام البيانات المحلية مؤقتاً
            }
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('خطأ في تهيئة المصادقة:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id)
        if (!isMounted) return
        setProfile(profileData || {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email,
          account_type: currentUser.user_metadata?.account_type || 'buyer'
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      listener?.subscription.unsubscribe()
    }
  }, [loading])

  const logout = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      toast.success('تم تسجيل الخروج')
      window.location.href = '/'
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

