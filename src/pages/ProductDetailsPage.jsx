import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById, deleteProduct } from '../services/productService'
import { Button } from '../components/ui/Button'
import { ShoppingCart, MessageCircle, Edit, Trash2, Share2 } from 'lucide-react'
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

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>
  if (!targetId) return <div className="text-center py-20">رابط المنتج غير صالح</div>
  if (!product) return <div className="text-center py-20">المنتج غير موجود</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* الصور */}
        <div>
          <img
            src={product.cover_image || 'https://placehold.co/600x400'}
            alt={product.name || product.title}
            className="w-full rounded-2xl object-cover"
          />
          <div className="flex gap-2 mt-4 flex-wrap">
            {(product.images || []).map((img, i) => (
              <img
                key={i}
                src={img}
                className="w-20 h-20 object-cover rounded cursor-pointer border border-gold/30"
                onClick={() => window.open(img)}
                alt={`صورة ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* المعلومات */}
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">
            {product.name || product.title}
          </h1>
          <p className="text-text-secondary mb-4">{product.description}</p>
          <p className="text-2xl font-bold text-gold">
            {product.final_price || product.price} ريال
          </p>
          {product.discount_percentage > 0 && (
            <p className="text-text-secondary line-through">
              {product.price} ريال
            </p>
          )}

          {/* الأزرار حسب دور المستخدم */}
          <div className="flex gap-4 mt-6 flex-wrap">
            {/* مشاركة - تظهر للجميع */}
            <Button onClick={handleShare} variant="secondary">
              <Share2 className="inline ml-2" size={18} /> مشاركة
            </Button>

            {/* شراء - تظهر للجميع (مع تحذير للمالك) */}
            <Button onClick={handleBuy}>
              <ShoppingCart className="inline ml-2" size={18} /> شراء
            </Button>

            {/* استعلام - تظهر للجميع (مع تحذير للمالك) */}
            <Button onClick={handleInquiry} variant="secondary">
              <MessageCircle className="inline ml-2" size={18} /> استعلام
            </Button>

            {/* تعديل وحذف - تظهر فقط للمالك أو الأدمن */}
            {(isOwner || isAdmin) && (
              <>
                <Button onClick={handleEdit} variant="secondary">
                  <Edit className="inline ml-2" size={18} /> تعديل
                </Button>
                <Button onClick={handleDelete} variant="danger">
                  <Trash2 className="inline ml-2" size={18} /> حذف
                </Button>
              </>
            )}
          </div>

          {/* تفاصيل إضافية */}
          <div className="mt-6 p-4 bg-primary-card rounded-xl border border-gold/20">
            <p><strong>المدينة:</strong> {product.city || 'غير محدد'}</p>
            <p><strong>الحالة:</strong> {
              product.condition === 'new' ? 'جديد' :
              product.condition === 'used' ? 'مستعمل' : 'مجدد'
            }</p>
            {isOwner && product.contact_number && (
              <p className="mt-2 text-gold font-semibold bg-gold/10 p-2 rounded border border-gold/20">
                <strong>رقم التواصل الخاص بك:</strong> {product.contact_number}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}