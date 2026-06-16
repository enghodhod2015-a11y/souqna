import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Users, Package, DollarSign, ShoppingBag, RefreshCw, Receipt } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import AdminDashboardHomeTab from './AdminDashboardHomeTab';
import AdminUsersTab from './AdminUsersTab';
import AdminProductsTab from './AdminProductsTab';
import AdminFinanceTab from './AdminFinanceTab';
import AdminOrdersTab from './AdminOrdersTab';
import AdminReceiptsReviewTab from './AdminReceiptsReviewTab';
import { isCurrentUserAdmin } from '../../services/adminGuard';
import toast from 'react-hot-toast';

export default function AdminDashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('sellers');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [sellerFilterId, setSellerFilterId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          toast.error('⚠️ هذه الصفحة مخصصة للأدمن فقط');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error('خطأ في التحقق من صلاحية الأدمن:', err);
        toast.error('حدث خطأ في التحقق من الصلاحيات');
      } finally {
        setChecked(true);
      }
    };
    checkAdmin();
  }, [navigate]);

  const refreshAllData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['adminSalesChart'] });
    await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    await queryClient.invalidateQueries({ queryKey: ['pendingSellers'] });
    await queryClient.invalidateQueries({ queryKey: ['adminOrderItems'] });
    await queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
    await queryClient.invalidateQueries({ queryKey: ['pendingAdminReceipts'] });
  };

  if (!checked) {
    return <div className="text-center py-20 text-text-secondary">جاري التحقق من الصلاحيات...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 text-center max-w-md mx-auto mt-20">
        <p className="text-red-400 mb-2 text-xl">⛔ غير مصرح بالوصول</p>
        <p className="text-text-secondary mb-4">هذه الصفحة مخصصة للأدمن فقط. سيتم توجيهك إلى الرئيسية.</p>
        <Button onClick={() => navigate('/')} className="bg-gold text-primary-blue">العودة للرئيسية</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-tajawal">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button onClick={refreshAllData} className="bg-gray-700 hover:bg-gray-600 text-white shadow-md rounded-lg px-4 py-2 transition-all flex items-center gap-2">
          <RefreshCw size={16} /> تحديث الكل
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        {['dashboard', 'users', 'products', 'finance', 'receipts', 'orders'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveMainTab(tab);
              if (tab === 'users') setActiveSubTab('sellers');
            }}
            className={`px-5 py-2 rounded-t-lg transition-all duration-200 flex items-center gap-2 font-medium ${
              activeMainTab === tab
                ? 'bg-gradient-to-r from-gold to-amber-500 text-primary-blue shadow-md'
                : 'bg-primary-card/60 text-text-secondary hover:bg-secondary-blue/50 hover:text-white'
            }`}
          >
            {tab === 'dashboard' && <BarChart3 size={18} />}
            {tab === 'users' && <Users size={18} />}
            {tab === 'products' && <Package size={18} />}
            {tab === 'finance' && <DollarSign size={18} />}
            {tab === 'receipts' && <Receipt size={18} />}
            {tab === 'orders' && <ShoppingBag size={18} />}
            {tab === 'dashboard' && ' لوحة المعلومات'}
            {tab === 'users' && ' المستخدمين'}
            {tab === 'products' && ' إدارة المنتجات'}
            {tab === 'finance' && ' المالية'}
            {tab === 'receipts' && ' مراجعة الإيصالات'}
            {tab === 'orders' && ' الطلبات والاستفسارات'}
          </button>
        ))}
      </div>

      {activeMainTab === 'dashboard' && <AdminDashboardHomeTab />}
      {activeMainTab === 'users' && (
        <AdminUsersTab
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSeller={selectedSeller}
          setSelectedSeller={setSelectedSeller}
          selectedBuyer={selectedBuyer}
          setSelectedBuyer={setSelectedBuyer}
          sellerFilterId={sellerFilterId}
          setSellerFilterId={setSellerFilterId}
          navigate={navigate}
        />
      )}
      {activeMainTab === 'products' && (
        <AdminProductsTab
          sellerFilterId={sellerFilterId}
          setSellerFilterId={setSellerFilterId}
          navigate={navigate}
        />
      )}
      {activeMainTab === 'finance' && (
        <AdminFinanceTab
          selectedSeller={selectedSeller}
          setSelectedSeller={setSelectedSeller}
          navigate={navigate}
        />
      )}
      {activeMainTab === 'receipts' && <AdminReceiptsReviewTab />}
      {activeMainTab === 'orders' && <AdminOrdersTab navigate={navigate} />}
    </div>
  );
}

