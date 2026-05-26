import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ProfilePage from '../pages/ProfilePage'
import AddProductPage from '../pages/AddProductPage'
import MyProductsPage from '../pages/MyProductsPage'
import ProductDetailsPage from '../pages/ProductDetailsPage'
import EditProductPage from '../pages/EditProductPage'
import CheckoutPage from '../pages/CheckoutPage'
import PaymentPage from '../pages/PaymentPage'
import OrdersPage from '../pages/OrdersPage'
import SellerOrdersPage from '../pages/SellerOrdersPage'
import ChatPage from '../pages/ChatPage'
import InboxPage from '../pages/InboxPage'
import SellerDashboardPage from '../pages/SellerDashboardPage'
import AdminDashboardPage from '../pages/AdminDashboardPage'

export const AppRoutes = () => (
  <Routes>
    <Route path="/add-product" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><AddProductPage /></ProtectedRoute>} />
    <Route path="/my-products" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><MyProductsPage /></ProtectedRoute>} />
    <Route path="/product/:id" element={<ProductDetailsPage />} />
    <Route path="/edit-product/:id" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><EditProductPage /></ProtectedRoute>} />
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
    <Route path="/payment/:orderId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
    <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
    <Route path="/seller-orders" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><SellerOrdersPage /></ProtectedRoute>} />
    <Route path="/chat/:productId/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
    <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
    <Route path="/seller/dashboard" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><SellerDashboardPage /></ProtectedRoute>} />
    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
  </Routes>
)