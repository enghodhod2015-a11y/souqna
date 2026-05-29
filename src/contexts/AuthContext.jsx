import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // جلب البروفايل
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle()

          if (!isMounted) return

          if (error) {
            console.error('Profile fetch error:', error)
            // استخدام fallback من user_metadata
            setProfile({
              id: currentUser.id,
              account_type: currentUser.user_metadata?.account_type || 'buyer',
              full_name: currentUser.user_metadata?.full_name || currentUser.email
            })
          } else {
            setProfile(data || {
              id: currentUser.id,
              account_type: currentUser.user_metadata?.account_type || 'buyer',
              full_name: currentUser.user_metadata?.full_name || currentUser.email
            })
          }
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (!isMounted) return

        if (error) {
          console.error('Profile fetch error:', error)
          setProfile({
            id: currentUser.id,
            account_type: currentUser.user_metadata?.account_type || 'buyer',
            full_name: currentUser.user_metadata?.full_name || currentUser.email
          })
        } else {
          setProfile(data || {
            id: currentUser.id,
            account_type: currentUser.user_metadata?.account_type || 'buyer',
            full_name: currentUser.user_metadata?.full_name || currentUser.email
          })
        }
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      localStorage.clear()
      toast.success('تم تسجيل الخروج')
      window.location.href = '/'
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, logout }}>{children}</AuthContext.Provider>
}

