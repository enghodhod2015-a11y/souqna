import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const isMounted = useRef(true)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) return null
      return data
    } catch {
      return null
    }
  }

  const loadAuth = async () => {
    setAuthError(null)
    setLoading(true)
    try {
      // 1. محاولة الحصول على الجلسة من Supabase
      const { data: { session } } = await supabase.auth.getSession()
      let currentUser = session?.user ?? null

      // 2. إذا لم توجد جلسة، حاول استعادة الرمز من localStorage يدوياً (كحل بديل)
      if (!currentUser && typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('supabase.auth.token')
        if (storedToken) {
          console.log('🔄 محاولة استعادة الجلسة من localStorage...')
          const { data: { session: recoveredSession }, error } = await supabase.auth.setSession(JSON.parse(storedToken))
          if (!error && recoveredSession) {
            currentUser = recoveredSession.user
            console.log('✅ تم استعادة الجلسة بنجاح')
          }
        }
      }

      if (!isMounted.current) return
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
          const { error: insertError } = await supabase.from('profiles').insert([newProfile])
          if (!insertError) setProfile(newProfile)
          else setProfile(newProfile)
        }
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('خطأ في المصادقة:', err)
      if (isMounted.current) setAuthError(err.message || 'فشل الاتصال بخادم المصادقة')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    // تأخير بسيط لضمان تهيئة Supabase
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadAuth()
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        // عند تسجيل الدخول، تحديث الملف الشخصي فوراً
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

  const updateProfile = async (updates) => {
    if (!user) throw new Error('لا يوجد مستخدم مسجل')
    if (updates.email) {
      delete updates.email
      toast.warning('لا يمكن تغيير البريد الإلكتروني')
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(prev => ({ ...prev, ...data }))
    toast.success('تم تحديث الملف الشخصي بنجاح')
    return data
  }

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-blue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-white">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-blue">
        <div className="text-center bg-primary-card p-6 rounded-2xl border border-gold/30 max-w-md">
          <p className="text-red-400 mb-4">⚠️ {authError}</p>
          <p className="text-text-secondary mb-4">يرجى التحقق من اتصالك بالإنترنت أو تحديث الصفحة.</p>
          <button onClick={() => loadAuth()} className="px-4 py-2 bg-gold text-primary-blue rounded-lg font-bold hover:bg-gold/90">إعادة المحاولة</button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading: false, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

