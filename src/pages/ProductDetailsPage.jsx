<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تفاصيل المنتج - سوقنا Souqna</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #f8f9fa;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .product-image-main {
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .product-image-main img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    .product-title {
      font-size: 28px;
      font-weight: 800;
      color: #1a1a1a;
      text-align: right;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .product-price {
      font-size: 32px;
      font-weight: 800;
      color: #16a34a;
      text-align: right;
      margin-bottom: 20px;
    }
    .product-price .old-price {
      font-size: 20px;
      color: #9ca3af;
      text-decoration: line-through;
      margin-right: 12px;
      font-weight: 600;
    }
    .product-description {
      font-size: 16px;
      color: #4b5563;
      line-height: 1.8;
      text-align: right;
      margin-bottom: 24px;
      padding: 16px;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }
    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .info-card {
      background: #f9fafb;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      text-align: right;
    }
    .info-card strong {
      color: #374151;
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }
    .info-card span {
      color: #1a1a1a;
      font-weight: 600;
      font-size: 15px;
    }
    .contact-info {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 16px;
      border-radius: 10px;
      margin-bottom: 24px;
      text-align: right;
    }
    .contact-info strong {
      color: #92400e;
    }
    .contact-info span {
      color: #1a1a1a;
      font-weight: 700;
    }
    .actions-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .action-btn {
      flex: 1;
      min-width: 140px;
      padding: 14px 20px;
      border: none;
      border-radius: 14px;
      font-family: 'Cairo', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    .action-btn:active {
      transform: scale(0.97);
    }
    .btn-inquiry { background: #2563eb; }
    .btn-buy { background: #16a34a; }
    .btn-share { background: #7c3aed; }
    .btn-edit { background: #f59e0b; }
    .btn-delete { background: #dc2626; }
    .btn-icon {
      font-size: 18px;
    }
    .thumbnails {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .thumbnail {
      width: 80px;
      height: 80px;
      border-radius: 10px;
      object-fit: cover;
      cursor: pointer;
      border: 2px solid #e5e7eb;
      transition: all 0.2s;
    }
    .thumbnail:hover {
      border-color: #f59e0b;
      transform: scale(1.05);
    }
    .loading, .error {
      text-align: center;
      padding: 80px 20px;
      font-size: 18px;
      color: #6b7280;
    }
    @media (max-width: 640px) {
      .actions-container {
        flex-direction: column;
      }
      .action-btn {
        width: 100%;
        min-width: unset;
      }
      .product-title {
        font-size: 24px;
      }
      .product-price {
        font-size: 28px;
      }
      .info-cards {
        grid-template-columns: 1fr;
      }
    }
  </style>
<base target="_blank">
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6/umd/react-router-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-hot-toast@2/dist/react-hot-toast.umd.js" crossorigin></script>
  <script type="text/babel">
    const { useState, useEffect } = React;
    const { useParams, useNavigate, BrowserRouter, Routes, Route } = ReactRouterDOM;
    const toast = window.toast || { success: ()=>{}, error: ()=>{} };

    // Mock services
    const getProductById = async (id) => {
      return {
        id: id,
        name: "آيفون 15 برو ماكس - 256GB",
        title: "آيفون 15 برو ماكس - 256GB",
        description: "هاتف أيفون 15 برو ماكس بحالة ممتازة، استخدام 3 أشهر فقط. يأتي مع الشاحن الأصلي وكفر حماية. البطارية 100%. اللون: تيتانيوم أزرق. ضمان سنتين من آبل متبقي.",
        price: 4500,
        final_price: 3999,
        discount_percentage: 11,
        city: "الرياض",
        condition: "used",
        contact_number: "0501234567",
        seller_id: "user_123",
        cover_image: "https://placehold.co/800x600/1a1a1a/FFF?text=iPhone+15+Pro+Max",
        images: [
          "https://placehold.co/400x400/2563eb/FFF?text=صورة+1",
          "https://placehold.co/400x400/16a34a/FFF?text=صورة+2",
          "https://placehold.co/400x400/7c3aed/FFF?text=صورة+3"
        ]
      };
    };
    const deleteProduct = async (id) => {
      return true;
    };

    // Mock Auth Context
    const AuthContext = React.createContext();
    const useAuth = () => {
      return {
        user: { id: "user_456", name: "أحمد" },
        profile: { account_type: "user" }
      };
    };

    // Button Component
    const Button = ({ children, onClick, variant, className }) => {
      return (
        <button onClick={onClick} className={className}>
          {children}
        </button>
      );
    };

    // Icons (Emoji replacements)
    const ShoppingCart = () => <span className="btn-icon">🛒</span>;
    const MessageCircle = () => <span className="btn-icon">💬</span>;
    const Edit = () => <span className="btn-icon">✏️</span>;
    const Trash2 = () => <span className="btn-icon">🗑️</span>;
    const Share2 = () => <span className="btn-icon">🔗</span>;

    // Main Product Details Page
    function ProductDetailsPage() {
      const { id, productId } = useParams();
      const rawId = id || productId;
      const targetId = rawId && rawId !== 'undefined' ? rawId : null;

      const navigate = useNavigate();
      const { user, profile } = useAuth();
      const [product, setProduct] = useState(null);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        if (targetId) loadProduct();
        else setLoading(false);
      }, [targetId]);

      const loadProduct = async () => {
        try {
          setLoading(true);
          const data = await getProductById(targetId);
          setProduct(data);
        } catch (err) {
          console.error(err);
          toast.error(err.message);
        } finally {
          setLoading(false);
        }
      };

      const handleBuy = () => {
        if (!product) return;
        if (!user) {
          toast.error('يرجى تسجيل الدخول أولاً للشراء');
          navigate('/login');
          return;
        }
        if (user.id === product.seller_id) {
          toast.error('لا يمكنك شراء منتجك الخاص');
          return;
        }
        navigate('/checkout', { state: { product, quantity: 1 } });
      };

      const handleInquiry = () => {
        if (!user) {
          toast.error('يرجى تسجيل الدخول أولاً للمراسلة');
          navigate('/login');
          return;
        }
        if (user.id === product.seller_id) {
          toast.error('لا يمكنك مراسلة نفسك');
          return;
        }
        navigate(`/chat/product/${product.id}`);
      };

      const handleEdit = () => {
        navigate(`/edit-product/${product.id}`);
      };

      const handleDelete = async () => {
        const confirmed = window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.');
        if (!confirmed) return;
        try {
          await deleteProduct(product.id);
          toast.success('تم حذف المنتج بنجاح');
          navigate('/');
        } catch (err) {
          toast.error(err.message);
        }
      };

      const handleShare = () => {
        const url = `${window.location.origin}/product/${product.id}`;
        navigator.clipboard.writeText(url);
        toast.success('تم نسخ رابط المنتج');
      };

      const isOwner = user && user.id === product?.seller_id;
      const isAdmin = profile?.account_type === 'admin';

      if (loading) return <div className="loading">جاري التحميل...</div>;
      if (!targetId) return <div className="error">رابط المنتج غير صالح</div>;
      if (!product) return <div className="error">المنتج غير موجود</div>;

      return (
        <div className="container">
          {/* صورة المنتج الرئيسية */}
          <div className="product-image-main">
            <img
              src={product.cover_image || 'https://placehold.co/800x600'}
              alt={product.name || product.title}
            />
          </div>

          {/* الصور المصغرة */}
          <div className="thumbnails">
            {(product.images || []).map((img, i) => (
              <img
                key={i}
                src={img}
                className="thumbnail"
                onClick={() => window.open(img)}
                alt={`صورة ${i + 1}`}
              />
            ))}
          </div>

          {/* عنوان المنتج */}
          <h1 className="product-title">
            {product.name || product.title}
          </h1>

          {/* السعر */}
          <div className="product-price">
            {product.final_price || product.price} ريال
            {product.discount_percentage > 0 && (
              <span className="old-price">{product.price} ريال</span>
            )}
          </div>

          {/* الوصف */}
          <div className="product-description">
            {product.description}
          </div>

          {/* معلومات البائع - كروت صغيرة */}
          <div className="info-cards">
            <div className="info-card">
              <strong>المدينة</strong>
              <span>{product.city || 'غير محدد'}</span>
            </div>
            <div className="info-card">
              <strong>الحالة</strong>
              <span>
                {product.condition === 'new' ? 'جديد' :
                 product.condition === 'used' ? 'مستعمل' : 'مجدد'}
              </span>
            </div>
            <div className="info-card">
              <strong>الخصم</strong>
              <span>{product.discount_percentage > 0 ? product.discount_percentage + '%' : 'لا يوجد'}</span>
            </div>
          </div>

          {/* رقم التواصل للمالك */}
          {isOwner && product.contact_number && (
            <div className="contact-info">
              <strong>رقم التواصل الخاص بك: </strong>
              <span>{product.contact_number}</span>
            </div>
          )}

          {/* صف الأزرار الخمسة */}
          <div className="actions-container">
            {/* استعلام */}
            <button className="action-btn btn-inquiry" onClick={handleInquiry}>
              <MessageCircle /> استعلام
            </button>

            {/* شراء */}
            <button className="action-btn btn-buy" onClick={handleBuy}>
              <ShoppingCart /> شراء
            </button>

            {/* مشاركة */}
            <button className="action-btn btn-share" onClick={handleShare}>
              <Share2 /> مشاركة
            </button>

            {/* تعديل وحذف - للمالك أو الأدمن */}
            {(isOwner || isAdmin) && (
              <>
                <button className="action-btn btn-edit" onClick={handleEdit}>
                  <Edit /> تعديل
                </button>
                <button className="action-btn btn-delete" onClick={handleDelete}>
                  <Trash2 /> حذف
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    // App
    function App() {
      return (
        <BrowserRouter>
          <Routes>
            <Route path="/product/:id" element={<ProductDetailsPage />} />
            <Route path="/product/:id/:productId" element={<ProductDetailsPage />} />
            <Route path="/" element={<div className="container" style={{textAlign:'center',padding:'80px 20px'}}><h1>سوقنا Souqna</h1><p>الصفحة الرئيسية</p></div>} />
          </Routes>
        </BrowserRouter>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>

