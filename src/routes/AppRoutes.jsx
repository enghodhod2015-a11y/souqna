import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// ─── الصفحات العامة ───
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ProductDetailsPage from '../pages/ProductDetailsPage'
import SearchPage from '../pages/SearchPage'
import ContactPage from '../pages/ContactPage'

// ─── صفحات المشتري ───
import OrdersPage from '../pages/OrdersPage'
import InboxPage from '../pages/InboxPage'
import ProfilePage from '../pages/ProfilePage'
import CheckoutPage from '../pages/CheckoutPage'

// ─── صفحات البائع ───
import AddProductPage from '../pages/AddProductPage'
import EditProductPage from '../pages/EditProductPage'   // ✅ أضف هذا السطر
import MyProductsPage from '../pages/MyProductsPage'
import SellerOrdersPage from '../pages/SellerOrdersPage'
import SellerDashboardPage from '../pages/SellerDashboardPage'

// ─── صفحات الأدمن ───
import AdminDashboardPage from '../pages/AdminDashboardPage'

// ─── صفحة المحادثة ───
import ChatPage from '../pages/ChatPage'

export default function AppRoutes() {
  return (
    <Routes>
      {/* الصفحات العامة */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* صفحات المشتري (محمية) */}
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <OrdersPage />
        </ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <InboxPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/checkout" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <CheckoutPage />
        </ProtectedRoute>
      } />

      {/* صفحات البائع */}
      <Route path="/add-product" element={
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
          <AddProductPage />
        </ProtectedRoute>
      } />
      {/* ✅ أضف هذا المسار الجديد */}
      <Route path="/edit-product/:id" element={
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
          <EditProductPage />
        </ProtectedRoute>
      } />
      <Route path="/my-products" element={
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
          <MyProductsPage />
        </ProtectedRoute>
      } />
      <Route path="/seller-orders" element={
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
          <SellerOrdersPage />
        </ProtectedRoute>
      } />
      <Route path="/seller/dashboard" element={
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
          <SellerDashboardPage />
        </ProtectedRoute>
      } />

      {/* صفحات الأدمن */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboardPage />
        </ProtectedRoute>
      } />

      {/* المحادثة (مشتركة) */}
      <Route path="/chat/product/:productId" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <ChatPage />
        </ProtectedRoute>
      } />
      <Route path="/chat/c/:conversationId" element={
        <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
          <ChatPage />
        </ProtectedRoute>
      } />
    </Routes>
  )
}