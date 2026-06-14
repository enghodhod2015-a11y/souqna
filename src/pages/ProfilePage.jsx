import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile, loading, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    store_name: profile?.store_name || '',
    bank_account_number: profile?.bank_account_number || '',
    bank_name: profile?.bank_name || '',
    address: profile?.address || '',
    city: profile?.city || ''
  })
  const [updating, setUpdating] = useState(false)

  const isSeller = profile?.account_type === 'seller'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      // تجميع الحقول التي تغيرت فقط
      const updates = {}
      if (formData.full_name !== profile?.full_name) updates.full_name = formData.full_name
      if (formData.phone !== profile?.phone) updates.phone = formData.phone
      if (isSeller && formData.store_name !== profile?.store_name) updates.store_name = formData.store_name
      if (isSeller && formData.bank_account_number !== profile?.bank_account_number) updates.bank_account_number = formData.bank_account_number
      if (isSeller && formData.bank_name !== profile?.bank_name) updates.bank_name = formData.bank_name
      if (formData.address !== profile?.address) updates.address = formData.address
      if (formData.city !== profile?.city) updates.city = formData.city

      if (Object.keys(updates).length === 0) {
        toast.info('لا توجد تغييرات لحفظها')
        setIsEditing(false)
        return
      }

      await updateProfile(updates)
      setIsEditing(false)
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء التحديث')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-primary-card rounded-2xl p-6 border border-gold/30 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gold">ملفي الشخصي</h1>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              تعديل الملف
            </Button>
          )}
        </div>

        {!isEditing ? (
          // عرض المعلومات (وضع القراءة فقط)
          <div className="space-y-3 text-gray-200">
            <p><span className="text-gold font-medium">الاسم:</span> {profile?.full_name || 'غير محدد'}</p>
            <p><span className="text-gold font-medium">البريد الإلكتروني:</span> {user?.email} (لا يمكن تغييره)</p>
            <p><span className="text-gold font-medium">رقم الهاتف:</span> {profile?.phone || 'غير محدد'}</p>
            {isSeller && (
              <>
                <p><span className="text-gold font-medium">اسم المتجر:</span> {profile?.store_name || 'غير محدد'}</p>
                <p><span className="text-gold font-medium">رقم الحساب البنكي:</span> {profile?.bank_account_number || 'غير محدد'}</p>
                <p><span className="text-gold font-medium">اسم البنك:</span> {profile?.bank_name || 'غير محدد'}</p>
              </>
            )}
            <p><span className="text-gold font-medium">العنوان:</span> {profile?.address || 'غير محدد'}</p>
            <p><span className="text-gold font-medium">المدينة:</span> {profile?.city || 'غير محدد'}</p>
            <p><span className="text-gold font-medium">نوع الحساب:</span> {profile?.account_type === 'buyer' ? 'مشتري' : 'بائع'}</p>
          </div>
        ) : (
          // نموذج التعديل
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="الاسم الكامل"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
            <div>
              <label className="block mb-1 text-text-secondary">البريد الإلكتروني</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-700 border border-gray-300 cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <Input
              label="رقم الهاتف"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="مثال: 771234567"
            />
            {isSeller && (
              <>
                <Input
                  label="اسم المتجر (يظهر للمشترين)"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleChange}
                  placeholder="مثال: متجر الإلكترونيات"
                />
                <Input
                  label="رقم الحساب البنكي (لتحويل الأرباح)"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  placeholder="مثال: SA1234567890"
                />
                <Input
                  label="اسم البنك"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="مثال: الراجحي"
                />
              </>
            )}
            <Input
              label="العنوان التفصيلي"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="الحي، الشارع، رقم المنزل"
            />
            <Input
              label="المدينة / المحافظة"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="مثال: الرياض"
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={updating}>
                {updating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false)
                  // إعادة تعيين البيانات إلى القيم الأصلية
                  setFormData({
                    full_name: profile?.full_name || '',
                    phone: profile?.phone || '',
                    store_name: profile?.store_name || '',
                    bank_account_number: profile?.bank_account_number || '',
                    bank_name: profile?.bank_name || '',
                    address: profile?.address || '',
                    city: profile?.city || ''
                  })
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}