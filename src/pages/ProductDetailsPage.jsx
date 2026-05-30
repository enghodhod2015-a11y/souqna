<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>سوقنا | تفاصيل المنتج</title>
  <!-- Google Fonts: Cairo -->
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Supabase JS CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', sans-serif;
      background: #f3f4f6;
      color: #1f2937;
      line-height: 1.5;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* توزيع جديد: عمودي تماماً */
    .product-detail {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* صورة رئيسية */
    .main-image {
      width: 100%;
      border-radius: 24px;
      box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15);
      background: #fff;
      overflow: hidden;
    }
    .main-image img {
      width: 100%;
      display: block;
      object-fit: cover;
      max-height: 500px;
    }

    /* صور صغيرة */
    .thumbnails {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .thumb {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 16px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: 0.2s;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .thumb:hover {
      border-color: #2563eb;
      transform: scale(0.98);
    }

    /* معلومات النص */
    .product-title {
      font-size: 28px;
      font-weight: 800;
      color: #1a1a1a;
      text-align: right;
      margin-bottom: 0.75rem;
    }
    .product-price {
      font-size: 32px;
      font-weight: 800;
      color: #16a34a;
      margin: 0.5rem 0 0.25rem;
    }
    .old-price {
      font-size: 18px;
      color: #9ca3af;
      text-decoration: line-through;
      margin-right: 0.75rem;
    }
    .product-description {
      color: #4b5563;
      line-height: 1.8;
      text-align: right;
      margin: 1.5rem 0;
      font-size: 1rem;
    }

    /* كروت المعلومات */
    .info-card {
      background-color: #f9fafb;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      margin-top: 1rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }
    .info-label {
      font-weight: 700;
      color: #374151;
    }
    .info-value {
      color: #4b5563;
      text-align: left;
    }
    .contact-badge {
      background: #dbeafe;
      padding: 0.75rem;
      border-radius: 12px;
      margin-top: 1rem;
      text-align: center;
      font-weight: 600;
      color: #1e40af;
    }

    /* أزرار الإجراءات - تصميم عصري 2026 */
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 2rem;
      justify-content: flex-start;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1.8rem;
      border-radius: 14px;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      color: white;
      background: #2563eb; /* fallback */
    }
    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
    }
    .btn-action:active {
      transform: scale(0.97);
    }
    /* ألوان خاصة لكل زر */
    .btn-inquiry { background-color: #2563eb; }
    .btn-inquiry:hover { background-color: #1d4ed8; }
    .btn-buy { background-color: #16a34a; }
    .btn-buy:hover { background-color: #15803d; }
    .btn-share { background-color: #7c3aed; }
    .btn-share:hover { background-color: #6d28d9; }
    .btn-edit { background-color: #f59e0b; }
    .btn-edit:hover { background-color: #d97706; }
    .btn-delete { background-color: #dc2626; }
    .btn-delete:hover { background-color: #b91c1c; }

    /* تنسيق الموبايل: الأزرار عمودية */
    @media (max-width: 640px) {
      .action-buttons {
        flex-direction: column;
        width: 100%;
      }
      .btn-action {
        width: 100%;
        justify-content: center;
        padding: 0.75rem;
      }
      .container {
        padding: 1rem;
      }
      .product-title {
        font-size: 24px;
      }
      .product-price {
        font-size: 28px;
      }
    }

    /* حالة التحميل */
    .loading-state, .error-state {
      text-align: center;
      padding: 3rem;
      font-size: 1.2rem;
      color: #4b5563;
    }
    .hidden {
      display: none;
    }
    hr {
      margin: 1rem 0;
      border-color: #e5e7eb;
    }
  </style>
</head>
<body>
<div class="container" id="app">
  <!-- سيتم ملء المحتوى ديناميكياً -->
  <div id="loading" class="loading-state">جاري تحميل المنتج...</div>
  <div id="productDetail" class="product-detail" style="display: none;"></div>
</div>

<script>
  // ⚠️ بيئة Supabase – نفس البيانات المستخدمة في المشروع الأصلي
  const SUPABASE_URL = "https://utmhjbeyrwohrvfobibl.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0bWhqYmV5cndvaHJ2Zm9iaWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxODcsImV4cCI6MjA5NTU3MTE4N30.h7DXP-7_PrXZA5uypKMoRNckheeAPHqwnN89aEVMyOc";
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // استخراج معرف المنتج من الرابط (يدعم /product/ID أو ?id=...)
  const getProductIdFromUrl = () => {
    const path = window.location.pathname;
    const match = path.match(/\/product\/(\d+)/);
    if (match) return match[1];
    const params = new URLSearchParams(window.location.search);
    if (params.has('id')) return params.get('id');
    return null;
  };

  let currentProduct = null;
  let currentUser = null;     // سنحاكي حالة المستخدم (للتجربة نسمح بتسجيل دخول وهمي، لكن الحفاظ على نفس الوظائف)
  let currentProfile = null;

  // ⚡ وظيفة جلب بيانات المستخدم من localstorage (محاكاة للجلسة)
  async function fetchAuth() {
    // نستخدم نفس بنية AuthContext بالضبط: نجلب الجلسة من supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      currentProfile = profile;
    } else {
      currentUser = null;
      currentProfile = null;
    }
  }

  // دالة loadProduct مطابقة تماماً للكود الأصلي (نسخة معدلة لتتناسب مع HTML)
  async function loadProduct(productId) {
    try {
      const numericId = parseInt(productId, 10);
      if (isNaN(numericId)) throw new Error('معرف المنتج غير صالح');
      console.log("🔍 جلب المنتج بالرقم:", numericId);
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', numericId)
        .single();
      if (error) throw error;
      if (product?.seller_id) {
        const { data: seller } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone, city')
          .eq('id', product.seller_id)
          .maybeSingle();
        if (seller) product.seller = seller;
      }
      // إضافة حقول title و final_price
      product.title = product.name;
      product.final_price = product.price;
      if (product.compare_at_price && product.compare_at_price > product.price) {
        product.discount_percentage = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
      } else {
        product.discount_percentage = 0;
      }
      return product;
    } catch (err) {
      console.error("❌ فشل جلب المنتج:", err);
      throw err;
    }
  }

  // دالة deleteProduct
  async function deleteProduct(productId) {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    return true;
  }

  // معالجات الأزرار (نفس السلوك تماماً)
  function handleBuy(product) {
    if (!currentUser) {
      toastMessage('يرجى تسجيل الدخول أولاً للشراء', 'error');
      window.location.href = '/login';
      return;
    }
    if (currentUser.id === product.seller_id) {
      toastMessage('لا يمكنك شراء منتجك الخاص', 'error');
      return;
    }
    window.location.href = `/checkout?productId=${product.id}`;
  }

  function handleInquiry(product) {
    if (!currentUser) {
      toastMessage('يرجى تسجيل الدخول أولاً للمراسلة', 'error');
      window.location.href = '/login';
      return;
    }
    if (currentUser.id === product.seller_id) {
      toastMessage('لا يمكنك مراسلة نفسك', 'error');
      return;
    }
    window.location.href = `/chat/product/${product.id}`;
  }

  function handleEdit(product) {
    window.location.href = `/edit-product/${product.id}`;
  }

  async function handleDelete(product) {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.');
    if (!confirmed) return;
    try {
      await deleteProduct(product.id);
      toastMessage('تم حذف المنتج بنجاح', 'success');
      window.location.href = '/';
    } catch (err) {
      toastMessage(err.message, 'error');
    }
  }

  function handleShare(product) {
    const url = `${window.location.origin}/product/${product.id}`;
    navigator.clipboard.writeText(url);
    toastMessage('تم نسخ رابط المنتج', 'success');
  }

  // مساعد للإشعارات
  function toastMessage(msg, type) {
    // إشعار بسيط (يمكن استخدام alert لكن الأفضل toast محاكي)
    alert(msg);
  }

  // عرض الواجهة وفق التصميم الجديد
  async function renderProduct() {
    const productId = getProductIdFromUrl();
    if (!productId) {
      document.getElementById('loading').innerHTML = '<div class="error-state">رابط المنتج غير صالح</div>';
      return;
    }
    try {
      await fetchAuth();
      const product = await loadProduct(productId);
      currentProduct = product;
      const isOwner = currentUser && currentUser.id === product.seller_id;
      const isAdmin = currentProfile?.account_type === 'admin';
      const showEditDelete = isOwner || isAdmin;

      const container = document.getElementById('productDetail');
      const loadingDiv = document.getElementById('loading');

      // توزيع الصور والمحتوى حسب الطلب (صورة فوق ، ثم عنوان، سعر، وصف، معلومات، وأخيراً الأزرار)
      let imagesHtml = '';
      if (product.images && product.images.length) {
        imagesHtml = `<div class="thumbnails">${product.images.map((img, i) => `<img src="${img}" class="thumb" onclick="window.open('${img}')" alt="صورة ${i+1}">`).join('')}</div>`;
      }
      const mainImage = product.cover_image || (product.images?.[0]) || 'https://placehold.co/600x400';

      // معلومات إضافية (البائع/التفاصيل) ضمن كرت f9fafb
      let extraInfo = `
        <div class="info-card">
          <div class="info-row"><span class="info-label">المدينة:</span><span class="info-value">${product.city || 'غير محدد'}</span></div>
          <div class="info-row"><span class="info-label">الحالة:</span><span class="info-value">${product.condition === 'new' ? 'جديد' : (product.condition === 'used' ? 'مستعمل' : 'مجدد')}</span></div>
          ${isOwner && product.contact_number ? `<div class="contact-badge"><strong>رقم التواصل الخاص بك:</strong> ${product.contact_number}</div>` : ''}
        </div>
      `;

      // بناء الأزرار (5 أزرار) حسب الصلاحيات مع أيقونات إموجي
      const showInquiryBtn = true;
      const showBuyBtn = true;
      const showShareBtn = true;

      let buttonsHtml = `
        <div class="action-buttons">
          ${showInquiryBtn ? `<button class="btn-action btn-inquiry" id="inquiryBtn">💬 استعلام</button>` : ''}
          ${showBuyBtn ? `<button class="btn-action btn-buy" id="buyBtn">🛒 شراء</button>` : ''}
          ${showShareBtn ? `<button class="btn-action btn-share" id="shareBtn">🔗 مشاركة</button>` : ''}
          ${showEditDelete ? `<button class="btn-action btn-edit" id="editBtn">✏️ تعديل</button>` : ''}
          ${showEditDelete ? `<button class="btn-action btn-delete" id="deleteBtn">🗑️ حذف</button>` : ''}
        </div>
      `;

      const htmlContent = `
        <div class="main-image">
          <img src="${mainImage}" alt="${product.title}" id="mainImg">
        </div>
        ${imagesHtml}
        <div class="product-title">${product.title}</div>
        <div class="product-price">
          ${product.final_price} ريال
          ${product.discount_percentage > 0 ? `<span class="old-price">${product.price} ريال</span>` : ''}
        </div>
        <div class="product-description">${product.description || 'لا يوجد وصف'}</div>
        ${extraInfo}
        ${buttonsHtml}
      `;

      container.innerHTML = htmlContent;
      container.style.display = 'flex';
      loadingDiv.style.display = 'none';

      // ربط الأحداث بعد التحميل
      if (showInquiryBtn) document.getElementById('inquiryBtn')?.addEventListener('click', () => handleInquiry(product));
      if (showBuyBtn) document.getElementById('buyBtn')?.addEventListener('click', () => handleBuy(product));
      if (showShareBtn) document.getElementById('shareBtn')?.addEventListener('click', () => handleShare(product));
      if (showEditDelete) {
        document.getElementById('editBtn')?.addEventListener('click', () => handleEdit(product));
        document.getElementById('deleteBtn')?.addEventListener('click', () => handleDelete(product));
      }
    } catch (err) {
      document.getElementById('loading').innerHTML = `<div class="error-state">حدث خطأ: ${err.message}</div>`;
    }
  }

  renderProduct();
</script>
</body>
</html>

