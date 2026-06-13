import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserWishlist, removeFromWishlist } from '../services/wishlistService'
import { Button } from '../components/ui/Button'
import { Heart, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { SkeletonCard } from '../components/ui/Skeleton'

export default function WishlistPage() {
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadWishlist()
  }, [user])

  const loadWishlist = async () => {
    setLoading(true)
    try {
      const data = await getUserWishlist(user.id)
      setWishlist(data)
    } catch (err) {
      toast.error('فشل تحميل المفضلة')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(user.id, productId)
      setWishlist(prev => prev.filter(item => item.id !== productId))
      toast.success('تمت الإزالة من المفضلة')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gold mb-6">المفضلة</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">المفضلة</h1>
      {wishlist.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-text-secondary">لا توجد منتجات في المفضلة</p>
          <Link to="/" className="text-gold mt-4 inline-block">تصفح المنتجات</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map(product => (
            <div key={product.id} className="bg-primary-card rounded-2xl overflow-hidden border border-gold/30 hover:border-gold transition relative group">
              <button
                onClick={() => handleRemove(product.id)}
                className="absolute top-2 left-2 bg-black/50 rounded-full p-1.5 hover:bg-red-600 transition z-10"
                title="إزالة من المفضلة"
              >
                <Trash2 size={16} className="text-white" />
              </button>
              <Link to={`/product/${product.id}`}>
                <img 
                  src={product.cover_image || 'https://placehold.co/400x200/06264D/D4AF37?text=صورة'} 
                  alt={product.title}
                  className="w-full h-48 object-cover hover:scale-105 transition duration-300"
                />
              </Link>
              <div className="p-4">
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-lg font-bold text-white mb-1">{product.title}</h3>
                </Link>
                <p className="text-text-secondary text-sm mb-2">البائع: {product.seller_name}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gold">{product.final_price} ريال</span>
                  {product.discount_percentage > 0 && (
                    <span className="text-text-secondary line-through text-sm">{product.price} ريال</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to={`/checkout`} state={{ product, quantity: 1 }} className="flex-1">
                    <Button className="w-full text-sm py-1.5">
                      <ShoppingCart size={16} className="inline ml-1" /> شراء
                    </Button>
                  </Link>
                  <Link to={`/product/${product.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full text-sm py-1.5">
                      تفاصيل
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

