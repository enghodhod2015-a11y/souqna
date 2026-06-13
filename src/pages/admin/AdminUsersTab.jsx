// src/pages/admin/AdminUsersTab.jsx
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Send, Search, UserCog } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

export default function AdminUsersTab({
  activeSubTab,
  setActiveSubTab,
  searchTerm,
  setSearchTerm,
  selectedSeller,
  setSelectedSeller,
  selectedBuyer,
  setSelectedBuyer,
  sellerFilterId,
  setSellerFilterId,
  navigate
}) {
  const queryClient = useQueryClient();
  const [sellerDetailTab, setSellerDetailTab] = useState('profile');
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState(10);
  const [sellerStats, setSellerStats] = useState({...}); // كامل الحالة

  // جلب المستخدمين
  const { data: users, refetch: refetchUsers } = useQuery({...});
  // جلب البائعين المعلقين
  const { data: pendingSellers, refetch: refetchPendingSellers } = useQuery({...});

  // دوال التحديث والإشعارات (منقولة كما هي)
  const updateUserMutation = async ({ userId, updates }) => {...};
  const approveSellerMutation = async ({ sellerId, approved, notes }) => {...};
  const sendNotificationToUser = async (userId, message, title, type, relatedId) => {...};
  const sendToAllUsers = async () => {...};

  // إحصائيات البائع المختار
  useEffect(() => {
    if (selectedSeller?.id) fetchSellerStats();
  }, [selectedSeller]);

  // العرض
  return ( ... ); // كل واجهة المستخدمين من الملف الأصلي
}

