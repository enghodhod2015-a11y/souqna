import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSellerProducts, deleteProduct, updateProduct, restoreProduct } from '../services/productService'
import { Button } from '../components/ui/Button'
import { Edit, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyProductsPage() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadProducts()
  }, [user])

  const loadProducts = async () => {
    try {
      const data = await getSellerProducts(user.id)
      setProducts(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // تبديل حالة الإخفاء/الإظهار (للزر الثنائي Eye/EyeOff)
  const handleToggleHidden = async (id, currentHidden) => {
    try {
      await updateProduct(id, { is_hidden: !currentHidden, is_approved: currentHidden ? true : false })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_hidden: !currentHidden } : p))
      toast.success(currentHidden ? 'تم نشر المنتج' : 'تم إخفاء المنتج')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // إخفاء المنتج (Soft Delete)
  const handleHide = async (id) => {
    if (confirm('هل أنت متأكد من إخفاء هذا المنتج؟ سيبقى في المحادثات والطلبات القديمة لكن لن يظهر في المتجر.')) {
      try {
        await deleteProduct(id)
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_hidden: true, is_approved: false } : p))
        toast.success('تم إخفاء المنتج')
      } catch (err) {
        toast.error(err.message)
      }
    }
  }

  // استعادة منتج مخفي
  const handleRestore = async (id) => {
    if (confirm('هل أنت متأكد من استعادة هذا المنتج؟ سيصبح مرئياً في المتجر مرة أخرى.')) {
      try {
        await restoreProduct(id)
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_hidden: false, is_approved: true } : p))
        toast.success('تم استعادة المنتج')
      } catch (err) {
        toast.error(err.message)
      }
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">منتجاتي</h1>
        <Link to="/add-product"><Button>+ إضافة منتج</Button></Link>
      </div>
      {products.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد منتجات بعد. أضف منتجك الأول!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-primary-card rounded-2xl border border-gold/30 overflow-hidden">
              <img src={product.cover_image || 'https://placehold.co/400x200'} alt={product.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-bold">{product.title}</h3>
                <p className="text-gold">{product.final_price} ريال</p>
                <p className="text-text-secondary text-sm">الحالة: {product.is_hidden ? 'مخفي' : 'منشور'}</p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Link to={`/product/${product.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">عرض</Button>
                  </Link>
                  <Link to={`/edit-product/${product.id}`}>
                    <Button variant="secondary"><Edit size={18} /></Button>
                  </Link>

                  {product.is_hidden ? (
                    // زر الاستعادة للمنتجات المخفية
                    <Button onClick={() => handleRestore(product.id)} variant="secondary" className="bg-green-600 hover:bg-green-700 text-white">
                      <RefreshCw size={18} /> استعادة
                    </Button>
                  ) : (
                    // زر الإخفاء للمنتجات المنشورة
                    <Button onClick={() => handleHide(product.id)} variant="danger">
                      <Trash2 size={18} /> إخفاء
                    </Button>
                  )}

                  {/* زر تبديل الإظهار/الإخفاء (اختياري) */}
                  <Button variant="secondary" onClick={() => handleToggleHidden(product.id, product.is_hidden)}>
                    {product.is_hidden ? <Eye size={18} /> : <EyeOff size={18} />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


