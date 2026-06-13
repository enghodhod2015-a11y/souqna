import { Link } from 'react-router-dom'
import { ShoppingCart, MessageCircle, Star, Heart } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { isProductInWishlist, addToWishlist, removeFromWishlist } from '../../services/wishlistService'
import toast from 'react-hot-toast'

export const ProductCard = ({ product }) => {
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  if (!product || !product.id) return null

  const title = product.title || product.name || 'بدون عنوان'
  const price = product.final_price || product.price || 0
  const discount = product.discount_percentage || 0
  const imageUrl = product.cover_image || (product.images && product.images[0]) || 'https://placehold.co/400x200/06264D/D4AF37?text=صورة'
  const averageRating = product.average_rating || 0
  const totalReviews = product.total_reviews || 0

  // التحقق من حالة المفضلة
  useEffect(() => {
    if (user && product?.id) {
      checkFavoriteStatus()
    }
  }, [user, product?.id])

  const checkFavoriteStatus = async () => {
    try {
      const fav = await isProductInWishlist(user.id, product.id)
      setIsFavorite(fav)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }
    setFavLoading(true)
    try {
      if (isFavorite) {
        await removeFromWishlist(user.id, product.id)
        setIsFavorite(false)
        toast.success('تمت الإزالة من المفضلة')
      } else {
        await addToWishlist(user.id, product.id)
        setIsFavorite(true)
        toast.success('تمت الإضافة إلى المفضلة')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <div className="bg-primary-card rounded-2xl overflow-hidden border border-gold/30 hover:border-gold transition-all duration-300 relative">
      {/* زر القلب (المفضلة) */}
      <button
        onClick={toggleFavorite}
        disabled={favLoading}
        className="absolute top-2 left-2 bg-black/50 rounded-full p-1.5 hover:bg-black/70 transition z-10"
        title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      >
        <Heart 
          size={18} 
          className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} 
        />
      </button>

      <Link to={`/product/${product.id}`}>
        <img 
          src={imageUrl}
          alt={title} 
          loading="lazy"
          className="w-full h-48 object-cover hover:scale-105 transition duration-300"
          onError={(e) => { e.target.src = 'https://placehold.co/400x200/06264D/D4AF37?text=صورة' }}
        />
      </Link>
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <Link to={`/product/${product.id}`} className="flex-1 text-right">
            <h3 className="text-lg font-bold line-clamp-1 text-white">{title}</h3>
          </Link>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold text-gold whitespace-nowrap">{price} ريال</span>
            {discount > 0 && (
              <span className="text-text-secondary line-through text-sm">{product.price} ريال</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} className={i < Math.floor(averageRating) ? 'text-gold fill-gold' : 'text-gray-400'} />
          ))}
          <span className="text-text-secondary text-sm mr-2">({totalReviews})</span>
        </div>
        
        <div className="flex gap-2">
          <Link to={`/checkout`} state={{ product, quantity: 1 }} className="flex-1">
            <Button className="w-full text-sm py-1.5">
              <ShoppingCart size={16} className="inline ml-1" /> شراء
            </Button>
          </Link>
          <Link to={`/chat/product/${product.id}`} className="flex-1">
            <Button variant="secondary" className="w-full text-sm py-1.5">
              <MessageCircle size={16} className="inline ml-1" /> استعلام
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


