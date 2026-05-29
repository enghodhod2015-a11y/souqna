import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProductById, updateProduct, uploadProductImages } from '../services/productService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

const categories = ['electronics', 'fashion', 'beauty', 'vehicles', 'home', 'baby', 'grocery', 'books', 'pets']

export default function EditProductPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', discount_percentage: 0, category: categories[0],
    stock_quantity: '', city: '', contact_number: '', condition: 'new', is_featured: false
  })
  const [existingImages, setExistingImages] = useState([])
  const [newImageFiles, setNewImageFiles] = useState([])
  const [newImagePreviews, setNewImagePreviews] = useState([])

  useEffect(() => { loadProduct() }, [id])

  const loadProduct = async () => {
    try {
      const product = await getProductById(id)
      if (product.seller_id !== user.id && profile?.account_type !== 'admin') {
        toast.error('لا تملك صلاحية تعديل هذا المنتج')
        navigate('/')
        return
      }
      setFormData({
        name: product.name || product.title,    // مرونة للبيانات القديمة
        description: product.description || '',
        price: product.price,
        discount_percentage: product.discount_percentage || 0,
        category: product.category,
        stock_quantity: product.stock_quantity ?? product.quantity ?? '',
        city: product.city || '',
        contact_number: product.contact_number || '',
        condition: product.condition,
        is_featured: product.is_featured ?? product.featured ?? false
      })
      setExistingImages(product.images || [])
    } catch (err) {
      toast.error(err.message)
      navigate('/my-products')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleNewImages = (e) => {
    const files = Array.from(e.target.files)
    setNewImageFiles(files)
    setNewImagePreviews(files.map(file => URL.createObjectURL(file)))
  }

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let allImages = [...existingImages]
      if (newImageFiles.length > 0) {
        const newUrls = await uploadProductImages(newImageFiles, id)
        allImages = [...allImages, ...newUrls]
      }
      await updateProduct(id, {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discount_percentage: parseInt(formData.discount_percentage) || 0,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        city: formData.city,
        contact_number: formData.contact_number,
        condition: formData.condition,
        is_featured: formData.is_featured,
        images: allImages,
        cover_image: allImages[0] || ''
      })
      toast.success('تم تحديث المنتج بنجاح')
      navigate(`/product/${id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // تحرير عناوين URL المؤقتة عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      newImagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [newImagePreviews])

  if (initialLoading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gold mb-6">تعديل المنتج</h1>
      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30">
        <Input label="اسم المنتج" name="name" value={formData.name} onChange={handleChange} required />
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">الوصف</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="السعر (ريال)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
          <Input label="نسبة الخصم %" name="discount_percentage" type="number" min="0" max="100" value={formData.discount_percentage} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block mb-1 text-text-secondary">القسم</label>
            <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Input label="الكمية" name="stock_quantity" type="number" value={formData.stock_quantity} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="المدينة" name="city" value={formData.city} onChange={handleChange} />
          <Input label="رقم التواصل" name="contact_number" value={formData.contact_number} onChange={handleChange} />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">حالة المنتج</label>
          <select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white">
            <option value="new">جديد</option>
            <option value="used">مستعمل</option>
            <option value="refurbished">مجدد</option>
          </select>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="w-5 h-5" />
          <label>منتج مميز</label>
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">الصور الحالية</label>
          <div className="flex gap-2 flex-wrap">
            {existingImages.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img} className="w-20 h-20 object-cover rounded" />
                <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-0 right-0 bg-danger rounded-full w-5 h-5 text-white text-xs">×</button>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">إضافة صور جديدة</label>
          <input type="file" multiple accept="image/*" onChange={handleNewImages} className="w-full" />
          <div className="flex gap-2 mt-2 flex-wrap">
            {newImagePreviews.map((src, idx) => <img key={idx} src={src} className="w-20 h-20 object-cover rounded" />)}
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'جاري التحديث...' : 'تحديث المنتج'}</Button>
      </form>
    </div>
  )
}


