import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="text-center py-20">جاري التحميل...</div>
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-primary-card rounded-2xl p-6 border border-gold/30 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gold mb-6">ملفي الشخصي</h1>
        <p><span className="text-text-secondary">الاسم:</span> {profile?.full_name || 'غير محدد'}</p>
        <p><span className="text-text-secondary">البريد:</span> {user?.email}</p>
        <p><span className="text-text-secondary">نوع الحساب:</span> {profile?.account_type === 'buyer' ? 'مشتري' : 'بائع'}</p>
      </div>
    </div>
  )
}