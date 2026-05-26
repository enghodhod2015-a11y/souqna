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
    let timeoutId

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          if (!isMounted) return
          if (error) throw error
          setProfile(data || { id: session.user.id, account_type: 'buyer' })
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
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        if (!isMounted) return
        if (error) console.error(error)
        setProfile(data || { id: session.user.id, account_type: 'buyer' })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // مهلة أمان: في حال بقيت loading=true لمدة 5 ثوانٍ، نعيد تعيينها
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Loading timeout - forcing loading=false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      listener?.subscription.unsubscribe()
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

  return <AuthContext.Provider value={{ user, profile, loading, logout }}>{children}</AuthContext.Provider>
}