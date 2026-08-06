import React, { useState } from 'react';
import {
  Wrench, Plus, Search, Filter, Trash2, Edit2, CheckCircle2, Clock,
  AlertCircle, Printer, FileText, Check, ChevronLeft, Building2,
  Package, Calendar, User, ShieldAlert, ArrowRight, Eye, X
} from 'lucide-react';
import { MaintenanceOrder, Asset, UserAccount, OrderStatus } from '../types';

interface MaintenanceProps {
  user: UserAccount;
  assets: Asset[];
  orders: MaintenanceOrder[];
  onAddOrder: (order: {
    department: string;
    assetId: string;
    assetCustomId: string;
    assetName: string;
    assetModel: string;
    complaint: string;
    supervisorName?: string;
  }) => void;
  onReceiveOrder: (orderId: string, technicianName: string) => void;
  onUpdateOrderDetails: (orderId: string, updated: Partial<MaintenanceOrder>) => void;
  onCompleteOrder: (orderId: string, technicianName: string) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const Maintenance: React.FC<MaintenanceProps> = ({
  user,
  assets,
  orders,
  onAddOrder,
  onReceiveOrder,
  onUpdateOrderDetails,
  onCompleteOrder,
  onDeleteOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // الطلب المختار للمعاينة أو إدارة العمليات
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);

  // تقرير الطباعة / PDF
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<MaintenanceOrder | null>(null);

  // إشعارات
  const [notification, setNotification] = useState<{ text: string; isError: boolean } | null>(null);

  // نموذج إضافة طلب صيانة (لمشرف القسم أو غيره)
  const [newOrderForm, setNewOrderForm] = useState({
    department: user.role === 'supervisor' ? (user.department || '') : '',
    assetId: '',
    complaint: ''
  });

  // نموذج تعديل تقارير الصيانة (فني / أدمن)
  const [techReportForm, setTechReportForm] = useState({
    initialReport: '',
    requiredParts: '',
    finalReport: ''
  });

  const showNotif = (text: string, isError: boolean = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // تصفية الطلبات حسب الدور والحالة والبحث
  const filteredOrders = orders.filter(order => {
    const matchRole =
      user.role === 'supervisor'
        ? order.department === user.department
        : true;

    const matchSearch =
      order.orderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.assetCustomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.complaint.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchRole && matchSearch && matchStatus;
  });

  // فتح نافذة إضافة طلب صيانة
  const handleOpenAddModal = () => {
    const defaultDept = user.role === 'supervisor'
      ? (user.department || '')
      : (assets.length > 0 ? assets[0].department : '');

    const firstAssetInDept = assets.find(a => a.department === defaultDept) || assets[0];

    setNewOrderForm({
      department: defaultDept,
      assetId: firstAssetInDept ? firstAssetInDept.id : '',
      complaint: ''
    });
    setIsAddModalOpen(true);
  };

  // إرسال الشكوى
  const handleSubmitNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.complaint.trim()) {
      showNotif('يرجى كتابة وصف الشكوى أو طلب الصيانة', true);
      return;
    }

    const asset = assets.find(a => a.id === newOrderForm.assetId);
    if (!asset) {
      showNotif('يرجى اختيار جهاز صحيح لتقديم طلب الصيانة له', true);
      return;
    }

    onAddOrder({
      department: newOrderForm.department || asset.department,
      assetId: asset.id,
      assetCustomId: asset.customId,
      assetName: asset.name,
      assetModel: asset.model || '---',
      complaint: newOrderForm.complaint.trim(),
      supervisorName: user.name
    });

    showNotif('تم إرسال طلب الصيانة بنجاح (إشعار أحمر)', false);
    setIsAddModalOpen(false);
  };

  // فتح نافذة تفاصيل الشكوى والتقارير
  const handleOpenOrderDetail = (order: MaintenanceOrder) => {
    setSelectedOrder(order);
    setTechReportForm({
      initialReport: order.initialReport || '',
      requiredParts: order.requiredParts || '',
      finalReport: order.finalReport || ''
    });
  };

  // حفظ التقارير الفنية (أدمن وفني)
  const handleSaveTechReports = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    onUpdateOrderDetails(selectedOrder.id, {
      initialReport: techReportForm.initialReport.trim(),
      requiredParts: techReportForm.requiredParts.trim(),
      finalReport: techReportForm.finalReport.trim()
    });

