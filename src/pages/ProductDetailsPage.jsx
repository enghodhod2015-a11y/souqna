import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById } from '../services/productService'
import { Button } from '../components/ui/Button'
import { ShoppingCart, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductDetailsPage() {
  const { id, productId } = useParams()
  
  // 🔒 فلتر الأمان الحاسم: إذا كانت القيمة فارغة أو تساوي نص "undefined"، نعتبرها null فورًا
  const rawId = id || productId;
  const targetId = rawId && rawId !== 'undefined' ? rawId : null;
  
  const navigate = useNavigate()
  const { user } = useAuth() 
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // لا يتم الاستعلام إلا إذا كان المعرف حقيقيًا وليس كلمة "undefined"
    if (targetId) {
      loadProduct()
    } else {
      setLoading(false)
    }
  }, [targetId])

  const loadProduct = async () => {
    try {
      setLoading(true);
      console.log("جاري البحث عن المنتج بالرقم المصفى الآمن:", targetId); 
      const data = await getProductById(targetId);
      
      if (!data) {
        console.error("لم يتم العثور على بيانات للمنتج في Supabase");
      }
      
      setProduct(data);
    } catch (err) {
      console.error("خطأ أثناء جلب المنتج:", err);
      toast.error(err.message);
    } finally {
      setLoading(false); 
    }
  }

  const handleBuy = () => {
    if (!product) return;
    navigate('/checkout', { state: { product, quantity: 1 } })
  }

  const handleInquiry = () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً للمراسلة')
      navigate('/login')
      return
    }
    if (!product?.id) return;
    navigate(`/chat/product/${product.id}`)
  }

  if (loading) return <div className="text-center py-20 text-text-secondary">جاري التحميل...</div>
  
  // 🔒 إرشاد ذكي للمطور بدلاً من إرسال نص تالف يعطل خادم قاعدة البيانات
  if (!targetId) {
    return (
      <div className="text-center py-20 text-text-secondary space-y-3 max-w-md mx-auto bg-primary-card p-6 rounded-2xl border border-gold/20">
        <p className="text-xl font-bold text-red-500">🚨 خطأ في توجيه المعرف (undefined)</p>
        <p className="text-sm leading-relaxed">
          الزر المخصص لفتح المنتج في الصفحة الرئيسية لا يرسل المعرف الفريد السليم. يرجى مراجعة وتعديل وسم الـ <code className="bg-secondary-blue px-1.5 py-0.5 rounded text-gold text-xs">Link</code> داخل ملف كرت المنتج ليكون:
        </p>
        <code className="block bg-secondary-blue p-2 rounded text-emerald-400 text-xs font-mono select-all">
          {`to={\`/product/\${product?.id}\`}`}
        </code>
      </div>
    )
  }

  if (!product) return <div className="text-center py-20 text-text-secondary">المنتج غير موجود في قاعدة البيانات</div>

  const isOwner = user && user.id === product.seller_id;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img src={product.cover_image || 'https://placehold.co'} alt={product.title} className="w-full rounded-2xl" />
          <div className="flex gap-2 mt-4 flex-wrap">
            {product.images?.map((img, i) => (
              <img key={i} src={img} className="w-20 h-20 object-cover rounded cursor-pointer" onClick={() => window.open(img)} />
            ))}
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">{product.title}</h1>
          <p className="text-text-secondary mb-4">{product.description}</p>
          <p className="text-2xl font-bold text-gold">{product.final_price} ريال</p>
          {product.discount_percentage > 0 && <p className="text-text-secondary line-through">{product.price} ريال</p>}
          <div className="flex gap-4 mt-6">
            <Button onClick={handleBuy}>
              <ShoppingCart className="inline ml-2" /> شراء
            </Button>
            <Button variant="secondary" onClick={handleInquiry}>
              <MessageCircle className="inline ml-2" /> استعلام
            </Button>
          </div>
          <div className="mt-6 p-4 bg-primary-card rounded-xl">
            <p><strong>المدينة:</strong> {product.city || 'غير محدد'}</p>
            <p><strong>الحالة:</strong> {product.condition === 'new' ? 'جديد' : product.condition === 'used' ? 'مستعمل' : 'مجدد'}</p>
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
