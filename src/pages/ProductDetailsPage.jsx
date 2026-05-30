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

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>
  if (!targetId) return <div className="text-center py-20">رابط المنتج غير صالح</div>
  if (!product) return <div className="text-center py-20">المنتج غير موجود</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        {/* الصور - تظهر في الأعلى */}
        <div>
          <img
            src={product.cover_image || 'https://placehold.co/600x400'}
            alt={product.name || product.title}
            className="w-full rounded-2xl object-cover shadow-lg"
          />
          <div className="flex gap-2 mt-4 flex-wrap">
            {(product.images || []).map((img, i) => (
              <img
                key={i}
                src={img}
                className="w-20 h-20 object-cover rounded-xl cursor-pointer border-2 border-transparent hover:border-blue-500 transition"
                onClick={() => window.open(img)}
                alt={`صورة ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* المعلومات */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 text-right mb-2">
            {product.name || product.title}
          </h1>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-green-600">
              {product.final_price || product.price} ريال
            </span>
            {product.discount_percentage > 0 && (
              <span className="text-lg text-gray-400 line-through">
                {product.price} ريال
              </span>
            )}
          </div>
          <p className="text-gray-600 leading-relaxed text-right my-5">
            {product.description}
          </p>

          {/* كروت المعلومات */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mt-4">
            <div className="flex justify-between items-center flex-wrap mb-3">
              <span className="font-bold text-gray-800">المدينة:</span>
              <span className="text-gray-600">{product.city || 'غير محدد'}</span>
            </div>
            <div className="flex justify-between items-center flex-wrap">
              <span className="font-bold text-gray-800">الحالة:</span>
              <span className="text-gray-600">
                {product.condition === 'new' ? 'جديد' : product.condition === 'used' ? 'مستعمل' : 'مجدد'}
              </span>
            </div>
            {isOwner && product.contact_number && (
              <div className="mt-4 p-2 bg-blue-100 rounded-lg text-center font-semibold text-blue-800">
                رقم التواصل الخاص بك: {product.contact_number}
              </div>
            )}
          </div>

          {/* صف الأزرار */}
          <div className="flex flex-wrap gap-4 mt-8 justify-end sm:justify-start">
            <button
              onClick={handleInquiry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
            >
              💬 استعلام
            </button>
            <button
              onClick={handleBuy}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
            >
              🛒 شراء
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
            >
              🔗 مشاركة
            </button>
            {showEditDelete && (
              <>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                >
                  ✏️ تعديل
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                >
                  🗑️ حذف
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

