// داخل ProductCard.jsx
import { Heart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isProductInWishlist, addToWishlist, removeFromWishlist } from '../../services/wishlistService'
import { useState, useEffect } from 'react'

// داخل المكون
const { user } = useAuth()
const [isFavorite, setIsFavorite] = useState(false)
const [favLoading, setFavLoading] = useState(false)

useEffect(() => {
  if (user && product?.id) {
    checkFavoriteStatus()
  }
}, [user, product?.id])

const checkFavoriteStatus = async () => {
  try {
    const fav = await isProductInWishlist(user.id, product.id)
    setIsFavorite(fav)
  } catch (err) { console.error(err) }
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

// داخل الـ return، بعد الصورة أو في الزاوية:
<button
  onClick={toggleFavorite}
  disabled={favLoading}
  className="absolute top-2 left-2 bg-black/50 rounded-full p-1.5 hover:bg-black/70 transition z-10"
>
  <Heart 
    size={18} 
    className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} 
  />
</button>

