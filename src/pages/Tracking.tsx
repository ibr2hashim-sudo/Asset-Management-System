import React, { useState } from 'react';
import {
  Calendar, Plus, Wrench, Battery, Droplets, ChevronRight,
  FolderOpen, Package, Trash2, CheckCircle2, Clock, Settings,
  AlertCircle, X, Shield, ArrowRight, History
} from 'lucide-react';
import {
  MaintenanceCategory, MaintenanceLogEntry, Asset, Department,
  UserAccount, normalizeDeptName
} from '../types';

interface TrackingProps {
  user: UserAccount;
  departments: Department[];
  assets: Asset[];
  categories: MaintenanceCategory[];
  maintenanceLogs: MaintenanceLogEntry[];
  onAddCategory: (name: string, defaultIntervalMeter?: number) => void;
  onAddLog: (entry: Omit<MaintenanceLogEntry, 'id'>) => void;
  onDeleteLog: (id: string) => void;
}

export const Tracking: React.FC<TrackingProps> = ({
  user,
  departments,
  assets,
  categories,
  maintenanceLogs,
  onAddCategory,
  onAddLog,
  onDeleteLog
}) => {
  // 1. اختيار تصنيف الصيانة (تكييف / زيوت وفلاتر / بطاريات / مخصص)
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | null>(
    categories.length > 0 ? categories[0] : null
  );

  // 2. اختيار القسم
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // 3. اختيار الجهاز لعرض سجل صيانته وإضافة صيانة جديدة
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // نوافذ إضافة تصنيف جديد
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatInterval, setNewCatInterval] = useState<number | ''>('');

  // نافذة إضافة سجل صيانة دورية جديد
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    workDone: '',
    currentMeter: '' as number | '',
    nextMeter: '' as number | '',
    batteryName: '',
    batteryModel: '',
    batterySerial: '',
    changeDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [notification, setNotification] = useState<{ text: string; isError: boolean } | null>(null);

  const showNotif = (text: string, isError: boolean = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // تغيير التصنيف وإعادة تعيين القسم والجهاز المختار
  const handleSelectCategory = (cat: MaintenanceCategory) => {
    setSelectedCategory(cat);
    setSelectedDept(null);
    setSelectedAsset(null);
  };

  // فتح نافذة إضافة سجل صيانة جديد
  const handleOpenAddLog = () => {
    const defaultInterval = selectedCategory?.defaultIntervalMeter || 500;
    setLogForm({
      date: new Date().toISOString().split('T')[0],
      workDone: '',
      currentMeter: '',
      nextMeter: '',
      batteryName: '',
      batteryModel: '',
      batterySerial: '',
      changeDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsAddLogModalOpen(true);
  };

  // حساب العداد القادم تلقائياً عند تغيير العداد الحالي للزيوت والفلاتر
  const handleCurrentMeterChange = (val: string) => {
    const num = Number(val) || 0;
    const interval = selectedCategory?.defaultIntervalMeter || 500;
    setLogForm(prev => ({
      ...prev,
      currentMeter: num,
      nextMeter: num + interval
    }));
  };

  // حفظ سجل الصيانة الجديد
  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !selectedCategory) return;

    onAddLog({
      assetId: selectedAsset.id,
      categoryName: selectedCategory.name,
      date: selectedCategory.name === 'بطاريات' ? logForm.changeDate : logForm.date,
      workDone: logForm.workDone.trim() || undefined,
      currentMeter: logForm.currentMeter === '' ? undefined : Number(logForm.currentMeter),
      nextMeter: logForm.nextMeter === '' ? undefined : Number(logForm.nextMeter),
      batteryName: logForm.batteryName.trim() || undefined,
      batteryModel: logForm.batteryModel.trim() || undefined,
      batterySerial: logForm.batterySerial.trim() || undefined,
      changeDate: logForm.changeDate || undefined,
      notes: logForm.notes.trim() || undefined
    });

    showNotif('تمت إضافة سجل المتابعة الدورية بنجاح', false);
    setIsAddLogModalOpen(false);
  };

  // أيقونة التصنيف
  const getCategoryIcon = (name: string) => {
    if (name.includes('تكييف')) return <Wrench className="w-4 h-4" />;
    if (name.includes('زيوت') || name.includes('فلاتر')) return <Droplets className="w-4 h-4" />;
    if (name.includes('بطاري')) return <Battery className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  // السجلات الخاصة بالجهاز والتصنيف المختار
  const assetLogs = selectedAsset && selectedCategory
    ? maintenanceLogs.filter(
        l => l.assetId === selectedAsset.id && l.categoryName === selectedCategory.name
      )
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* إشعارات علوية */}
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
            <Calendar className="w-6 h-6 text-blue-600" />
            متابعة الصيانة الدورية والتصنيفات الفنية
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            اختر أحد تصنيفات الصيانة (تكييف، زيوت وفلاتر، بطاريات) ثم اختر القسم والجهاز لمتابعة السجلات التاريخية
          </p>
        </div>

        <button
          onClick={() => {
            setNewCatName('');
            setNewCatInterval('');
            setIsAddCatModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تصنيف صيانة جديد</span>
        </button>
      </div>

      {/* شريط التصنيفات (تكييف - زيوت وفلاتر - بطاريات + مخصص) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-gray-400 rtl:ml-2">اختر التصنيف:</span>
        {categories.map(cat => {
          const isSelected = selectedCategory?.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {getCategoryIcon(cat.name)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* شريط التنقل (Breadcrumb) */}
      <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200/60 overflow-x-auto">
        <button
          onClick={() => {
            setSelectedDept(null);
            setSelectedAsset(null);
          }}
          className={`flex items-center gap-1 hover:text-blue-600 ${
            !selectedDept && !selectedAsset ? 'text-blue-600 font-extrabold' : ''
          }`}
        >
          <span>الأقسام الرئيسية ({selectedCategory?.name})</span>
        </button>

        {selectedDept && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
            <button
              onClick={() => setSelectedAsset(null)}
              className={`hover:text-blue-600 ${
                !selectedAsset ? 'text-blue-600 font-extrabold' : ''
              }`}
            >
              <span>{selectedDept}</span>
            </button>
          </>
        )}

        {selectedAsset && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
            <span className="text-blue-600 font-extrabold">{selectedAsset.name}</span>
          </>
        )}
      </div>

      {/* الخطوة 1: عرض قائمة الأقسام عند اختيار التصنيف */}
      {selectedCategory && !selectedDept && !selectedAsset && (
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-gray-700">
            اختر القسم لعرض الأجهزة المراد متابعتها في تصنيف: <span className="text-blue-600">{selectedCategory.name}</span>
          </h3>

          {departments.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">لا توجد أقسام مسجلة في شاشة العهد حتى الآن</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const assetsInDept = assets.filter(a => normalizeDeptName(a.department) === normalizeDeptName(dept.name)).length;
                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDept(dept.name)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-800 text-base">{dept.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{assetsInDept} جهاز بالقسم</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* الخطوة 2: عرض قائمة الأجهزة في القسم المختار */}
      {selectedDept && !selectedAsset && (
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-gray-700">
            الأجهزة الموجودة في قسم (<span className="text-blue-600">{selectedDept}</span>) لمتابعة صيانة: <b>{selectedCategory?.name}</b>
          </h3>

          {(() => {
            const deptAssets = assets.filter(a => normalizeDeptName(a.department) === normalizeDeptName(selectedDept || ''));
            if (deptAssets.length === 0) {
              return (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-bold">لا توجد أجهزة مسجلة داخل هذا القسم</p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptAssets.map(asset => {
                  const logsCount = maintenanceLogs.filter(
                    l => l.assetId === asset.id && l.categoryName === selectedCategory?.name
                  ).length;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            ID: {asset.customId}
                          </span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {logsCount} سجل صيانة
                          </span>
                        </div>
                        <h4 className="font-extrabold text-gray-800 text-base">{asset.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          الموديل: <b>{asset.model || '---'}</b> | الرقم التسلسلي: <b>{asset.serialNumber || '---'}</b>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                        <span>عرض السجل وإضافة متابعة</span>
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* الخطوة 3: عرض سجلات الصيانة للجهاز المحدد + زر إضافة صيانة جديدة */}
      {selectedAsset && selectedCategory && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded">
                ID: {selectedAsset.customId}
              </span>
              <h3 className="text-xl font-black text-gray-800 mt-2">
                سجل صيانة ({selectedCategory.name}) للجهاز: {selectedAsset.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                القسم: {selectedAsset.department} | الموديل: {selectedAsset.model || '---'} | S/N: {selectedAsset.serialNumber || '---'}
              </p>
            </div>

            <button
              onClick={handleOpenAddLog}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صيانة جديدة</span>
            </button>
          </div>

          {/* جدول السجلات */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-bold">
                  <tr>
                    <th className="py-4 px-6">التاريخ</th>
                    {selectedCategory.name === 'تكييف' && (
                      <th className="py-4 px-6">ما تم عمله في صيانة التكييف</th>
                    )}
                    {selectedCategory.name === 'زيوت وفلاتر' && (
                      <>
                        <th className="py-4 px-6">قراءة العداد الحالي</th>
                        <th className="py-4 px-6">قراءة العداد عند التغيير القادم</th>
                        <th className="py-4 px-6">ملاحظات</th>
                      </>
                    )}
                    {selectedCategory.name === 'بطاريات' && (
                      <>
                        <th className="py-4 px-6">اسم البطارية</th>
                        <th className="py-4 px-6">موديل البطارية</th>
                        <th className="py-4 px-6">الرقم التسلسلي</th>
                        <th className="py-4 px-6">تاريخ تغيير البطارية</th>
                      </>
                    )}
                    {selectedCategory.name !== 'تكييف' &&
                     selectedCategory.name !== 'زيوت وفلاتر' &&
                     selectedCategory.name !== 'بطاريات' && (
                      <>
                        <th className="py-4 px-6">ما تم عمله</th>
                        <th className="py-4 px-6">ملاحظات</th>
                      </>
                    )}
                    <th className="py-4 px-6 text-center">حذف</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm">
                  {assetLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-sm font-bold">
                        لا توجد سجلات صيانة سابقة لهذا الجهاز في هذا التصنيف. اضغط على "إضافة صيانة جديدة" لبدء التسجيل.
                      </td>
                    </tr>
                  ) : (
                    assetLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-4 px-6 font-bold text-gray-800">{log.date}</td>

                        {selectedCategory.name === 'تكييف' && (
                          <td className="py-4 px-6 font-bold text-gray-700">{log.workDone || '---'}</td>
                        )}

                        {selectedCategory.name === 'زيوت وفلاتر' && (
                          <>
                            <td className="py-4 px-6 font-mono font-bold text-blue-700">
                              {log.currentMeter ?? '---'}
                            </td>
                            <td className="py-4 px-6 font-mono font-black text-amber-700 bg-amber-50/50">
                              {log.nextMeter ?? '---'}
                            </td>
                            <td className="py-4 px-6 text-gray-600 text-xs">{log.notes || '---'}</td>
                          </>
                        )}

                        {selectedCategory.name === 'بطاريات' && (
                          <>
                            <td className="py-4 px-6 font-bold text-gray-800">{log.batteryName || '---'}</td>
                            <td className="py-4 px-6 text-gray-700">{log.batteryModel || '---'}</td>
                            <td className="py-4 px-6 font-mono text-xs text-gray-600">{log.batterySerial || '---'}</td>
                            <td className="py-4 px-6 font-bold text-green-700">{log.changeDate || log.date}</td>
                          </>
                        )}

                        {selectedCategory.name !== 'تكييف' &&
                         selectedCategory.name !== 'زيوت وفلاتر' &&
                         selectedCategory.name !== 'بطاريات' && (
                          <>
                            <td className="py-4 px-6 font-bold text-gray-700">{log.workDone || '---'}</td>
                            <td className="py-4 px-6 text-gray-500 text-xs">{log.notes || '---'}</td>
                          </>
                        )}

                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                onDeleteLog(log.id);
                                showNotif('تم حذف السجل بنجاح', false);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="حذف السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة تصنيف صيانة جديد */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-black text-gray-800 mb-4">إضافة تصنيف صيانة جديد</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                onAddCategory(
                  newCatName.trim(),
                  newCatInterval === '' ? undefined : Number(newCatInterval)
                );
                setIsAddCatModalOpen(false);
                showNotif('تمت إضافة التصنيف بنجاح', false);
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم التصنيف*</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فحص مضخات، معايرة أجهزة طبية، إلخ..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  فارق العداد التلقائي للصيانة القادمة (اختياري - للزيوت والعدادات)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="مثال: 500 أو 1000"
                  value={newCatInterval}
                  onChange={(e) => setNewCatInterval(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm text-sm"
                >
                  حفظ التصنيف
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة سجل صيانة جديد حسب التصنيف */}
      {isAddLogModalOpen && selectedAsset && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-800">
                إضافة صيانة ({selectedCategory.name})
              </h3>
              <button
                onClick={() => setIsAddLogModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4 text-right">
              {/* 1. التكييف: تاريخ الصيانة + ما تم عمله */}
              {selectedCategory.name === 'تكييف' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الصيانة*</label>
                    <input
                      type="date"
                      required
                      value={logForm.date}
                      onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ما تم عمله في التكييف*</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="مثال: غسيل فلاتر، شحن فريون، تنظيف المبخر، فحص كمبروسر..."
                      value={logForm.workDone}
                      onChange={(e) => setLogForm(prev => ({ ...prev, workDone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* 2. الزيوت والفلاتر: تاريخ الصيانة + قراءة العداد الحالي + قراءة العداد عند التغيير القادم */}
              {selectedCategory.name === 'زيوت وفلاتر' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الصيانة*</label>
                    <input
                      type="date"
                      required
                      value={logForm.date}
                      onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        قراءة العداد الحالي*
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="مثال: 1200"
                        value={logForm.currentMeter}
                        onChange={(e) => handleCurrentMeterChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        قراءة العداد عند التغيير القادم*
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={logForm.nextMeter}
                        onChange={(e) => setLogForm(prev => ({ ...prev, nextMeter: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none font-black text-amber-900"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    *تم حساب العداد القادم تلقائياً بزيادة ({selectedCategory.defaultIntervalMeter || 500}) ويمكنك تعديله يدوياً.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: تغيير فلتر زيت وهواء معاً..."
                      value={logForm.notes}
                      onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* 3. البطاريات: اسم الجهاز + موديله + الرقم التسلسلي + تاريخ التغيير */}
              {selectedCategory.name === 'بطاريات' && (
                <>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">اسم الجهاز:</span>
                      <span className="font-extrabold text-gray-800">{selectedAsset.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">موديل الجهاز:</span>
                      <span className="font-extrabold text-gray-800">{selectedAsset.model || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">الرقم التسلسلي للجهاز:</span>
                      <span className="font-mono font-extrabold text-gray-800">{selectedAsset.serialNumber || '---'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">اسم/نوع البطارية*</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: Lead Acid Battery / Li-ion"
                        value={logForm.batteryName}
                        onChange={(e) => setLogForm(prev => ({ ...prev, batteryName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">موديل البطارية</label>
                      <input
                        type="text"
                        placeholder="مثال: 12V 7Ah"
                        value={logForm.batteryModel}
                        onChange={(e) => setLogForm(prev => ({ ...prev, batteryModel: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">الرقم التسلسلي للبطارية</label>
                      <input
                        type="text"
                        placeholder="S/N"
                        value={logForm.batterySerial}
                        onChange={(e) => setLogForm(prev => ({ ...prev, batterySerial: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ تغيير البطارية*</label>
                      <input
                        type="date"
                        required
                        value={logForm.changeDate}
                        onChange={(e) => setLogForm(prev => ({ ...prev, changeDate: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات إضافية</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات حول البطارية المستبدلة..."
                      value={logForm.notes}
                      onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* تصنيف مخصص */}
              {selectedCategory.name !== 'تكييف' &&
               selectedCategory.name !== 'زيوت وفلاتر' &&
               selectedCategory.name !== 'بطاريات' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الصيانة*</label>
                    <input
                      type="date"
                      required
                      value={logForm.date}
                      onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ما تم عمله*</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="اكتب تفاصيل الصيانة الفنية..."
                      value={logForm.workDone}
                      onChange={(e) => setLogForm(prev => ({ ...prev, workDone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات إضافية..."
                      value={logForm.notes}
                      onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm"
                >
                  حفظ سجل الصيانة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddLogModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
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
