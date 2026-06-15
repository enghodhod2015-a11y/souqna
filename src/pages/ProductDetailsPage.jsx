import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById, deleteProduct } from '../services/productService'
import { getProductReviews, getAverageRating, canUserReviewProduct, addReview } from '../services/reviewService'
import toast from 'react-hot-toast'
import { Skeleton, SkeletonText, SkeletonCircle } from '../components/ui/Skeleton'
import { Star } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function ProductDetailsPage() {
  const { id, productId } = useParams()
  const rawId = id || productId
  const targetId = rawId && rawId !== 'undefined' ? rawId : null
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [userCanReview, setUserCanReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (targetId) loadProduct()
    else setLoading(false)
  }, [targetId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await getProductById(targetId)
      setProduct(data)
      if (data) {
        await loadReviews(data.id)
        if (user) checkCanReview(data.id)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (productIdNum) => {
    try {
      const [reviewsData, avgData] = await Promise.all([
        getProductReviews(productIdNum),
        getAverageRating(productIdNum)
      ])
      setReviews(reviewsData)
      setAverageRating(avgData.average)
      setTotalReviews(avgData.count)
    } catch (err) {
      console.error('خطأ في جلب المراجعات:', err)
    }
  }

  const checkCanReview = async (productIdNum) => {
    try {
      const can = await canUserReviewProduct(user.id, productIdNum)
      setUserCanReview(can)
    } catch (err) {
      console.error('خطأ في التحقق من إمكانية المراجعة:', err)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }
    if (!reviewComment.trim()) {
      toast.error('الرجاء كتابة تعليق')
      return
    }
    setSubmittingReview(true)
    try {
      await addReview(product.id, user.id, reviewRating, reviewComment)
      toast.success('تم إضافة تقييمك بنجاح')
      setReviewComment('')
      setReviewRating(5)
      await loadReviews(product.id)
      setUserCanReview(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingReview(false)
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

  const handleEdit = () => navigate(`/edit-product/${product.id}`)
  
  // ✅ دالة الإخفاء مع إضافة تشخيص
  const handleHide = async () => {
    // 🟢 طباعة معلومات التشخيص
    console.log('🔍 تشخيص الإخفاء:');
    console.log('Current user ID:', user?.id);
    console.log('Product seller ID:', product?.seller_id);
    console.log('Is owner?', user?.id === product?.seller_id);
    
    const confirmed = window.confirm('هل أنت متأكد من إخفاء هذا المنتج؟ سيبقى في المحادثات والطلبات القديمة لكن لن يظهر في المتجر.')
    if (!confirmed) return
    try {
      await deleteProduct(product.id)
      toast.success('تم إخفاء المنتج بنجاح')
      navigate('/my-products')
    } catch (err) {
      console.error('❌ فشل الإخفاء:', err);
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
  const showEditHide = isOwner || isAdmin

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-blue text-white py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <Skeleton className="w-full h-96 rounded-2xl" />
              <div className="flex gap-3 mt-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-20 h-20 rounded-lg" />)}</div>
            </div>
            <div className="space-y-4">
              <SkeletonText width="w-3/4" height="h-10" />
              <SkeletonText width="w-1/2" height="h-8" />
              <SkeletonText width="w-full" height="h-24" />
              <div className="grid grid-cols-2 gap-4">
                <SkeletonText width="w-full" height="h-12" />
                <SkeletonText width="w-full" height="h-12" />
              </div>
              <div className="flex gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="flex-1 h-12 rounded-xl" />)}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!targetId) return <div className="text-center py-20 text-white">رابط المنتج غير صالح</div>
  if (!product) return <div className="text-center py-20 text-white">المنتج غير موجود</div>

  return (
    <div className="min-h-screen bg-primary-blue text-white py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="sticky top-24">
              <img src={product.cover_image || 'https://placehold.co/600x400/0b2f5c/D4AF37?text=صورة'} alt={product.name || product.title} className="w-full rounded-2xl object-cover shadow-xl border border-gold/30" />
              <div className="flex gap-3 mt-4 flex-wrap justify-center">
                {(product.images || []).map((img, i) => (
                  <img key={i} src={img} className="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-gold/40 hover:border-gold transition" onClick={() => window.open(img)} alt={`صورة ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gold text-right">{product.name || product.title}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-gold">{product.final_price || product.price} ريال</span>
                {product.discount_percentage > 0 && <span className="text-md text-gray-400 line-through">{product.price} ريال</span>}
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-right text-base">{product.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary-card/40 rounded-xl p-5 border border-gold/20">
              <div className="flex justify-between items-center border-b border-gold/10 pb-2"><span className="text-gold font-semibold">المدينة:</span><span className="text-gray-200">{product.city || 'غير محدد'}</span></div>
              <div className="flex justify-between items-center border-b border-gold/10 pb-2"><span className="text-gold font-semibold">الحالة:</span><span className="text-gray-200">{product.condition === 'new' ? 'جديد' : product.condition === 'used' ? 'مستعمل' : 'مجدد'}</span></div>
              {product.seller?.full_name && (<div className="flex justify-between items-center border-b border-gold/10 pb-2 col-span-1 md:col-span-2"><span className="text-gold font-semibold">البائع:</span><span className="text-gray-200">{product.seller.full_name}</span></div>)}
              {isOwner && product.contact_number && (<div className="flex justify-between items-center bg-gold/10 rounded-lg p-2 col-span-1 md:col-span-2"><span className="text-gold font-semibold">رقم التواصل الخاص بك:</span><span className="text-white font-mono">{product.contact_number}</span></div>)}
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-3 justify-start mt-4">
              <button onClick={handleInquiry} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md">💬 استعلام</button>
              <button onClick={handleBuy} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-md">🛒 شراء</button>
              <button onClick={handleShare} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md">🔗 مشاركة</button>
              {showEditHide && (<>
                <button onClick={handleEdit} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-md">✏️ تعديل</button>
                <button onClick={handleHide} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md">👁️ إخفاء</button>
              </>)}
            </div>

            {/* قسم التقييمات */}
            <div className="mt-6 bg-primary-card/40 rounded-xl p-5 border border-gold/20">
              <h3 className="text-xl font-bold text-gold mb-3">تقييمات المنتج</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold text-gold">{averageRating || 'لا يوجد'}</div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={i < Math.floor(averageRating) ? 'text-gold fill-gold' : 'text-gray-400'} />
                  ))}
                </div>
                <span className="text-text-secondary">({totalReviews} تقييم)</span>
              </div>

              {userCanReview && (
                <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-secondary-blue/30 rounded-xl border border-gold/20">
                  <h4 className="font-bold text-gold mb-2">قيّم هذا المنتج</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-text-secondary">تقييمك:</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(r => (
                        <button key={r} type="button" onClick={() => setReviewRating(r)} className="focus:outline-none">
                          <Star size={24} className={r <= reviewRating ? 'text-gold fill-gold' : 'text-gray-500'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="شارك تجربتك مع هذا المنتج..."
                    rows="3"
                    className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold mb-3"
                  />
                  <Button type="submit" disabled={submittingReview}>
                    {submittingReview ? 'جاري النشر...' : 'نشر التقييم'}
                  </Button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-text-secondary text-center py-4">لا توجد مراجعات بعد. كن أول من يقيم هذا المنتج!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-gold/20 pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-white">{review.user?.full_name || 'مستخدم'}</div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className={i < review.rating ? 'text-gold fill-gold' : 'text-gray-500'} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {new Date(review.created_at).toLocaleDateString('ar')}
                        </span>
                      </div>
                      <p className="text-text-secondary mt-1 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


