import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Package, DollarSign, Info, Volume2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { getUserNotifications, markNotificationAsRead, requestNotificationPermission, enableAudio, playNotificationSound } from '../../services/notificationService';
import toast from 'react-hot-toast';

export const NotificationBell = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const channelRef = useRef(null);

  const handleAuthError = async (err) => {
    if (err?.code === 'PGRST303' || err?.message?.includes('JWT expired')) {
      console.warn('انتهت صلاحية الجلسة، تسجيل خروج...');
      toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      await supabase.auth.signOut();
      navigate('/login');
      return true;
    }
    return false;
  };

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserNotifications(user.id);
      setNotifications(result.notifications.slice(0, 5));
      setUnreadCount(result.unreadCount);
    } catch (err) {
      const handled = await handleAuthError(err);
      if (!handled) console.error('خطأ في جلب الإشعارات:', err);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    try {
      const channel = supabase
        .channel(`notifications-dropdown-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          loadNotifications();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [NotificationBell] مشترك');
          }
        });
      channelRef.current = channel;
    } catch (err) {
      console.error('فشل إنشاء قناة الإشعارات:', err);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, loadNotifications]);

  useEffect(() => {
    if (dropdownOpen) loadNotifications();
  }, [dropdownOpen, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      if (Notification.permission === 'granted') {
        await enableAudio();
        setNotificationsEnabled(true);
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await enableAudio();
      setNotificationsEnabled(true);
      toast.success('✅ تم تفعيل الإشعارات والصوت');
      playNotificationSound();
    } else {
      toast.error('❌ لم يتم التفعيل');
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      const relatedId = notif.related_id;
      const type = notif.type;
      const isValidConversationUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (relatedId && isValidConversationUUID(relatedId)) {
        navigate(`/chat/c/${relatedId}`);
      } 
      else if (type === 'payment' || type === 'order_status') {
        // ✅ التوجيه حسب دور المستخدم (بائع أم مشتري)
        if (profile?.account_type === 'seller') {
          navigate('/seller-orders');
        } else {
          navigate('/orders');
        }
      } 
      else {
        navigate('/inbox');
      }
      setDropdownOpen(false);
    } catch (err) {
      const handled = await handleAuthError(err);
      if (!handled) toast.error('حدث خطأ أثناء فتح الإشعار');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle size={16} className="text-blue-500" />;
      case 'order_status': return <Package size={16} className="text-green-500" />;
      case 'payment': return <DollarSign size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-gold" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-2 rounded-full hover:bg-primary-card transition"
          aria-label="الإشعارات"
        >
          <Bell size={22} className="text-gold" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={loadNotifications}
          className="p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-600 transition"
          title="تحديث"
        >
          <RefreshCw size={16} />
        </button>
        {!notificationsEnabled && user && (
          <button
            onClick={handleEnableNotifications}
            className="p-2 rounded-full bg-gold/20 text-gold hover:bg-gold/40 transition"
            title="تفعيل الإشعارات"
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-[#0a2a4a] backdrop-blur-sm rounded-xl shadow-2xl border border-gold/40 z-50 overflow-hidden">
          <div className="p-3 border-b border-gold/30 flex justify-between items-center">
            <h3 className="font-bold text-gold">الإشعارات</h3>
            <button onClick={() => { navigate('/notifications'); setDropdownOpen(false); }} className="text-xs text-gold underline">
              عرض الكل
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-text-secondary">لا توجد إشعارات</div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 border-b border-gold/20 cursor-pointer hover:bg-secondary-blue/30 transition ${!notif.is_read ? 'bg-secondary-blue/10' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${!notif.is_read ? 'text-gold' : 'text-white'}`}>{notif.title}</p>
                      <p className="text-xs text-text-secondary line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(notif.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notif.is_read && <div className="w-2 h-2 bg-gold rounded-full mt-2"></div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

