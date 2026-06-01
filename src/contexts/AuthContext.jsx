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
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted.current) return
        
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id)
          if (!isMounted.current) return
          if (profileData) {
            setProfile(profileData)
          } else {
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
              setProfile(newProfile)
            }
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('خطأ في تهيئة المصادقة:', err)
      } finally {
        if (isMounted.current) setLoading(false)
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

  if (loading) {
    return <div className="text-center py-20">جاري تحميل بيانات المستخدم...</div>
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading: false, logout }}>
      {children}
    </AuthContext.Provider>
  )
}


