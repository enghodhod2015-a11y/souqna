import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById, deleteProduct } from '../services/productService'
import toast from 'react-hot-toast'

export default function ProductDetailsPage() {
  const { id, productId } = useParams()
  const rawId = id || productId
  const targetId = rawId && rawId !== 'undefined' ? rawId : null

  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (targetId) loadProduct()
    else setLoading(false)
  }, [targetId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await getProductById(targetId)
      setProduct(data)
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = () => {
    if (!product) return
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً للشراء')
      navigate('/login')
      return
    }
    if (user.id === product.seller_id) {
      toast.error('لا يمكنك شراء منتجك الخاص')
      return
    }
    navigate('/checkout', { state: { product, quantity: 1 } })
  }

  const handleInquiry = () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً للمراسلة')
      navigate('/login')
      return
    }
    if (user.id === product.seller_id) {
      toast.error('لا يمكنك مراسلة نفسك')
      return
    }
    navigate(`/chat/product/${product.id}`)
  }

  const handleEdit = () => {
    navigate(`/edit-product/${product.id}`)
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.')
    if (!confirmed) return
    try {
      await deleteProduct(product.id)
      toast.success('تم حذف المنتج بنجاح')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/product/${product.id}`
    navigator.clipboard.writeText(url)
    toast.success('تم نسخ رابط المنتج')
  }

  const isOwner = user && user.id === product?.seller_id
  const isAdmin = profile?.account_type === 'admin'
  const showEditDelete = isOwner || isAdmin

  if (loading) return <div className="text-center py-20 text-white">جاري التحميل...</div>
  if (!targetId) return <div className="text-center py-20 text-white">رابط المنتج غير صالح</div>
  if (!product) return <div className="text-center py-20 text-white">المنتج غير موجود</div>

  return (
    <div className="min-h-screen bg-primary-blue text-white py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* تخطيط عمودين على الشاشات المتوسطة والكبيرة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* العمود الأول: الصور فقط */}
          <div>
            <div className="sticky top-24">
              <img
                src={product.cover_image || 'https://placehold.co/600x400/0b2f5c/D4AF37?text=صورة'}
                alt={product.name || product.title}
                className="w-full rounded-2xl object-cover shadow-xl border border-gold/30"
              />
              <div className="flex gap-3 mt-4 flex-wrap justify-center">
                {(product.images || []).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-gold/40 hover:border-gold transition"
                    onClick={() => window.open(img)}
                    alt={`صورة ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* العمود الثاني: كل المحتوى الآخر */}
          <div className="flex flex-col gap-6">
            {/* صف واحد: اسم المنتج في جهة اليمين، السعر في أقصى اليسار */}
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gold text-right">
                {product.name || product.title}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-gold">
                  {product.final_price || product.price} ريال
                </span>
                {product.discount_percentage > 0 && (
                  <span className="text-md text-gray-400 line-through">
                    {product.price} ريال
                  </span>
                )}
              </div>
            </div>

            {/* الوصف */}
            <p className="text-gray-300 leading-relaxed text-right text-base">
              {product.description}
            </p>

            {/* تفاصيل المنتج في شبكة من عمودين (المدينة، الحالة، إلخ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary-card/40 rounded-xl p-5 border border-gold/20">
              <div className="flex justify-between items-center border-b border-gold/10 pb-2">
                <span className="text-gold font-semibold">المدينة:</span>
                <span className="text-gray-200">{product.city || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gold/10 pb-2">
                <span className="text-gold font-semibold">الحالة:</span>
                <span className="text-gray-200">
                  {product.condition === 'new' ? 'جديد' : product.condition === 'used' ? 'مستعمل' : 'مجدد'}
                </span>
              </div>
              {product.seller?.full_name && (
                <div className="flex justify-between items-center border-b border-gold/10 pb-2 col-span-1 md:col-span-2">
                  <span className="text-gold font-semibold">البائع:</span>
                  <span className="text-gray-200">{product.seller.full_name}</span>
                </div>
              )}
              {isOwner && product.contact_number && (
                <div className="flex justify-between items-center bg-gold/10 rounded-lg p-2 col-span-1 md:col-span-2">
                  <span className="text-gold font-semibold">رقم التواصل الخاص بك:</span>
                  <span className="text-white font-mono">{product.contact_number}</span>
                </div>
              )}
            </div>

            {/* صف واحد للأزرار (جميعها في سطر واحد على الشاشات الكبيرة) */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 justify-start mt-4">
              <button
                onClick={handleInquiry}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
              >
                💬 استعلام
              </button>
              <button
                onClick={handleBuy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
              >
                🛒 شراء
              </button>
              <button
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
              >
                🔗 مشاركة
              </button>
              {showEditDelete && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                  >
                    🗑️ حذف
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

