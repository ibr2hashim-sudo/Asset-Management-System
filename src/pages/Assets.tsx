import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Filter, Trash2, Edit2, MapPin, Tag,
  Building2, ChevronRight, Folder, FolderOpen, Upload, Download,
  Image as ImageIcon, AlertTriangle, CheckCircle, Info, Camera,
  X, Check, Layers, Eye, FileArchive
} from 'lucide-react';
import JSZip from 'jszip';
import { Asset, Department, UserAccount, AssetStatus, normalizeDeptName, getRealSubDepartments } from '../types';

interface AssetsProps {
  user: UserAccount;
  departments: Department[];
  assets: Asset[];
  onAddDepartment: (name: string, subDepartments?: string[]) => void;
  onUpdateDepartment: (id: string, newName: string) => void;
  onDeleteDepartment: (id: string) => { success: boolean; message: string };
  onAddSubDepartment: (deptId: string, subName: string) => void;
  onDeleteSubDepartment: (deptId: string, subName: string) => { success: boolean; message: string };
  onAddAsset: (asset: Omit<Asset, 'id' | 'difference'>) => { success: boolean; message: string };
  onUpdateAsset: (id: string, updated: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onBatchImportImages: (files: FileList | File[]) => Promise<{ total: number; matched: number; failed: number; failedReasons: string[] }>;
  onExportExcel: () => void;
  onImportExcel: (file: File) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_ACCESSORIES = [
  'ECG Cable',
  'SPO2',
  'bp Cuff',
  'Bottle',
  '2 Bottle',
  'Power Cable',
  'Sensor Cuff'
];

export const Assets: React.FC<AssetsProps> = ({
  user,
  departments,
  assets,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onAddSubDepartment,
  onDeleteSubDepartment,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onBatchImportImages,
  onExportExcel,
  onImportExcel
}) => {
  // شجرة الملاحة: القسم والقسم الفرعي
  const [selectedDept, setSelectedDept] = useState<string | null>(() => {
    return user.role === 'supervisor' ? user.department || null : null;
  });
  const [selectedSubDept, setSelectedSubDept] = useState<string | null>(null);

  // تحديث تلقائي لمشرف القسم
  useEffect(() => {
    if (user.role === 'supervisor') {
      setSelectedDept(user.department || null);
    }
  }, [user.role, user.department]);

  // نوافذ وعرض البيانات
  const [selectedAssetForView, setSelectedAssetForView] = useState<Asset | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // شريط استيراد الصور المجمعة
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchReportModal, setBatchReportModal] = useState<{
    total: number;
    matched: number;
    failed: number;
    failedReasons: string[];
  } | null>(null);

  // رسائل التنبيه والخطأ
  const [notification, setNotification] = useState<{ text: string; isError: boolean } | null>(null);

  // شريط البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');

  // نوافذ إضافة الأقسام والأقسام الفرعية (للأدمن)
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newSubDeptsInput, setNewSubDeptsInput] = useState('');

  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  // نموذج إضافة / تعديل جهاز (15 حقل)
  const [assetForm, setAssetForm] = useState({
    customId: '',
    name: '',
    department: '',
    subDepartment: '',
    currentQuantity: 1,
    bookQuantity: 1,
    model: '',
    serialNumber: '',
    company: '',
    accessories: [] as string[],
    customAccessoryInput: '',
    status: 'working' as AssetStatus,
    custodian: '',
    notes: '',
    image: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchImageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const showNotif = (text: string, isError: boolean = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // دالة استخراج الصور من ملف مضغوط ZIP عند الاستيراد
  const extractImagesFromZip = async (zipFile: File): Promise<File[]> => {
    const extractedFiles: File[] = [];
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);
      const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'];

      for (const relativePath of Object.keys(contents.files)) {
        const entry = contents.files[relativePath];
        if (entry.dir) continue;
        if (relativePath.includes('__MACOSX') || relativePath.split('/').some(p => p.startsWith('.'))) continue;

        const lower = relativePath.toLowerCase();
        const ext = validExts.find(e => lower.endsWith(e));
        if (ext) {
          const fileName = relativePath.split('/').pop() || relativePath;
          const blob = await entry.async('blob');
          let mime = 'image/jpeg';
          if (ext === '.png') mime = 'image/png';
          else if (ext === '.webp') mime = 'image/webp';
          else if (ext === '.svg') mime = 'image/svg+xml';
          else if (ext === '.gif') mime = 'image/gif';

          extractedFiles.push(new File([blob], fileName, { type: mime }));
        }
      }
    } catch (err) {
      console.error('خطأ في استخراج الصور من ملف ZIP:', err);
    }
    return extractedFiles;
  };

  // دالة تصدير النسخة الاحتياطية للصور إلى ملف ZIP وحفظها على جهاز المستخدم
  const handleExportImagesZip = async () => {
    const assetsWithImages = assets.filter(a => a.image && a.image.startsWith('data:image'));
    if (assetsWithImages.length === 0) {
      showNotif('لا توجد صور مرفقة في أي من أجهزة العهدة حالياً لتصديرها.', true);
      return;
    }

    showNotif('جاري تجميع وتصدير صور الأجهزة في ملف ZIP...', false);
    try {
      const zip = new JSZip();
      const folder = zip.folder('صور_العهد_والأصول');

      for (const asset of assetsWithImages) {
        const dataUrl = asset.image!;
        const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        let ext = 'jpg';
        let base64Data = '';

        if (matches) {
          const mime = matches[1];
          base64Data = matches[2];
          if (mime.includes('png')) ext = 'png';
          else if (mime.includes('webp')) ext = 'webp';
          else if (mime.includes('svg')) ext = 'svg';
          else if (mime.includes('gif')) ext = 'gif';
        } else if (dataUrl.includes(',')) {
          base64Data = dataUrl.split(',')[1];
        } else {
          base64Data = dataUrl;
        }

        const safeId = (asset.customId || asset.name || 'device').replace(/[/\\?%*:|"<>]/g, '_');
        const fileName = `${safeId}.${ext}`;
        folder?.file(fileName, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `نسخة_احتياطية_للصور_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotif(`تم تصدير ${assetsWithImages.length} صورة بنجاح في ملف ZIP إلى جهازك!`);
    } catch (err) {
      console.error('خطأ في تصدير الصور كملف ZIP:', err);
      showNotif('حدث خطأ أثناء تصدير ملف ZIP للصور.', true);
    }
  };

  // اختيار القسم مع المنطق المطلوب:
  // عند اختيار القسم، إذا كان الاسم الفرعي مطابق لاسم القسم (أو لا توجد أقسام فرعية حقيقية) فيدخل على قائمة الأجهزة مباشرة
  const handleSelectDepartment = (deptName: string) => {
    setSelectedDept(deptName);
    const dept = departments.find(d => normalizeDeptName(d.name) === normalizeDeptName(deptName));
    if (!dept) {
      setSelectedSubDept(deptName);
      return;
    }
    const realSubs = getRealSubDepartments(dept);
    if (realSubs.length === 0) {
      // تطابق اسم القسم مع القسم الداخلي -> لا توجد أقسام فرعية، فيدخل مباشرة على قائمة الأجهزة
      setSelectedSubDept(deptName);
    } else {
      setSelectedSubDept(null);
    }
  };

  // استيراد ملف Excel
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const res = await onImportExcel(files[0]);
    if (res.success) {
      showNotif(res.message, false);
    } else {
      showNotif(res.message, true);
    }
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  // استيراد صور مجمعة أو من ملف مضغوط ZIP مع شريط تقدم وتقرير
  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress(15);

    // محاكاة شريط التقدم ليكون مرئياً وواضحاً للمستخدم
    const timer = setInterval(() => {
      setUploadProgress(prev => (prev < 85 ? prev + 15 : prev));
    }, 200);

    const fileList = Array.from(files);
    const allImagesToProcess: File[] = [];

    for (const f of fileList) {
      if (f.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractImagesFromZip(f);
        allImagesToProcess.push(...extracted);
      } else {
        allImagesToProcess.push(f);
      }
    }

    if (allImagesToProcess.length === 0) {
      clearInterval(timer);
      setIsUploadingImages(false);
      showNotif('لم يتم العثور على أي صور داخل الملف المرفق.', true);
      if (batchImageInputRef.current) batchImageInputRef.current.value = '';
      return;
    }

    const report = await onBatchImportImages(allImagesToProcess);

    clearInterval(timer);
    setUploadProgress(100);
    setTimeout(() => {
      setIsUploadingImages(false);
      setBatchReportModal(report);
      if (batchImageInputRef.current) batchImageInputRef.current.value = '';
    }, 300);
  };

  // فتح نافذة إضافة جهاز
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    const defaultDept = selectedDept || (departments.length > 0 ? departments[0].name : 'عام');
    const deptObj = departments.find(d => d.name === defaultDept);
    const defaultSub = selectedSubDept || (deptObj && deptObj.subDepartments[0]) || defaultDept;

    setAssetForm({
      customId: '',
      name: '',
      department: defaultDept,
      subDepartment: defaultSub,
      currentQuantity: 1,
      bookQuantity: 1,
      model: '',
      serialNumber: '',
      company: '',
      accessories: [],
      customAccessoryInput: '',
      status: 'working',
      custodian: '',
      notes: '',
      image: ''
    });
    setIsAssetModalOpen(true);
  };

  // فتح نافذة تعديل جهاز
  const handleOpenEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      customId: asset.customId,
      name: asset.name,
      department: asset.department,
      subDepartment: asset.subDepartment,
      currentQuantity: asset.currentQuantity,
      bookQuantity: asset.bookQuantity,
      model: asset.model,
      serialNumber: asset.serialNumber,
      company: asset.company,
      accessories: asset.accessories || [],
      customAccessoryInput: '',
      status: asset.status,
      custodian: asset.custodian,
      notes: asset.notes || '',
      image: asset.image || ''
    });
    setIsAssetModalOpen(true);
  };

  // حفظ الجهاز (إضافة أو تعديل)
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.customId.trim() || !assetForm.name.trim()) {
      showNotif('يرجى إدخال ID الجهاز المخصص واسم الجهاز على الأقل', true);
      return;
    }

    if (editingAsset) {
      onUpdateAsset(editingAsset.id, {
        customId: assetForm.customId.trim(),
        name: assetForm.name.trim(),
        department: assetForm.department,
        subDepartment: assetForm.subDepartment,
        currentQuantity: Number(assetForm.currentQuantity) || 0,
        bookQuantity: Number(assetForm.bookQuantity) || 0,
        model: assetForm.model.trim(),
        serialNumber: assetForm.serialNumber.trim(),
        company: assetForm.company.trim(),
        accessories: assetForm.accessories,
        status: assetForm.status,
        custodian: assetForm.custodian.trim(),
        notes: assetForm.notes.trim(),
        image: assetForm.image
      });
      showNotif('تم تعديل بيانات الجهاز بنجاح', false);
      setIsAssetModalOpen(false);
      setSelectedAssetForView(null);
    } else {
      const res = onAddAsset({
        customId: assetForm.customId.trim(),
        name: assetForm.name.trim(),
        department: assetForm.department,
        subDepartment: assetForm.subDepartment,
        currentQuantity: Number(assetForm.currentQuantity) || 0,
        bookQuantity: Number(assetForm.bookQuantity) || 0,
        model: assetForm.model.trim(),
        serialNumber: assetForm.serialNumber.trim(),
        company: assetForm.company.trim(),
        accessories: assetForm.accessories,
        status: assetForm.status,
        custodian: assetForm.custodian.trim(),
        notes: assetForm.notes.trim(),
        image: assetForm.image
      });
      if (res.success) {
        showNotif(res.message, false);
        setIsAssetModalOpen(false);
      } else {
        showNotif(res.message, true);
      }
    }
  };

  // التقاط أو اختيار صورة للجهاز
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setAssetForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showNotif('فشل في قراءة ملف الصورة', true);
    }
  };

  // تبديل اختيار التوابع
  const toggleAccessory = (accName: string) => {
    setAssetForm(prev => {
      const exists = prev.accessories.includes(accName);
      if (exists) {
        return { ...prev, accessories: prev.accessories.filter(a => a !== accName) };
      } else {
        return { ...prev, accessories: [...prev.accessories, accName] };
      }
    });
  };

  // إضافة تابع جديد مخصص
  const handleAddCustomAccessory = () => {
    const val = assetForm.customAccessoryInput.trim();
    if (!val || assetForm.accessories.includes(val)) return;
    setAssetForm(prev => ({
      ...prev,
      accessories: [...prev.accessories, val],
      customAccessoryInput: ''
    }));
  };

  // تصفية الأصول حسب البحث والحالة والطلبات مع المطابقة المرنة للأقسام
  const currentAssetsList = assets.filter(a => {
    const normSelectedDept = selectedDept ? normalizeDeptName(selectedDept) : '';
    const normAssetDept = normalizeDeptName(a.department);
    const matchDept = !selectedDept || normAssetDept === normSelectedDept;

    const normSelectedSub = selectedSubDept ? normalizeDeptName(selectedSubDept) : '';
    const normAssetSub = normalizeDeptName(a.subDepartment);

    // إذا تم اختيار قسم فرعي مطابق لاسم القسم (أو لا توجد تصفية فرعية)، تُعرض جميع أجهزة هذا القسم
    const isDeptDefaultSub = selectedSubDept && normSelectedSub === normSelectedDept;
    const matchSub =
      !selectedSubDept ||
      isDeptDefaultSub ||
      normAssetSub === normSelectedSub ||
      !a.subDepartment ||
      normAssetSub === normSelectedDept;

    const matchSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.customId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchDept && matchSub && matchSearch && matchStatus;
  });

  const getStatusBadge = (s: AssetStatus) => {
    switch (s) {
      case 'working':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">شغال (Working)</span>;
      case 'broken':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">عاطل (Broken)</span>;
      case 'damaged':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">تالف (Damaged)</span>;
    }
  };

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

      {/* شريط الأدوات العلوي في شاشة العهد (للأدمن) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            بند العهد (إدارة الأصول والمعدات)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {user.role === 'supervisor'
              ? `عرض الأصول والمعدات الخاصة بقسم (${user.department})`
              : 'شجرة الأقسام، الأقسام الفرعية، وقائمة جميع الأصول الـ 15 حقل'}
          </p>
        </div>

        {user.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onExportExcel()}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
              title="تصدير جميع الأصول والطلبات إلى ملف Excel"
            >
              <Upload className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs transition border border-blue-200"
              title="استيراد بيانات الأصول من ملف Excel أو CSV (UTF-8)"
            >
              <Download className="w-4 h-4" />
              <span>استيراد Excel / CSV</span>
            </button>
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              onClick={handleExportImagesZip}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
              title="تصدير نسخة احتياطية من جميع صور الأجهزة المحفوظة إلى ملف مضغوط ZIP على جهازك"
            >
              <Upload className="w-4 h-4" />
              <span>تصدير الصور (ZIP)</span>
            </button>

            <button
              onClick={() => batchImageInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-xl text-xs transition border border-purple-200"
              title="استيراد صور متعددة أو ملف ZIP وربطها تلقائياً مع ID الأجهزة"
            >
              <Download className="w-4 h-4" />
              <span>استيراد صور مجمعة / ZIP</span>
            </button>
            <input
              type="file"
              ref={batchImageInputRef}
              onChange={handleBatchImageUpload}
              multiple
              accept="image/*,.zip,application/zip,application/x-zip-compressed"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* شريط تقدم تحميل الصور المجمعة */}
      {isUploadingImages && (
        <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-200 animate-pulse text-center">
          <p className="text-sm font-black text-blue-800 mb-2">
            جاري رفع الصور ومطابقة الأسماء مع ID الأجهزة... ({uploadProgress}%)
          </p>
          <div className="w-full bg-blue-200 rounded-full h-3 max-w-md mx-auto overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* مسار التنقل (Breadcrumb) */}
      <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200/60 overflow-x-auto">
        <button
          onClick={() => {
            if (user.role !== 'supervisor') {
              setSelectedDept(null);
              setSelectedSubDept(null);
            }
          }}
          className={`flex items-center gap-1 hover:text-blue-600 ${
            !selectedDept ? 'text-blue-600 font-extrabold' : ''
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>الأقسام الرئيسية</span>
        </button>

        {selectedDept && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
            <button
              onClick={() => setSelectedSubDept(null)}
              className={`hover:text-blue-600 ${
                !selectedSubDept ? 'text-blue-600 font-extrabold' : ''
              }`}
            >
              <span>{selectedDept}</span>
            </button>
          </>
        )}

        {selectedSubDept && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />
            <span className="text-blue-600 font-extrabold">{selectedSubDept}</span>
          </>
        )}
      </div>

      {/* المستوى 1: عرض قائمة الأقسام (عند عدم اختيار قسم لمستخدمي admin & tech) */}
      {!selectedDept && user.role !== 'supervisor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-700">اختر أحد الأقسام للدخول</h3>
            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setNewDeptName('');
                  setNewSubDeptsInput('');
                  setIsAddDeptModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قسم جديد</span>
              </button>
            )}
          </div>

          {departments.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">لا توجد أقسام مسجلة حتى الآن (القائمة فارغة)</p>
              {user.role === 'admin' && (
                <button
                  onClick={() => setIsAddDeptModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                >
                  إضافة أول قسم الآن
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const totalAssetsInDept = assets.filter(
                  a => normalizeDeptName(a.department) === normalizeDeptName(dept.name)
                ).length;
                const realSubs = getRealSubDepartments(dept);
                return (
                  <div
                    key={dept.id}
                    onClick={() => handleSelectDepartment(dept.name)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-800 text-base">{dept.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {realSubs.length > 0
                              ? `${realSubs.length} أقسام فرعية`
                              : 'لا توجد أقسام فرعية'}
                          </p>
                        </div>
                      </div>

                      {user.role === 'admin' && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingDeptId(dept.id);
                              setEditingDeptName(dept.name);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل اسم القسم"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل تريد مسح القسم (${dept.name})؟`)) {
                                const res = onDeleteDepartment(dept.id);
                                showNotif(res.message, !res.success);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="مسح القسم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>إجمالي الأجهزة:</span>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {totalAssetsInDept} أصل
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* المستوى 2: عرض الأقسام الفرعية (عند وجود أقسام فرعية حقيقية مختلفة عن القسم) */}
      {selectedDept && !selectedSubDept && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-700">
              الأقسام الفرعية داخل: <span className="text-blue-600">{selectedDept}</span>
            </h3>
            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setNewSubName('');
                  setIsAddSubModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قسم فرعي</span>
              </button>
            )}
          </div>

          {(() => {
            const currentDeptObj = departments.find(d => normalizeDeptName(d.name) === normalizeDeptName(selectedDept));
            const subs = currentDeptObj ? getRealSubDepartments(currentDeptObj) : [];
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subs.map(subName => {
                  const assetsInSub = assets.filter(
                    a => normalizeDeptName(a.department) === normalizeDeptName(selectedDept) && normalizeDeptName(a.subDepartment) === normalizeDeptName(subName)
                  ).length;
                  return (
                    <div
                      key={subName}
                      onClick={() => setSelectedSubDept(subName)}
                      className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-800 text-base">{subName}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">قسم فرعي</p>
                          </div>
                        </div>

                        {user.role === 'admin' && currentDeptObj && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`هل أنت متأكد من مسح القسم الفرعي (${subName})؟`)) {
                                const res = onDeleteSubDepartment(currentDeptObj.id, subName);
                                showNotif(res.message, !res.success);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="مسح القسم الفرعي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                        <span>إجمالي الأجهزة:</span>
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                          {assetsInSub} جهاز
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* المستوى 3: قائمة الأصول والمعدات في القسم/القسم الفرعي المحدد */}
      {selectedDept && selectedSubDept && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث باسم الجهاز، الموديل، ID، أو الرقم التسلسلي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="working">شغال (Working)</option>
                <option value="broken">عاطل (Broken)</option>
                <option value="damaged">تالف (Damaged)</option>
              </select>
            </div>

            {user.role === 'admin' && (
              <button
                onClick={handleOpenAddAsset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة جهاز جديد</span>
              </button>
            )}
          </div>

          {/* قائمة الأجهزة */}
          {currentAssetsList.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">لا توجد أجهزة مسجلة في هذا القسم حتى الآن</p>
              {user.role === 'admin' && (
                <button
                  onClick={handleOpenAddAsset}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                >
                  إضافة أول جهاز لهذا القسم
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentAssetsList.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetForView(asset)}
                  className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {asset.image ? (
                            <img
                              src={asset.image}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-mono font-bold">
                            ID: {asset.customId}
                          </span>
                          <h4 className="font-extrabold text-gray-800 text-sm mt-0.5 line-clamp-1">
                            {asset.name}
                          </h4>
                        </div>
                      </div>

                      <div>{getStatusBadge(asset.status)}</div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 font-medium py-2 border-t border-gray-100">
                      <div className="flex justify-between">
                        <span>الموديل:</span>
                        <span className="font-bold text-gray-700">{asset.model || '---'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الرقم التسلسلي:</span>
                        <span className="font-bold text-gray-700 font-mono">{asset.serialNumber || '---'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الكمية (حالي / دفتري):</span>
                        <span className="font-bold text-gray-800">
                          {asset.currentQuantity} / {asset.bookQuantity}{' '}
                          {asset.difference !== 0 && (
                            <span className={asset.difference < 0 ? 'text-red-600' : 'text-green-600'}>
                              ({asset.difference > 0 ? `+${asset.difference}` : asset.difference})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      عرض جميع البيانات (15 حقل)
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-gray-400 text-[11px]">تعديل / حذف</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* نافذة عرض بيانات الجهاز كاملة (15 حقل) + أزرار التعديل والمسح في الأسفل (للأدمن) */}
      {selectedAssetForView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800">{selectedAssetForView.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">ID مخصص: {selectedAssetForView.customId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssetForView(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* صورة الجهاز إن وجدت */}
            {selectedAssetForView.image && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 max-h-64 flex items-center justify-center bg-gray-50">
                <img
                  src={selectedAssetForView.image}
                  alt={selectedAssetForView.name}
                  className="max-h-64 object-contain"
                />
              </div>
            )}

            {/* شبكة الـ 15 حقل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">1. القسم (Department)</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.department}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">2. القسم الفرعي (Sub-department)</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.subDepartment}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">3. اسم الجهاز</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.name}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">4. ID مخصص (لا يتكرر)</span>
                <span className="font-extrabold text-blue-600 font-mono">{selectedAssetForView.customId}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">5. الكمية الحالية</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.currentQuantity}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">6. الكمية الدفترية</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.bookQuantity}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">7. الفارق (محسوب تلقائياً)</span>
                <span className={`font-extrabold ${
                  selectedAssetForView.difference < 0 ? 'text-red-600' :
                  selectedAssetForView.difference > 0 ? 'text-green-600' : 'text-gray-800'
                }`}>
                  {selectedAssetForView.difference}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">8. موديل الجهاز</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.model || '---'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">9. الرقم التسلسلي (Serial Number)</span>
                <span className="font-extrabold text-gray-800 font-mono">{selectedAssetForView.serialNumber || '---'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">10. اسم الشركة المصنعة</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.company || '---'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="block text-xs font-bold text-gray-400 mb-1">11. توابع الجهاز (Accessories)</span>
                {selectedAssetForView.accessories && selectedAssetForView.accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssetForView.accessories.map((acc, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold"
                      >
                        {acc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs font-medium">لا توجد توابع مسجلة</span>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">12. حالة الجهاز</span>
                <div className="mt-1">{getStatusBadge(selectedAssetForView.status)}</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400">13. مستلم العهدة (Custodian)</span>
                <span className="font-extrabold text-gray-800">{selectedAssetForView.custodian || '---'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="block text-xs font-bold text-gray-400">14. ملاحظات (Notes)</span>
                <p className="font-medium text-gray-700 mt-0.5">{selectedAssetForView.notes || '---'}</p>
              </div>
            </div>

            {/* الأزرار في الأسفل: أسفل يمين تعديل (للأدمن)، أسفل يسار حذف (للأدمن) */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              {user.role === 'admin' ? (
                <>
                  {/* يمين: زر تعديل بيانات الجهاز */}
                  <button
                    onClick={() => {
                      const toEdit = selectedAssetForView;
                      setSelectedAssetForView(null);
                      handleOpenEditAsset(toEdit);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>تعديل بيانات الجهاز</span>
                  </button>

                  {/* يسار: زر مسح الجهاز مع رسالة تنبيه وتأكيد */}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `تنبيه هام: هل أنت متأكد من حذف الجهاز (${selectedAssetForView.name} - ID: ${selectedAssetForView.customId}) نهائياً؟`
                        )
                      ) {
                        onDeleteAsset(selectedAssetForView.id);
                        setSelectedAssetForView(null);
                        showNotif('تم مسح الجهاز بنجاح', false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>مسح الجهاز</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedAssetForView(null)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة / تعديل جهاز (15 حقل للأدمن) */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-800">
                {editingAsset ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد للعهدة'}
              </h3>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    4. ID مخصص لكل جهاز (لا يتكرر)*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: EQ-1001"
                    value={assetForm.customId}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, customId: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    3. اسم الجهاز*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: جهاز تخطيط قلب ECG"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">1. القسم</label>
                  <select
                    value={assetForm.department}
                    onChange={(e) => {
                      const dName = e.target.value;
                      const dObj = departments.find(d => d.name === dName);
                      const sName = dObj && dObj.subDepartments[0] ? dObj.subDepartments[0] : dName;
                      setAssetForm(prev => ({
                        ...prev,
                        department: dName,
                        subDepartment: sName
                      }));
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">2. القسم الفرعي</label>
                  <select
                    value={assetForm.subDepartment}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, subDepartment: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {(() => {
                      const currentD = departments.find(d => d.name === assetForm.department);
                      const subs = currentD ? currentD.subDepartments : [assetForm.department];
                      return subs.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">5. الكمية الحالية</label>
                  <input
                    type="number"
                    min="0"
                    value={assetForm.currentQuantity}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, currentQuantity: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">6. الكمية الدفترية</label>
                  <input
                    type="number"
                    min="0"
                    value={assetForm.bookQuantity}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, bookQuantity: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">7. الفارق (محسوب تلقائياً)</label>
                  <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-700">
                    {(Number(assetForm.currentQuantity) || 0) - (Number(assetForm.bookQuantity) || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">8. موديل الجهاز</label>
                  <input
                    type="text"
                    placeholder="الموديل / Model"
                    value={assetForm.model}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">9. الرقم التسلسلي</label>
                  <input
                    type="text"
                    placeholder="S/N"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">10. اسم الشركة المصنعة</label>
                  <input
                    type="text"
                    placeholder="الشركة / Brand"
                    value={assetForm.company}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* 11. توابع الجهاز */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">11. توابع الجهاز (Accessories)</label>
                <div className="flex flex-wrap gap-2 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {DEFAULT_ACCESSORIES.map(acc => {
                    const isChecked = assetForm.accessories.includes(acc);
                    return (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => toggleAccessory(acc)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}{acc}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="إضافة تابع جديد مخصص..."
                    value={assetForm.customAccessoryInput}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, customAccessoryInput: e.target.value }))}
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAccessory}
                    className="px-4 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-100 transition border border-blue-200"
                  >
                    + إضافة التابع
                  </button>
                </div>

                {assetForm.accessories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[11px] text-gray-400 font-bold self-center ml-1">المحدد:</span>
                    {assetForm.accessories.map(acc => (
                      <span
                        key={acc}
                        onClick={() => toggleAccessory(acc)}
                        className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-bold cursor-pointer hover:bg-red-100 hover:text-red-700"
                        title="اضغط للإزالة"
                      >
                        {acc} ✕
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">12. حالة الجهاز</label>
                  <select
                    value={assetForm.status}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, status: e.target.value as AssetStatus }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="working">شغال (Working)</option>
                    <option value="broken">عاطل (Broken)</option>
                    <option value="damaged">تالف (Damaged)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">13. مستلم العهدة</label>
                  <input
                    type="text"
                    placeholder="اسم الموظف أو الطبيب أو الفني المسؤول"
                    value={assetForm.custodian}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, custodian: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">14. ملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات إضافية حول حالة الجهاز أو تاريخ التركيب..."
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 15. صورة الجهاز */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">15. صورة الجهاز</label>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {assetForm.image ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-300 flex-shrink-0 relative">
                      <img src={assetForm.image} alt="prev" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAssetForm(prev => ({ ...prev, image: '' }))}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[10px]"
                        title="حذف الصورة"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 shadow-sm transition"
                    >
                      اختيار صورة من الهاتف أو الكاميرا
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileSelect}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      يمكنك التقاط صورة بكاميرا الجوال مباشرة أو اختيار ملف من الاستديو
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm"
                >
                  {editingAsset ? 'حفظ التعديلات' : 'إضافة الجهاز'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة قسم جديد */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-black text-gray-800 mb-4">إضافة قسم رئيسي جديد</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDeptName.trim()) return;
                const subs = newSubDeptsInput
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                onAddDepartment(newDeptName.trim(), subs);
                setIsAddDeptModalOpen(false);
                showNotif('تمت إضافة القسم بنجاح', false);
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم القسم*</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قسم العناية المركزة (ICU)"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الأقسام الفرعية (اختياري - افصل بينها بفاصلة)
                </label>
                <input
                  type="text"
                  placeholder="مثال: عناية الأطفال, عناية القلب, غرفة الإنعاش"
                  value={newSubDeptsInput}
                  onChange={(e) => setNewSubDeptsInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm text-sm"
                >
                  حفظ القسم
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل اسم قسم */}
      {editingDeptId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-black text-gray-800 mb-4">تعديل اسم القسم</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingDeptName.trim()) return;
                onUpdateDepartment(editingDeptId, editingDeptName.trim());
                setEditingDeptId(null);
                showNotif('تم تعديل اسم القسم بنجاح', false);
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الجديد للقسم</label>
                <input
                  type="text"
                  required
                  value={editingDeptName}
                  onChange={(e) => setEditingDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm text-sm"
                >
                  حفظ التعديل
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDeptId(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة قسم فرعي */}
      {isAddSubModalOpen && selectedDept && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-black text-gray-800 mb-4">
              إضافة قسم فرعي داخل: <span className="text-blue-600">{selectedDept}</span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSubName.trim()) return;
                const dObj = departments.find(d => d.name === selectedDept);
                if (dObj) {
                  onAddSubDepartment(dObj.id, newSubName.trim());
                  showNotif('تمت إضافة القسم الفرعي بنجاح', false);
                }
                setIsAddSubModalOpen(false);
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم القسم الفرعي*</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: غرفة الإنعاش أو الدور الأول"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm text-sm"
                >
                  حفظ القسم الفرعي
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSubModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* تقرير استيراد الصور المجمعة (لا تختفي الرسالة إلا عند الضغط بالموافقة) */}
      {batchReportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn border border-blue-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-center text-gray-800 mb-2">
              تقرير استيراد الصور المجمعة
            </h3>

            <div className="grid grid-cols-3 gap-3 my-4 text-center">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="block text-xs text-gray-400 font-bold">إجمالي الصور</span>
                <span className="text-lg font-black text-gray-800">{batchReportModal.total}</span>
              </div>
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <span className="block text-xs text-green-700 font-bold">نجح في ربطها</span>
                <span className="text-lg font-black text-green-700">{batchReportModal.matched}</span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="block text-xs text-red-700 font-bold">لم ينجح</span>
                <span className="text-lg font-black text-red-700">{batchReportModal.failed}</span>
              </div>
            </div>

            {batchReportModal.failed > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-700 mb-2">أسباب عدم النجاح:</h4>
                <div className="max-h-36 overflow-y-auto bg-red-50/60 p-3 rounded-xl border border-red-100 text-xs text-red-800 space-y-1">
                  {batchReportModal.failedReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center mb-6">
              تم فحص جميع الملفات ومحاولة ربط اسم الصورة مع الـ ID المخصص (customId) لكل جهاز.
            </p>

            <button
              type="button"
              onClick={() => setBatchReportModal(null)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md hover:shadow-lg transition text-sm"
            >
              موافق (إغلاق التقرير)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
