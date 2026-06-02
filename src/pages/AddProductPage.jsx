import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addProduct, uploadProductImages, updateProduct } from '../services/productService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

const categories = ['electronics', 'fashion', 'beauty', 'vehicles', 'home', 'baby', 'grocery', 'books', 'pets']

export default function AddProductPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  // CHANGED: حالة لتتبع تقدم رفع الصور
  const [uploadProgress, setUploadProgress] = useState(0)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discount_percentage: 0,
    category: categories[0],
    stock_quantity: '',
    city: '',
    contact_number: '',
    condition: 'new',
    is_featured: false
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  if (!user || profile?.account_type !== 'seller') {
    return <div className="text-center py-20">غير مصرح لك – يجب أن تكون بائعاً</div>
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(files)
    setImagePreviews(files.map(file => URL.createObjectURL(file)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUploadProgress(0) // CHANGED: إعادة تعيين التقدم
    try {
      let compare_at_price = null
      if (formData.discount_percentage > 0 && formData.price) {
        const originalPrice = parseFloat(formData.price) / (1 - formData.discount_percentage / 100)
        compare_at_price = parseFloat(originalPrice.toFixed(2))
      }

      const productData = {
        seller_id: user.id,
        name: formData.title,
        slug: formData.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        description: formData.description,
        price: parseFloat(formData.price),
        compare_at_price: compare_at_price,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category: formData.category,
        city: formData.city,
        condition: formData.condition,
        is_featured: formData.is_featured,
        is_hidden: false,
        is_approved: true,
        is_active: true,
        images: [],
        cover_image: ''
      }

      const newProduct = await addProduct(productData)
      if (!newProduct?.id) throw new Error('لم يتم استلام معرف المنتج')

      if (imageFiles.length > 0) {
        // CHANGED: رفع الصور مع تتبع التقدم
        const imageUrls = await uploadProductImages(imageFiles, newProduct.id, (progress) => {
          setUploadProgress(progress)
        })
        await updateProduct(newProduct.id, { images: imageUrls, cover_image: imageUrls[0] || '' })
      }

      toast.success('تم نشر المنتج بنجاح')
      navigate(`/product/${newProduct.id}`)
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gold mb-8 text-right border-b border-gold/30 pb-4 inline-block w-full">
        إضافة منتج جديد
      </h1>
      <form onSubmit={handleSubmit} className="bg-primary-card/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-gold/30 shadow-xl">
        {/* اسم المنتج */}
        <div className="mb-6">
          <label className="block text-gold font-medium mb-2 text-right">اسم المنتج</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
            placeholder="مثال: هاتف ذكي - شاشة 6.7 بوصة"
          />
        </div>

        {/* الوصف */}
        <div className="mb-6">
          <label className="block text-gold font-medium mb-2 text-right">الوصف</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            required
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 resize-y placeholder:text-gray-400"
            placeholder="صف المنتج بالتفصيل ..."
          />
        </div>

        {/* السعر والخصم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gold font-medium mb-2 text-right">السعر (ريال)</label>
            <input
              type="number"
              step="0.01"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-gold font-medium mb-2 text-right">نسبة الخصم (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              placeholder="0"
            />
          </div>
        </div>

        {/* القسم والكمية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gold font-medium mb-2 text-right">القسم</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-white">{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gold font-medium mb-2 text-right">الكمية المتاحة</label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              placeholder="0"
            />
          </div>
        </div>

        {/* المدينة ورقم التواصل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gold font-medium mb-2 text-right">المدينة</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              placeholder="مثال: الرياض"
            />
          </div>
          <div>
            <label className="block text-gold font-medium mb-2 text-right">رقم التواصل (اختياري)</label>
            <input
              type="tel"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200 placeholder:text-gray-400"
              placeholder="05xxxxxxxx"
            />
          </div>
        </div>

        {/* حالة المنتج */}
        <div className="mb-6">
          <label className="block text-gold font-medium mb-2 text-right">حالة المنتج</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all duration-200"
          >
            <option value="new">جديد</option>
            <option value="used">مستعمل</option>
            <option value="refurbished">مجدد</option>
          </select>
        </div>

        {/* مميز */}
        <div className="mb-6 flex items-center justify-end gap-3 bg-secondary-blue/30 p-4 rounded-xl border border-gold/20">
          <label htmlFor="is_featured" className="text-gold cursor-pointer text-base">منتج مميز</label>
          <input
            type="checkbox"
            id="is_featured"
            name="is_featured"
            checked={formData.is_featured}
            onChange={handleChange}
            className="w-5 h-5 text-gold bg-white border-gold/30 rounded focus:ring-gold focus:ring-1"
          />
        </div>

        {/* صور المنتج */}
        <div className="mb-8">
          <label className="block text-gold font-medium mb-3 text-right">صور المنتج</label>
          <div className="flex flex-col items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gold/40 rounded-xl cursor-pointer bg-white/30 hover:bg-white/50 transition-all duration-200">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-2 text-gold" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-1 text-sm text-gray-700">انقر لرفع الصور أو اسحبها</p>
                <p className="text-xs text-gray-500">PNG, JPG, JPEG (الحد الأقصى 5 صور)</p>
              </div>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          {imagePreviews.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap justify-center">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img src={src} alt={`preview-${idx}`} className="w-24 h-24 object-cover rounded-xl border border-gold/30 shadow-md transition-transform group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreviews(prev => prev.filter((_, i) => i !== idx))
                      setImageFiles(prev => prev.filter((_, i) => i !== idx))
                    }}
                    className="absolute -top-2 -right-2 bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* CHANGED: شريط تقدم رفع الصور */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div className="bg-gold h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-sm text-text-secondary mt-1 text-center">جاري رفع الصور: {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* زر الإرسال */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-lg font-bold bg-gradient-to-r from-gold to-amber-600 text-primary-blue hover:from-amber-600 hover:to-gold transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-primary-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {uploadProgress > 0 && uploadProgress < 100 ? `رفع الصور ${uploadProgress}%...` : 'جاري النشر...'}
            </span>
          ) : (
            'نشر المنتج'
          )}
        </Button>
      </form>
    </div>
  )
}

