import React from 'react';
import {
  Package, Wrench, Calendar, AlertTriangle, CheckCircle, Clock,
  ArrowUpRight, Building2, ShieldAlert, UserCheck, AlertCircle,
  FileSpreadsheet, FolderOpen, Activity
} from 'lucide-react';
import { Asset, MaintenanceOrder, UserAccount, Department, normalizeDeptName } from '../types';

interface DashboardProps {
  user: UserAccount;
  assets: Asset[];
  orders: MaintenanceOrder[];
  departments: Department[];
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  assets,
  orders,
  departments,
  onNavigate
}) => {
  // تصفية الأصول حسب دور مشرف القسم
  const userAssets = user.role === 'supervisor'
    ? assets.filter(a => a.department === user.department)
    : assets;

  // تصفية الطلبات حسب دور مشرف القسم
  const userOrders = user.role === 'supervisor'
    ? orders.filter(o => o.department === user.department)
    : orders;

  const workingAssetsCount = userAssets.filter(a => a.status === 'working').length;
  const brokenAssetsCount = userAssets.filter(a => a.status === 'broken').length;
  const damagedAssetsCount = userAssets.filter(a => a.status === 'damaged').length;

  const redOrdersCount = userOrders.filter(o => o.status === 'red').length;
  const yellowOrdersCount = userOrders.filter(o => o.status === 'yellow').length;
  const greenOrdersCount = userOrders.filter(o => o.status === 'green').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* البانر العلوي */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold mb-3 border border-white/15">
            <Activity className="w-3.5 h-3.5" />
            <span>نظام إدارة الأصول والصيانة</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            مرحباً بك، {user.name} 👋
          </h2>
          <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
            {user.role === 'admin' && 'لوحة القيادة الإدارية: متابعة شاملة للعهد والأصول، الصلاحيات، التقارير، وطلبات الصيانة.'}
            {user.role === 'tech' && 'لوحة الفنيين: استلام بلاغات وشكاوى الصيانة، تحديث التقارير الفنية، ومتابعة العدادات والبطاريات.'}
            {user.role === 'supervisor' && `لوحة مشرف قسم (${user.department}): عرض عهدة القسم، تقديم طلبات الصيانة ومتابعة حالتها.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('maintenance')}
            className="flex items-center gap-2 px-5 py-3 bg-white text-blue-900 hover:bg-blue-50 font-black rounded-2xl shadow-md transition text-xs"
          >
            <Wrench className="w-4 h-4 text-blue-700" />
            <span>+ طلب صيانة جديد</span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('assets')}
              className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-black rounded-2xl border border-white/20 transition text-xs"
            >
              <Package className="w-4 h-4" />
              <span>إضافة أصل / معدة</span>
            </button>
          )}
        </div>
      </div>

      {/* الإحصائيات السريعة للأصول والمعدات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي الأصول */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-300 rtl:-scale-x-100" />
          </div>
          <span className="text-xs font-bold text-gray-400">إجمالي الأجهزة والمعدات</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-800">{userAssets.length}</span>
            <span className="text-xs font-bold text-blue-600">أصل في العهدة</span>
          </div>
        </div>

        {/* أجهزة شغالة */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-green-300 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              Working
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400">شغال (تعمل بكفاءة)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-800">{workingAssetsCount}</span>
            <span className="text-xs font-bold text-green-600">جهاز</span>
          </div>
        </div>

        {/* أجهزة عاطلة */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-amber-300 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
              Broken
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400">عاطل (تحتاج صيانة)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-800">{brokenAssetsCount}</span>
            <span className="text-xs font-bold text-amber-600">جهاز</span>
          </div>
        </div>

        {/* أجهزة تالفة */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-red-300 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
              Damaged
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400">تالف (خارج الخدمة)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-800">{damagedAssetsCount}</span>
            <span className="text-xs font-bold text-red-600">جهاز</span>
          </div>
        </div>
      </div>

      {/* إحصائيات طلبات الصيانة وأقسام العهد */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ملخص طلبات الصيانة (أحمر - أصفر - أخضر) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-800">حالة طلبات الصيانة والشكاوى</h3>
              <p className="text-xs text-gray-400 mt-0.5">سير العمل حسب الحالات (أحمر / أصفر / أخضر)</p>
            </div>
            <button
              onClick={() => onNavigate('maintenance')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              عرض جميع الطلبات
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* شكاوى جديدة (أحمر) */}
            <div
              onClick={() => onNavigate('maintenance')}
              className="bg-red-50/70 p-4 rounded-2xl border border-red-100 hover:border-red-300 transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[11px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  أحمر (جديد)
                </span>
              </div>
              <span className="text-xs font-bold text-gray-600 block">شكاوى جديدة معلقة</span>
              <span className="text-2xl font-black text-red-700 mt-1 block">{redOrdersCount}</span>
            </div>

            {/* قيد الصيانة (أصفر) */}
            <div
              onClick={() => onNavigate('maintenance')}
              className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 hover:border-amber-300 transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  أصفر (قيد الصيانة)
                </span>
              </div>
              <span className="text-xs font-bold text-gray-600 block">تم استلامها من الفنيين</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{yellowOrdersCount}</span>
            </div>

            {/* تم الإصلاح (أخضر) */}
            <div
              onClick={() => onNavigate('maintenance')}
              className="bg-green-50/70 p-4 rounded-2xl border border-green-100 hover:border-green-300 transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-3 h-3 rounded-full bg-green-600" />
                <span className="text-[11px] font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  أخضر (مكتمل)
                </span>
              </div>
              <span className="text-xs font-bold text-gray-600 block">تم إصلاحها وإغلاقها</span>
              <span className="text-2xl font-black text-green-700 mt-1 block">{greenOrdersCount}</span>
            </div>
          </div>

          {/* آخر الطلبات */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-black text-gray-700 mb-3">أحدث طلبات الصيانة المسجلة:</h4>
            <div className="space-y-2">
              {userOrders.slice(0, 3).map(order => (
                <div
                  key={order.id}
                  onClick={() => onNavigate('maintenance')}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        order.status === 'red'
                          ? 'bg-red-600'
                          : order.status === 'yellow'
                          ? 'bg-amber-500'
                          : 'bg-green-600'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-black text-gray-800">{order.assetName}</span>
                      <span className="text-[11px] font-mono text-gray-400 block">
                        {order.orderName} ({order.department})
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600">التفاصيل ←</span>
                </div>
              ))}
              {userOrders.length === 0 && (
                <p className="text-xs text-gray-400 font-bold text-center py-4">لا توجد طلبات صيانة سابقة</p>
              )}
            </div>
          </div>
        </div>

        {/* أقسام العهدة الرئيسية */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-800">الأقسام والعهد</h3>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {departments.length} أقسام
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              إحصائية الأقسام الرئيسية والأصول المسجلة داخل كل قسم في النظام
            </p>

            <div className="space-y-3">
              {departments.slice(0, 5).map(dept => {
                const count = assets.filter(a => normalizeDeptName(a.department) === normalizeDeptName(dept.name)).length;
                return (
                  <div
                    key={dept.id}
                    onClick={() => onNavigate('assets')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-800">{dept.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      {count} أصل
                    </span>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6 font-bold">لا توجد أقسام مسجلة حالياً</p>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('assets')}
            className="w-full mt-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-2xl text-xs transition shadow-sm"
          >
            الانتقال لإدارة العهد والأقسام ←
          </button>
        </div>
      </div>
    </div>
  );
};
