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

  // ✅ دالة مضمونة لإنشاء/تحديث الملف الشخصي
  const ensureProfile = async (userId, email, metadata) => {
    const newProfile = {
      id: userId,
      full_name: metadata?.full_name || email?.split('@')[0] || 'مستخدم',
      email: email,
      account_type: metadata?.account_type || 'buyer',
      phone: metadata?.phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // استخدام upsert لتجنب مشكلة التكرار ولمراعاة RLS (إذا كان مسموحًا للمستخدم بإدراج صف نفسه)
    const { error } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })

    if (error) {
      console.error('⚠️ فشل upsert في profiles:', error.message)
      // في حال فشل قاعدة البيانات، نستخدم الكائن المحلي كملاذ أخير
      return newProfile
    }

    // إعادة جلب البيانات للتأكد من الحصول على أحدث إصدار
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data || newProfile
  }

  const loadAuth = async () => {
    setAuthError(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted.current) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        let profileData = await fetchProfile(currentUser.id)
        if (!profileData) {
          // محاولة إنشاء profile إذا لم يكن موجوداً
          profileData = await ensureProfile(
            currentUser.id,
            currentUser.email,
            currentUser.user_metadata
          )
        }
        if (!isMounted.current) return
        setProfile(profileData)
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('خطأ في المصادقة:', err)
      if (isMounted.current) {
        setAuthError(err.message || 'فشل الاتصال بخادم المصادقة')
        // في حالة حدوث خطأ فادح، ننشئ profile افتراضي للمستخدم الحالي إذا كان موجوداً في user (لن يحدث هنا)
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    // تنظيف أي جلسة قديمة بشكل آمن
    if (typeof window !== 'undefined') {
      const oldSession = localStorage.getItem('supabase.auth.token')
      if (oldSession) {
        localStorage.removeItem('supabase.auth.token')
        console.log('تم مسح جلسة localStorage القديمة')
      }
    }
    loadAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // استخدام setTimeout لتجنب تعارض التحديثات
        setTimeout(async () => {
          if (!isMounted.current) return
          let profileData = await fetchProfile(currentUser.id)
          if (!profileData) {
            profileData = await ensureProfile(
              currentUser.id,
              currentUser.email,
              currentUser.user_metadata
            )
          }
          if (!isMounted.current) return
          setProfile(profileData)
        }, 0)
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
          <button
            onClick={() => loadAuth()}
            className="px-4 py-2 bg-gold text-primary-blue rounded-lg font-bold hover:bg-gold/90"
          >
            إعادة المحاولة
          </button>
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

