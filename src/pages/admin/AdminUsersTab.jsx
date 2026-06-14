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
import { Skeleton } from '../../components/ui/Skeleton';
import { ExportButtons } from '../../components/ui/ExportButtons';

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

  // جلب المستخدمين
  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) throw error;
      for (const user of data) {
        const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        user.order_count = orderCount || 0;
        const { data: spentData } = await supabase.from('orders').select('total_amount').eq('user_id', user.id).eq('status', 'completed');
        user.total_spent = spentData?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      }
      return data;
    },
    enabled: activeSubTab !== 'pending_users',
    staleTime: 2 * 60 * 1000,
  });

  const { data: pendingSellers = [], refetch: refetchPendingSellers } = useQuery({
    queryKey: ['pendingSellers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').or('account_type.eq.seller,role.eq.seller').eq('is_verified', false);
      if (error) throw error;
      return data || [];
    },
    enabled: activeSubTab === 'pending_users',
    staleTime: 1 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedSeller) setSellerCommissionPercent(selectedSeller.commission_percent ?? 10);
  }, [selectedSeller]);

  const updateUserMutation = async ({ userId, updates }) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    toast.success('تم تحديث المستخدم');
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    if (selectedSeller?.id === userId) setSelectedSeller(prev => ({ ...prev, ...updates }));
    if (selectedBuyer?.id === userId) setSelectedBuyer(prev => ({ ...prev, ...updates }));
  };

  const approveSellerMutation = async ({ sellerId, approved, notes }) => {
    const { error } = await supabase.from('profiles').update({ is_verified: approved, admin_notes: notes }).eq('id', sellerId);
    if (error) throw error;
    toast.success(approved ? 'تم قبول البائع' : 'تم رفض البائع');
    refetchPendingSellers();
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    queryClient.invalidateQueries({ queryKey: ['pendingSellers'] });
  };

  const sendNotificationToUser = async (userId, message, title = 'إشعار من الإدارة', type = 'info', relatedId = null) => {
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminId = adminUser.id;
    let conversationId = null;
    const { data: existingList } = await supabase.from('conversations').select('id').or(`buyer_id.eq.${adminId},seller_id.eq.${userId}`).limit(1);
    if (existingList?.length) {
      conversationId = existingList[0].id;
      await supabase.from('conversations').update({ last_message: message, last_message_at: new Date() }).eq('id', conversationId);
    } else {
      const { data: newConv } = await supabase.from('conversations').insert({ buyer_id: adminId, seller_id: userId, product_id: relatedId, last_message: message, last_message_at: new Date() }).select().single();
      conversationId = newConv?.id;
      if (!conversationId) return toast.error('فشل إنشاء محادثة');
    }
    await supabase.from('notifications').insert({ user_id: userId, type, title, message, related_id: conversationId });
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: adminId, receiver_id: userId, message });
    toast.success('تم إرسال الإشعار');
  };

  const sendToAllUsers = async () => {
    const msg = prompt('أدخل نص الإشعار لجميع المستخدمين:');
    if (!msg) return;
    const { data: allUsers } = await supabase.from('profiles').select('id');
    if (allUsers) {
      toast.loading(`جاري إرسال الإشعار إلى ${allUsers.length} مستخدم...`);
      for (const u of allUsers) await sendNotificationToUser(u.id, msg).catch(() => {});
      toast.success('تم إرسال الإشعار لجميع المستخدمين');
    }
  };

  const sellerUsers = users?.filter(u => u.account_type === 'seller' || u.role === 'seller') || [];
  const buyerUsers = users?.filter(u => u.account_type === 'buyer' || u.role === 'customer') || [];

  if (usersLoading && activeSubTab !== 'pending_users') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-4"><Skeleton className="flex-1 h-10 rounded-lg" /><Skeleton className="w-24 h-10 rounded-lg" /></div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={sendToAllUsers}
          className="px-5 py-2 rounded-lg font-bold shadow-md transition-all duration-200 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Send size={16} /> إرسال إشعار لجميع المستخدمين
        </button>
      </div>

      <div className="flex gap-4 border-b border-gold/30 mb-6">
        <button onClick={() => setActiveSubTab('sellers')} className={`px-5 py-2 rounded-t-lg ${activeSubTab === 'sellers' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>البائعين</button>
        <button onClick={() => setActiveSubTab('buyers')} className={`px-5 py-2 rounded-t-lg ${activeSubTab === 'buyers' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>المشترين</button>
        <button onClick={() => setActiveSubTab('pending_users')} className={`px-5 py-2 rounded-t-lg ${activeSubTab === 'pending_users' ? 'bg-gold text-primary-blue shadow-md' : 'text-text-secondary hover:text-white'}`}>
          طلبات التسجيل {pendingSellers?.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellers.length}</span>}
        </button>
      </div>

      {activeSubTab === 'sellers' && (
        <div>
          <div className="mb-5">
            <label className="block text-gold font-medium mb-2">اختر البائع:</label>
            <Select
              value={selectedSeller?.id || ''}
              onChange={e => {
                const seller = sellerUsers.find(u => u.id === e.target.value);
                setSelectedSeller(seller);
                setSellerDetailTab('profile');
                setSellerFilterId(null);
              }}
              className="w-full md:w-1/2 bg-white text-gray-900 border border-gray-300 rounded-lg"
            >
              <option value="" className="text-gray-900">-- اختر بائعاً --</option>
              {sellerUsers.map(s => (
                <option key={s.id} value={s.id} className="text-gray-900">{s.store_name || s.full_name} ({s.email})</option>
              ))}
            </Select>
          </div>
          {selectedSeller && (
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-300">
              <div className="flex gap-3 mb-5 border-b border-gray-300 pb-2">
                <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'profile' ? 'bg-gold text-primary-blue shadow' : 'text-gray-700 hover:bg-gray-100'}`}>الملف الشخصي</button>
                <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'stats' ? 'bg-gold text-primary-blue shadow' : 'text-gray-700 hover:bg-gray-100'}`}>إحصائيات المنتجات</button>
                <button onClick={() => setSellerDetailTab('commission')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'commission' ? 'bg-gold text-primary-blue shadow' : 'text-gray-700 hover:bg-gray-100'}`}>نسبة الموقع</button>
              </div>

              {sellerDetailTab === 'profile' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 p-4 rounded-xl">
                    <div><span className="font-bold text-gray-700">الاسم:</span> <span className="text-gray-900">{selectedSeller.full_name || '-'}</span></div>
                    <div><span className="font-bold text-gray-700">البريد:</span> <span className="text-gray-900">{selectedSeller.email || '-'}</span></div>
                    <div><span className="font-bold text-gray-700">الهاتف:</span> <span className="text-gray-900">{selectedSeller.phone || '-'}</span></div>
                    <div><span className="font-bold text-gray-700">تاريخ التسجيل:</span> <span className="text-gray-900">{formatDate(selectedSeller.created_at)}</span></div>
                    <div><span className="font-bold text-gray-700">الحالة:</span> <span className={selectedSeller.is_banned ? 'text-red-600' : 'text-green-600'}>{selectedSeller.is_banned ? 'محظور' : 'نشط'}</span></div>
                    <div><span className="font-bold text-gray-700">نسبة الموقع:</span> <span className="text-gold font-bold">{sellerCommissionPercent}%</span></div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => updateUserMutation({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })}
                      className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {selectedSeller.is_banned ? 'إلغاء الحظر' : 'حظر'}
                    </button>
                    <button
                      onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(selectedSeller.id, msg); }}
                      className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send size={16} /> إرسال إشعار
                    </button>
                    <button
                      onClick={() => {
                        const newType = selectedSeller.account_type === 'seller' ? 'buyer' : 'seller';
                        if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                          updateUserMutation({ userId: selectedSeller.id, updates: { account_type: newType } });
                      }}
                      className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900"
                    >
                      <UserCog size={16} /> تغيير نوع الحساب
                    </button>
                  </div>
                </div>
              )}

              {sellerDetailTab === 'stats' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <tbody>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">جميع المنتجات المنشورة</td><td className="text-gray-900">{selectedSeller.products_count || 0}</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">المنتجات التي تم بيعها (قطع)</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">منتظرة الدفع</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">تم تأكيد الدفع</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">قيد التجهيز</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">تم الشحن</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">تم التسليم</td><td className="text-gray-900">0</td></tr>
                      <tr className="border-b"><td className="py-2 font-bold text-gray-700">غير مشتراة</td><td className="text-gray-900">0</td></tr>
                    </tbody>
                  </table>
                </div>
              )}

              {sellerDetailTab === 'commission' && (
                <div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-gray-700 mb-2">نسبة الموقع (%)</label>
                      <input type="number" min="0" max="100" value={sellerCommissionPercent} onChange={e => setSellerCommissionPercent(parseFloat(e.target.value) || 0)} className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300" />
                    </div>
                    <button
                      onClick={async () => { await updateUserMutation({ userId: selectedSeller.id, updates: { commission_percent: sellerCommissionPercent } }); toast.success('تم حفظ نسبة الموقع'); }}
                      className="px-5 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-gold text-primary-blue hover:bg-gold/90"
                    >
                      تحديث النسبة
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-3">* سيتم إعادة حساب العمولة والمبلغ المتبقي فوراً</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'buyers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gold">قائمة المشترين</h3>
            <ExportButtons data={buyerUsers} filename="buyers_list" title="قائمة المشترين" columns={[
              { header: 'الاسم', dataKey: 'full_name' },
              { header: 'البريد', dataKey: 'email' },
              { header: 'عدد الطلبات', dataKey: 'order_count' },
              { header: 'إجمالي الإنفاق', dataKey: 'total_spent' }
            ]} />
          </div>
          <div className="flex gap-4 mb-5">
            <Input placeholder="ابحث عن مشتري بالاسم أو البريد" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-lg" />
            <button onClick={() => refetchUsers()} className="px-5 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2">
              <Search size={16} /> بحث
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-300">
            {buyerUsers.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50">
                <div>
                  <div><strong>الاسم:</strong> {u.full_name}</div>
                  <div><strong>البريد:</strong> {u.email}</div>
                  <div><strong>عدد الطلبات:</strong> {u.order_count || 0}</div>
                  <div><strong>إجمالي الإنفاق:</strong> {formatCurrency(u.total_spent || 0)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateUserMutation({ userId: u.id, updates: { is_banned: !u.is_banned } })}
                    className="px-3 py-1 rounded-lg text-sm font-bold shadow-md transition-all duration-200 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {u.is_banned ? 'إلغاء الحظر' : 'حظر'}
                  </button>
                  <button
                    onClick={() => setSelectedBuyer(u)}
                    className="px-3 py-1 rounded-lg text-sm font-bold shadow-md transition-all duration-200 bg-gold text-primary-blue hover:bg-gold/90"
                  >
                    تفاصيل
                  </button>
                  <button
                    onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(u.id, msg); }}
                    className="px-3 py-1 rounded-lg text-sm font-bold shadow-md transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                  >
                    <Send size={12} /> إشعار
                  </button>
                  <button
                    onClick={() => {
                      const newType = u.account_type === 'seller' ? 'buyer' : 'seller';
                      if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                        updateUserMutation({ userId: u.id, updates: { account_type: newType } });
                    }}
                    className="px-3 py-1 rounded-lg text-sm font-bold shadow-md transition-all duration-200 bg-amber-500 hover:bg-amber-600 text-gray-900 flex items-center gap-1"
                  >
                    <UserCog size={12} /> تغيير
                  </button>
                </div>
              </div>
            ))}
            {buyerUsers.length === 0 && <div className="text-center p-4 text-gray-500">لا يوجد مشترين</div>}
          </div>
          {selectedBuyer && (
            <Modal onClose={() => setSelectedBuyer(null)} title="ملف المشتري">
              <div className="space-y-2 text-gray-800">
                <div><strong>الاسم:</strong> {selectedBuyer.full_name}</div>
                <div><strong>البريد:</strong> {selectedBuyer.email}</div>
                <div><strong>الهاتف:</strong> {selectedBuyer.phone || '-'}</div>
                <div><strong>عدد الطلبات:</strong> {selectedBuyer.order_count || 0}</div>
                <div><strong>إجمالي الإنفاق:</strong> {formatCurrency(selectedBuyer.total_spent || 0)}</div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateUserMutation({ userId: selectedBuyer.id, updates: { is_banned: !selectedBuyer.is_banned } })}
                    className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {selectedBuyer.is_banned ? 'إلغاء الحظر' : 'حظر'}
                  </button>
                  <button
                    onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationToUser(selectedBuyer.id, msg); }}
                    className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                  >
                    <Send size={16} /> إرسال إشعار
                  </button>
                  <button
                    onClick={() => {
                      const newType = selectedBuyer.account_type === 'seller' ? 'buyer' : 'seller';
                      if (confirm(`تغيير نوع الحساب إلى ${newType === 'seller' ? 'بائع' : 'مشتري'}؟`))
                        updateUserMutation({ userId: selectedBuyer.id, updates: { account_type: newType } });
                    }}
                    className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-amber-500 hover:bg-amber-600 text-gray-900 flex items-center gap-2"
                  >
                    <UserCog size={16} /> تغيير نوع الحساب
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSubTab === 'pending_users' && (
        <div className="space-y-4">
          {pendingSellers.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-2xl shadow border border-gray-300">
              <h3 className="font-bold text-gold">{s.full_name}</h3>
              <p className="text-gray-900">{s.email} | {s.phone}</p>
              <p className="text-gray-500">تاريخ الطلب: {formatDate(s.created_at)}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => approveSellerMutation({ sellerId: s.id, approved: true })}
                  className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-green-600 hover:bg-green-700 text-white"
                >
                  قبول
                </button>
                <button
                  onClick={() => { const notes = prompt('سبب الرفض:'); approveSellerMutation({ sellerId: s.id, approved: false, notes }); }}
                  className="px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-200 bg-red-600 hover:bg-red-700 text-white"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
          {(!pendingSellers || pendingSellers.length === 0) && <div className="text-center text-gray-500">لا توجد طلبات تسجيل معلقة</div>}
        </div>
      )}
    </div>
  );
}