    showNotif('تم حفظ التقارير والبيانات الفنية بنجاح', false);
    setSelectedOrder(prev => prev ? {
      ...prev,
      initialReport: techReportForm.initialReport.trim(),
      requiredParts: techReportForm.requiredParts.trim(),
      finalReport: techReportForm.finalReport.trim()
    } : null);
  };

  // استلام الشكوى (أحمر -> أصفر)
  const handleReceiveComplaint = (orderId: string) => {
    onReceiveOrder(orderId, user.name);
    showNotif('تم استلام الشكوى وتحويل الحالة إلى (قيد الصيانة - أصفر)', false);
    setSelectedOrder(prev => prev ? {
      ...prev,
      status: 'yellow',
      receivedAt: new Date().toISOString().split('T')[0],
      technician: user.name
    } : null);
  };

  // تم الإصلاح (أصفر -> أخضر)
  const handleCompleteRepair = (orderId: string) => {
    onCompleteOrder(orderId, user.name);
    showNotif('تم إصلاح العطل وتحويل الحالة إلى (مكتمل - أخضر)', false);
    setSelectedOrder(prev => prev ? {
      ...prev,
      status: 'green',
      completedAt: new Date().toISOString().split('T')[0],
      technician: user.name
    } : null);
  };

  // فتح نافذة تقرير الـ PDF
  const handleOpenPrintReport = (order: MaintenanceOrder) => {
    setOrderToPrint(order);
    setIsPrintModalOpen(true);
  };

  // الطباعة / حفظ كـ PDF باسم الملف المطلوب: اسم القسم - ID الجهاز - تاريخ اليوم
  const handlePrintPDF = () => {
    if (!orderToPrint) return;
    const oldTitle = document.title;
    // ضبط اسم الصفحة ليكون هو اسم ملف الـ PDF عند حفظه
    document.title = orderToPrint.orderName;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  // شارات الألوان المطلوبة (أحمر / أصفر / أخضر)
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-red-600 text-white shadow-sm animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            شكوى جديدة (أحمر)
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            قيد الصيانة (أصفر)
          </span>
        );
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-green-600 text-white shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم الإصلاح (أخضر)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* إشعار علوي */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-sm font-bold text-center border shadow-sm ${
            notification.isError
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* الرأس */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            طلبات الشكاوى والصيانة
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {user.role === 'supervisor'
              ? `تقديم ومتابعة طلبات الصيانة الخاصة بقسم (${user.department})`
              : 'إدارة طلبات الصيانة الواردة من الأقسام، متابعة التقارير الفنية، وإصدار تقارير PDF'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>طلب صيانة جديد</span>
        </button>
      </div>

      {/* شريط البحث وتصفية الحالات */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث برقم/اسم الطلب، اسم القسم، ID الجهاز، أو وصف الشكوى..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">جميع الحالات (أحمر - أصفر - أخضر)</option>
            <option value="red">شكوى جديدة (أحمر)</option>
            <option value="yellow">قيد الصيانة (أصفر)</option>
            <option value="green">تم الإصلاح (أخضر)</option>
          </select>
        </div>
      </div>

      {/* قائمة الشكاوى وطلبات الصيانة */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">لا توجد طلبات صيانة مسجلة تطابق بحثك حالياً</p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
          >
            تقديم أول طلب صيانة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => handleOpenOrderDetail(order)}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                      {order.orderName}
                    </span>
                    <h3 className="font-black text-gray-800 text-base mt-2 line-clamp-1">
                      {order.assetName}
                    </h3>
                  </div>
                  <div>{getOrderStatusBadge(order.status)}</div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500 font-medium py-2 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span>القسم:</span>
                    <span className="font-bold text-gray-800">{order.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID الجهاز:</span>
                    <span className="font-mono font-bold text-gray-700">{order.assetCustomId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الطلب:</span>
                    <span className="font-bold text-gray-700">{order.createdAt}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <span className="block text-[11px] text-gray-400 font-bold mb-0.5">الشكوى:</span>
                    <p className="text-gray-700 font-bold line-clamp-2 bg-gray-50 p-2 rounded-lg">
                      {order.complaint}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  عرض التفاصيل والتقارير
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPrintReport(order);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  title="حفظ التقرير كـ PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة طلب صيانة جديد (لمشرف القسم) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                تقديم طلب صيانة جديد
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewOrder} className="space-y-4 text-right">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                <p>
                  رقم/اسم الطلب التلقائي الذي سيتم حفظه هو:{' '}
                  <b>اسم القسم - ID الجهاز - تاريخ اليوم</b>
                </p>
              </div>

              {/* اختيار القسم */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">القسم</label>
                {user.role === 'supervisor' ? (
                  <input
                    type="text"
                    disabled
                    value={newOrderForm.department}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={newOrderForm.department}
                    onChange={(e) => {
                      const dName = e.target.value;
                      const firstA = assets.find(a => a.department === dName);
                      setNewOrderForm({
                        department: dName,
                        assetId: firstA ? firstA.id : '',
                        complaint: newOrderForm.complaint
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Array.from(new Set(assets.map(a => a.department))).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* اختيار الجهاز */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اختر الجهاز المراد صيانته*</label>
                {(() => {
                  const deptAssets = assets.filter(a => a.department === newOrderForm.department);
                  if (deptAssets.length === 0) {
                    return (
                      <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">
                        لا توجد أجهزة مسجلة في قسم ({newOrderForm.department}). يرجى إضافة الجهاز أولاً.
                      </div>
                    );
                  }
                  return (
                    <select
                      value={newOrderForm.assetId}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, assetId: e.target.value }))}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {deptAssets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} | موديل: {a.model || '---'} | ID: {a.customId}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* الشكوى (حقل نصي) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الشكوى / المشكلة الفنية (حقل نصي)*
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب وصف العطل أو المشكلة بدقة..."
                  value={newOrderForm.complaint}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, complaint: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm"
                >
                  إرسال طلب الصيانة (إشعار أحمر)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الشكوى وتقارير الصيانة (فني + أدمن + مشرف) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono font-bold mb-1">
                  {selectedOrder.orderName}
                </span>
                <h3 className="text-xl font-black text-gray-800">{selectedOrder.assetName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  القسم: <b>{selectedOrder.department}</b> | الموديل: <b>{selectedOrder.assetModel}</b> | ID الجهاز: <b>{selectedOrder.assetCustomId}</b>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getOrderStatusBadge(selectedOrder.status)}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* حقل الشكوى الأصلي */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
                <span className="block text-xs font-bold text-gray-400 mb-1">الشكوى / الشرح الفني للمشكلة:</span>
                <p className="text-sm font-extrabold text-gray-800 leading-relaxed">
                  {selectedOrder.complaint}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                  <span>مقدم الطلب: <b>{selectedOrder.supervisorName || 'مشرف القسم'}</b></span>
                  <span>تاريخ الطلب: <b>{selectedOrder.createdAt}</b></span>
                </div>
              </div>

              {/* أزرار العمليات للفني والأدمن */}
              {(user.role === 'tech' || user.role === 'admin') && (
                <>
                  {selectedOrder.status === 'red' && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h4 className="font-black text-amber-900 text-sm">استلام الشكوى وبدء الصيانة</h4>
                        <p className="text-xs text-amber-700 mt-0.5">
                          اضغط على الزر لتحويل الإشعار من أحمر إلى أصفر (قيد الصيانة) وتسجيل اسمك كفني مسؤول.
                        </p>
                      </div>
                      <button
                        onClick={() => handleReceiveComplaint(selectedOrder.id)}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow transition whitespace-nowrap text-xs"
                      >
                        تم استلام الشكوى
                      </button>
                    </div>
                  )}

                  {/* نموذج التقارير الفنية (يظهر بعد الاستلام أو في الأخضر والأصفر) */}
                  <form onSubmit={handleSaveTechReports} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        1. التقرير المبدئي للصيانة
                      </label>
                      <textarea
                        rows={2}
                        placeholder="ما هو الفحص الأولي للشكوى وحالة الجهاز؟"
                        value={techReportForm.initialReport}
                        onChange={(e) => setTechReportForm(prev => ({ ...prev, initialReport: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        2. طلب القطع اللازمة للإصلاح
                      </label>
                      <textarea
                        rows={2}
                        placeholder="اذكر أسماء أو أرقام قطع الغيار المطلوبة (إن وجدت)..."
                        value={techReportForm.requiredParts}
                        onChange={(e) => setTechReportForm(prev => ({ ...prev, requiredParts: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        3. التقرير النهائي للإصلاح
                      </label>
                      <textarea
                        rows={2}
                        placeholder="ما الذي تم عمله لإصلاح العطل وإعادة الجهاز للخدمة؟"
                        value={techReportForm.finalReport}
                        onChange={(e) => setTechReportForm(prev => ({ ...prev, finalReport: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition text-xs shadow-sm"
                      >
                        حفظ التقارير الفنية
                      </button>

                      {selectedOrder.status !== 'green' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteRepair(selectedOrder.id)}
                          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl transition text-xs shadow-sm whitespace-nowrap"
                        >
                          تم الإصلاح (إتمام الشكوى)
                        </button>
                      )}
                    </div>
                  </form>
                </>
              )}

              {/* إذا كان المستخدم مشرف قسم ولا يملك صلاحية تعديل التقارير، نعرض التقارير للقراءة فقط */}
              {user.role === 'supervisor' && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="block text-xs font-bold text-gray-400">التقرير المبدئي:</span>
                    <p className="text-sm font-bold text-gray-800 mt-1">{selectedOrder.initialReport || 'لم يُسجل بعد'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="block text-xs font-bold text-gray-400">القطع المطلوبة:</span>
                    <p className="text-sm font-bold text-gray-800 mt-1">{selectedOrder.requiredParts || 'لا توجد طلبات قطع'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="block text-xs font-bold text-gray-400">التقرير النهائي:</span>
                    <p className="text-sm font-bold text-gray-800 mt-1">{selectedOrder.finalReport || 'لم يُسجل بعد'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* أزرار أسفل النافذة: طباعة تقرير PDF وإلغاء */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleOpenPrintReport(selectedOrder)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-xl text-xs transition shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>إصدار تقرير الطباعة / PDF</span>
              </button>

              <div className="flex items-center gap-2">
                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من مسح طلب الصيانة (${selectedOrder.orderName})؟`)) {
                        onDeleteOrder(selectedOrder.id);
                        setSelectedOrder(null);
                        showNotif('تم مسح الطلب بنجاح', false);
                      }
                    }}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="حذف الطلب"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة تقرير الصيانة لطباعته وحفظه كـ PDF */}
      {isPrintModalOpen && orderToPrint && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-8 animate-fadeIn border border-gray-200">
            {/* التقرير المصمم للطباعة والحفظ كـ PDF */}
            <div id="print-area" className="space-y-6 text-right font-sans text-gray-800">
              <div className="flex items-center justify-between pb-6 border-b-2 border-gray-800">
                <div>
                  <h1 className="text-2xl font-black">نظام إدارة الأصول والصيانة</h1>
                  <p className="text-xs font-bold text-gray-500 mt-1">تقرير صيانة فني وإصلاح معدات</p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xs text-gray-500">رقم / اسم الطلب المحفوظ:</div>
                  <div className="text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg mt-0.5">
                    {orderToPrint.orderName}
                  </div>
                </div>
              </div>

              {/* بيانات الجهاز والقسم */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="block text-gray-400 font-bold">القسم</span>
                  <span className="text-sm font-extrabold text-gray-800 mt-0.5 block">{orderToPrint.department}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">اسم الجهاز</span>
                  <span className="text-sm font-extrabold text-gray-800 mt-0.5 block">{orderToPrint.assetName}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">موديل الجهاز</span>
                  <span className="text-sm font-extrabold text-gray-800 mt-0.5 block">{orderToPrint.assetModel || '---'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">ID الجهاز</span>
                  <span className="text-sm font-extrabold font-mono text-blue-700 mt-0.5 block">{orderToPrint.assetCustomId}</span>
                </div>
              </div>

              {/* الشكوى */}
              <div className="p-4 rounded-2xl border border-gray-200">
                <span className="block text-xs font-bold text-gray-400 mb-1">وصف الشكوى الفنية:</span>
                <p className="text-sm font-bold text-gray-800 leading-relaxed">{orderToPrint.complaint}</p>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>مقدم الطلب: <b>{orderToPrint.supervisorName || 'مشرف القسم'}</b></span>
                  <span>تاريخ الشكوى: <b>{orderToPrint.createdAt}</b></span>
                </div>
              </div>

              {/* التقارير الفنية */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-400 mb-1">1. التقرير المبدئي للصيانة:</span>
                  <p className="text-sm font-bold text-gray-800">{orderToPrint.initialReport || '---'}</p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-400 mb-1">2. طلب القطع اللازمة للإصلاح:</span>
                  <p className="text-sm font-bold text-gray-800">{orderToPrint.requiredParts || '---'}</p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200">
                  <span className="block text-xs font-bold text-gray-400 mb-1">3. التقرير النهائي للإصلاح:</span>
                  <p className="text-sm font-bold text-gray-800">{orderToPrint.finalReport || '---'}</p>
                </div>
              </div>

              {/* التوقيعات */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 mt-8 text-center text-xs font-bold">
                <div>
                  <p className="text-gray-400 mb-8">توقيع فني الصيانة المسؤول</p>
                  <p className="text-gray-800 border-t border-dashed border-gray-400 pt-2 w-48 mx-auto">
                    {orderToPrint.technician || '............................'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-8">اعتماد مشرف القسم / إدارة الأصول</p>
                  <p className="text-gray-800 border-t border-dashed border-gray-400 pt-2 w-48 mx-auto">
                    ............................
                  </p>
                </div>
              </div>
            </div>

            {/* أزرار التحكم في النافذة (تختفي عند الطباعة) */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between print:hidden">
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md hover:shadow-lg transition text-sm"
              >
                <Printer className="w-5 h-5" />
                <span>حفظ كـ PDF / طباعة التقرير</span>
              </button>

              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
