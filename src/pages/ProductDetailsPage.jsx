import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById } from '../services/productService'
import { Button } from '../components/ui/Button'
import { ShoppingCart, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    try {
      const data = await getProductById(id)
      setProduct(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = () => {
    navigate('/checkout', { state: { product, quantity: 1 } })
  }

  const handleInquiry = () => {
    navigate(`/chat/${product.id}/${product.seller_id}`)
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>
  if (!product) return <div className="text-center py-20">المنتج غير موجود</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img src={product.cover_image || 'https://placehold.co/600x400'} alt={product.title} className="w-full rounded-2xl" />
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
            <p><strong>البائع:</strong> {product.seller?.full_name}</p>
            <p><strong>المدينة:</strong> {product.city || 'غير محدد'}</p>
            <p><strong>الحالة:</strong> {product.condition === 'new' ? 'جديد' : product.condition === 'used' ? 'مستعمل' : 'مجدد'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}