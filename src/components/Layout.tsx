import React, { useState } from 'react';
import { Cloud, Wrench, Shield, Home, Calendar, Package, LogOut, User, Users, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { GoogleDriveModal } from './GoogleDriveModal';
import { SupabaseModal } from './SupabaseModal';
import { UserAccount } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'maintenance' | 'tracking' | 'assets' | 'users';
  setActiveTab: (tab: 'dashboard' | 'maintenance' | 'tracking' | 'assets' | 'users') => void;
  user: UserAccount;
  onLogout: () => void;
  dataToBackup: any;
  onResetFactory: (pass: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onSyncCloud?: () => Promise<{ success: boolean; message: string }>;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onLogout,
  dataToBackup,
  onResetFactory,
  onSyncCloud
}) => {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncCloud = async () => {
    if (!onSyncCloud || isSyncing) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await onSyncCloud();
      setSyncStatus(res.message);
    } catch (err: any) {
      console.error('Error during cloud sync:', err);
      setSyncStatus('حدث خطأ غير متوقع أثناء المزامنة: ' + (err?.message || String(err)));
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus(null);
      }, 6000);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home, roles: ['admin', 'tech', 'supervisor'] },
    { id: 'assets', label: 'بند العهد (الأصول)', icon: Package, roles: ['admin', 'tech', 'supervisor'] },
    { id: 'maintenance', label: 'طلبات الصيانة', icon: Wrench, roles: ['admin', 'tech', 'supervisor'] },
    { id: 'tracking', label: 'متابعة الصيانة الدورية', icon: Calendar, roles: ['admin', 'tech'] },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users, roles: ['admin'] }
  ] as const;

  const handleFactoryResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetting) return;
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await onResetFactory(resetPassword);
      if (res.success) {
        setResetMessage({ text: res.message, isError: false });
        setResetPassword('');
        setTimeout(() => {
          setIsResetModalOpen(false);
          setResetMessage(null);
          setIsResetting(false);
        }, 1500);
      } else {
        setResetMessage({ text: res.message, isError: true });
        setIsResetting(false);
      }
    } catch (err) {
      setResetMessage({ text: 'حدث خطأ أثناء تنفيذ عملية ضبط المصنع', isError: true });
      setIsResetting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير النظام (Admin)';
      case 'tech': return 'فني صيانة (Tech)';
      case 'supervisor': return `مشرف قسم (${user.department || 'عام'})`;
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-800">نظام إدارة الأصول والصيانة</h1>
                <p className="text-xs text-gray-500">إدارة الأصول والعهد ومتابعة وطلبات الصيانة</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user.role === 'admin' && (
                <button
                  onClick={() => {
                    setResetPassword('');
                    setResetMessage(null);
                    setIsResetModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition border border-red-200"
                  title="إعادة ضبط المصنع ومسح جميع البيانات"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">إعادة ضبط المصنع</span>
                </button>
              )}

              <button
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition border border-emerald-200 disabled:opacity-50"
                title="مزامنة البيانات المحلية مع السحابة لتظهر في الأجهزة الأخرى"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'جاري المزامنة...' : 'مزامنة السحابة'}</span>
              </button>

              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition"
                title="النسخ الاحتياطي في Google Drive"
              >
                <Cloud className="w-4 h-4" />
                <span className="hidden md:inline">النسخ السحابي</span>
              </button>

              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition border border-emerald-200"
                title="ربط سحابة Supabase PostgreSQL"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="hidden lg:inline">Supabase</span>
              </button>

              <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-extrabold text-gray-800">{user.name || user.username}</p>
                  <p className="text-xs text-blue-600 font-bold">{getRoleLabel(user.role)}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="border-t border-gray-100 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 space-x-reverse overflow-x-auto py-2">
              {navItems
                .filter(item => item.roles.includes(user.role as any))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {syncStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-2xl flex items-center justify-between animate-fadeIn">
            <span>{syncStatus}</span>
            <button onClick={() => setSyncStatus(null)} className="text-emerald-600 hover:text-emerald-900 font-black">✕</button>
          </div>
        )}
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-8 text-center text-xs text-gray-500 font-semibold">
        جميع الحقوق محفوظة &copy; 2026 — نظام إدارة الأصول والصيانة
      </footer>

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        dataToBackup={dataToBackup}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        dataToSync={dataToBackup}
      />

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn border border-red-100">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-center text-gray-800 mb-2">تأكيد إعادة ضبط المصنع</h3>
            <p className="text-xs text-center text-gray-500 mb-6 leading-relaxed">
              تحذير هام: سيقوم هذا الإجراء بمسح جميع الأصول، طلبات الصيانة، متابعات الصيانة، الأقسام، وجميع الحسابات الفرعية وإعادة النظام لوضع المصنع بحساب الأدمن فقط.
            </p>

            {resetMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-bold text-center ${
                  resetMessage.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleFactoryResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  أدخل كلمة مرور مدير النظام للتأكيد
                </label>
                <input
                  type="password"
                  required
                  placeholder="كلمة مرور الأدمن (ADMIN123)"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري المسح...</span>
                    </>
                  ) : (
                    <span>تأكيد مسح جميع البيانات</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

