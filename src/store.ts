import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from './lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { safeStringify, sanitizeForFirestore } from './lib/utils';
import {
  Asset,
  MaintenanceOrder,
  MaintenanceLogEntry,
  MaintenanceCategory,
  UserAccount,
  Department,
  AssetStatus,
  OrderStatus,
  normalizeDeptName
} from './types';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'ADMIN123',
    name: 'مدير النظام',
    role: 'admin'
  }
];

const INITIAL_CATEGORIES: MaintenanceCategory[] = [
  { id: 'cat-1', name: 'تكييف' },
  { id: 'cat-2', name: 'زيوت وفلاتر', defaultIntervalMeter: 500 },
  { id: 'cat-3', name: 'بطاريات' }
];

export function useAppStore() {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('cmms_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('cmms_departments');
    return saved ? JSON.parse(saved) : [];
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('cmms_assets');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<MaintenanceOrder[]>(() => {
    const saved = localStorage.getItem('cmms_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<MaintenanceCategory[]>(() => {
    const saved = localStorage.getItem('cmms_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLogEntry[]>(() => {
    const saved = localStorage.getItem('cmms_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // المزامنة الحية (Real-time Sync) مع Firebase Firestore مع التعامل مع قيود الحصة (Quota Limits)
  const handleSyncError = (colName: string) => (err: any) => {
    console.warn(`Firestore "${colName}" sync fallback to local mode:`, err?.message || err);
  };

  useEffect(() => {
    localStorage.setItem('cmms_users', safeStringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('cmms_departments', safeStringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('cmms_assets', safeStringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('cmms_orders', safeStringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cmms_categories', safeStringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('cmms_logs', safeStringify(maintenanceLogs));
  }, [maintenanceLogs]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_users'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_users');
        const initial = saved ? JSON.parse(saved) : INITIAL_USERS;
        initial.forEach((u: UserAccount) => {
          setDoc(doc(db, 'cmms_users', u.id), sanitizeForFirestore(u)).catch(() => {});
        });
      } else {
        const loaded = snapshot.docs.map(d => d.data() as UserAccount);
        setUsers(loaded);
      }
    }, handleSyncError('users'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_departments'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_departments');
        if (saved) {
          const initial: Department[] = JSON.parse(saved);
          initial.forEach(d => setDoc(doc(db, 'cmms_departments', d.id), sanitizeForFirestore(d)).catch(() => {}));
        }
      } else {
        const loaded = snapshot.docs.map(d => d.data() as Department);
        setDepartments(loaded);
      }
    }, handleSyncError('depts'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_assets'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_assets');
        if (saved) {
          const initial: Asset[] = JSON.parse(saved);
          initial.forEach(a => setDoc(doc(db, 'cmms_assets', a.id), sanitizeForFirestore(a)).catch(() => {}));
        }
      } else {
        const loaded = snapshot.docs.map(d => d.data() as Asset);
        setAssets(loaded);
      }
    }, handleSyncError('assets'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_orders'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_orders');
        if (saved) {
          const initial: MaintenanceOrder[] = JSON.parse(saved);
          initial.forEach(o => setDoc(doc(db, 'cmms_orders', o.id), sanitizeForFirestore(o)).catch(() => {}));
        }
      } else {
        const loaded = snapshot.docs.map(d => d.data() as MaintenanceOrder);
        loaded.sort((a, b) => Number(b.id) - Number(a.id));
        setOrders(loaded);
      }
    }, handleSyncError('orders'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_categories'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_categories');
        const initial = saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
        initial.forEach((c: MaintenanceCategory) => {
          setDoc(doc(db, 'cmms_categories', c.id), sanitizeForFirestore(c)).catch(() => {});
        });
      } else {
        const loaded = snapshot.docs.map(d => d.data() as MaintenanceCategory);
        setCategories(loaded);
      }
    }, handleSyncError('categories'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cmms_logs'), (snapshot) => {
      if (snapshot.empty) {
        const saved = localStorage.getItem('cmms_logs');
        if (saved) {
          const initial: MaintenanceLogEntry[] = JSON.parse(saved);
          initial.forEach(l => setDoc(doc(db, 'cmms_logs', l.id), sanitizeForFirestore(l)).catch(() => {}));
        }
      } else {
        const loaded = snapshot.docs.map(d => d.data() as MaintenanceLogEntry);
        loaded.sort((a, b) => Number(b.id) - Number(a.id));
        setMaintenanceLogs(loaded);
      }
    }, handleSyncError('logs'));
    return () => unsub();
  }, []);

  // إدارة المستخدمين
  const addUser = (user: Omit<UserAccount, 'id'>) => {
    const exists = users.some(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (exists) {
      return { success: false, message: 'اسم المستخدم موجود مسبقاً!' };
    }
    const newUser: UserAccount = { ...user, id: Date.now().toString() };
    setUsers(prev => [...prev, newUser]);
    setDoc(doc(db, 'cmms_users', newUser.id), sanitizeForFirestore(newUser)).catch(console.error);
    return { success: true, message: 'تمت إضافة المستخدم بنجاح' };
  };

  const updateUser = (id: string, updated: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    const target = users.find(u => u.id === id);
    if (target) {
      const merged = { ...target, ...updated };
      setDoc(doc(db, 'cmms_users', id), sanitizeForFirestore(merged), { merge: true }).catch(console.error);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    deleteDoc(doc(db, 'cmms_users', id)).catch(console.error);
  };

  // إدارة الأقسام
  const addDepartment = (name: string, subDepartments: string[] = []) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const exists = departments.some(d => d.name === cleanName);
    if (exists) return;
    const newDept: Department = {
      id: Date.now().toString(),
      name: cleanName,
      subDepartments: subDepartments.length > 0 ? subDepartments : [cleanName]
    };
    setDepartments(prev => [...prev, newDept]);
    setDoc(doc(db, 'cmms_departments', newDept.id), sanitizeForFirestore(newDept)).catch(console.error);
  };

  const updateDepartment = (id: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    const dept = departments.find(d => d.id === id);
    if (!dept) return;
    const oldName = dept.name;
    // تحديث الأقسام في جدول الأصول
    const updatedAssets = assets.map(a => a.department === oldName ? { ...a, department: cleanName } : a);
    setAssets(updatedAssets);
    updatedAssets.forEach(a => {
      if (a.department === cleanName) {
        setDoc(doc(db, 'cmms_assets', a.id), sanitizeForFirestore(a), { merge: true }).catch(console.error);
      }
    });

    const updatedDept = { ...dept, name: cleanName };
    setDepartments(prev => prev.map(d => d.id === id ? updatedDept : d));
    setDoc(doc(db, 'cmms_departments', id), sanitizeForFirestore(updatedDept), { merge: true }).catch(console.error);
  };

  const deleteDepartment = (id: string) => {
    const dept = departments.find(d => d.id === id);
    if (!dept) return { success: false, message: 'القسم غير موجود' };
    const hasAssets = assets.some(a => normalizeDeptName(a.department) === normalizeDeptName(dept.name));
    if (hasAssets) {
      return { success: false, message: 'لا يمكنك مسح القسم بسبب وجود أصول ومعدات مسجلة بداخله' };
    }
    setDepartments(prev => prev.filter(d => d.id !== id));
    deleteDoc(doc(db, 'cmms_departments', id)).catch(console.error);
    return { success: true, message: 'تم مسح القسم بنجاح' };
  };

  const addSubDepartment = (deptId: string, subName: string) => {
    const cleanSub = subName.trim();
    if (!cleanSub) return;
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    if (dept.subDepartments.some(s => normalizeDeptName(s) === normalizeDeptName(cleanSub))) return;

    const updatedSubs = [...dept.subDepartments, cleanSub];
    const updatedDept = { ...dept, subDepartments: updatedSubs };
    setDepartments(prev => prev.map(d => d.id === deptId ? updatedDept : d));
    setDoc(doc(db, 'cmms_departments', deptId), sanitizeForFirestore(updatedDept), { merge: true }).catch(console.error);
  };

  const deleteSubDepartment = (deptId: string, subName: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return { success: false, message: 'القسم غير موجود' };
    const hasAssets = assets.some(
      a => normalizeDeptName(a.department) === normalizeDeptName(dept.name) && normalizeDeptName(a.subDepartment) === normalizeDeptName(subName)
    );
    if (hasAssets) {
      return { success: false, message: 'لا يمكنك مسح القسم الفرعي بسبب وجود أصول ومعدات مسجلة بداخله' };
    }
    const updatedSubs = dept.subDepartments.filter(s => normalizeDeptName(s) !== normalizeDeptName(subName));
    const updatedDept = { ...dept, subDepartments: updatedSubs };
    setDepartments(prev => prev.map(d => d.id === deptId ? updatedDept : d));
    setDoc(doc(db, 'cmms_departments', deptId), sanitizeForFirestore(updatedDept), { merge: true }).catch(console.error);
    return { success: true, message: 'تم مسح القسم الفرعي بنجاح' };
  };

  // إدارة الأصول والمعدات
  const addAsset = (asset: Omit<Asset, 'id' | 'difference'>) => {
    const exists = assets.some(a => a.customId.trim().toLowerCase() === asset.customId.trim().toLowerCase());
    if (exists) {
      return { success: false, message: 'ID الجهاز مخصص وموجود مسبقاً، لا يمكن تكراره!' };
    }
    const difference = (Number(asset.currentQuantity) || 0) - (Number(asset.bookQuantity) || 0);
    const newAsset: Asset = {
      ...asset,
      id: Date.now().toString(),
      difference
    };
    setAssets(prev => [newAsset, ...prev]);
    setDoc(doc(db, 'cmms_assets', newAsset.id), sanitizeForFirestore(newAsset)).catch(console.error);
    return { success: true, message: 'تمت إضافة الجهاز بنجاح' };
  };

  const updateAsset = (id: string, updated: Partial<Asset>) => {
    const target = assets.find(a => a.id === id);
    if (!target) return;
    const merged = { ...target, ...updated };
    const diff = (Number(merged.currentQuantity) || 0) - (Number(merged.bookQuantity) || 0);
    const updatedAsset = { ...merged, difference: diff };

    setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
    setDoc(doc(db, 'cmms_assets', id), sanitizeForFirestore(updatedAsset), { merge: true }).catch(console.error);
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    deleteDoc(doc(db, 'cmms_assets', id)).catch(console.error);
  };

  // استيراد مجموعة صور وربطها بالـ customId أو اسم الجهاز أو الرقم التسلسلي
  const batchImportImages = async (files: FileList | File[]): Promise<{ total: number; matched: number; failed: number; failedReasons: string[] }> => {
    let matched = 0;
    let failed = 0;
    const failedReasons: string[] = [];
    const updatedAssets = [...assets];
    const fileList = Array.from(files);

    const normalizeForMatch = (str: string) => {
      if (!str) return '';
      return str
        .trim()
        .toLowerCase()
        .replace(/[\s\-_._/\\]+/g, '') // إزالة المسافات والشرطات والرموز
        .replace(/[^a-z0-9أ-ي]/g, ''); // الاحتفاظ بالحروف والأرقام فقط
    };

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const rawFileName = file.name.split('/').pop()?.split('\\').pop() || file.name;
      const fileNameWithoutExt = rawFileName.replace(/\.[^/.]+$/, '').trim();
      const normFileName = normalizeForMatch(fileNameWithoutExt);

      if (!fileNameWithoutExt || !normFileName) {
        failed++;
        failedReasons.push(`الصورة (${file.name}): اسم الملف غير صالح`);
        continue;
      }

      let assetIndex = updatedAssets.findIndex(
        a => a.customId && a.customId.trim().toLowerCase() === fileNameWithoutExt.toLowerCase()
      );

      if (assetIndex === -1) {
        assetIndex = updatedAssets.findIndex(
          a =>
            (a.serialNumber && a.serialNumber.trim().toLowerCase() === fileNameWithoutExt.toLowerCase()) ||
            a.id.toLowerCase() === fileNameWithoutExt.toLowerCase() ||
            (a.name && a.name.trim().toLowerCase() === fileNameWithoutExt.toLowerCase())
        );
      }

      if (assetIndex === -1) {
        assetIndex = updatedAssets.findIndex(
          a => a.customId && normalizeForMatch(a.customId) === normFileName
        );
      }

      if (assetIndex === -1) {
        assetIndex = updatedAssets.findIndex(
          a =>
            (a.serialNumber && normalizeForMatch(a.serialNumber) === normFileName) ||
            normalizeForMatch(a.id) === normFileName ||
            (a.name && normalizeForMatch(a.name) === normFileName)
        );
      }

      if (assetIndex === -1 && normFileName.length >= 3) {
        assetIndex = updatedAssets.findIndex(a => {
          const normCustomId = normalizeForMatch(a.customId || '');
          if (normCustomId && normCustomId.length >= 3) {
            return normFileName.includes(normCustomId) || normCustomId.includes(normFileName);
          }
          return false;
        });
      }

      if (assetIndex !== -1) {
        try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          updatedAssets[assetIndex] = { ...updatedAssets[assetIndex], image: base64 };
          matched++;
          setDoc(doc(db, 'cmms_assets', updatedAssets[assetIndex].id), sanitizeForFirestore(updatedAssets[assetIndex]), { merge: true }).catch(console.error);
        } catch (err) {
          failed++;
          failedReasons.push(`الصورة (${file.name}): فشل في قراءة الملف`);
        }
      } else {
        failed++;
        failedReasons.push(`الصورة (${file.name}): عدم مطابقة مع ID المخصص (customId) لأي جهاز موجود`);
      }
    }

    setAssets(updatedAssets);
    return {
      total: fileList.length,
      matched,
      failed,
      failedReasons
    };
  };

  // طلبات الصيانة
  const addOrder = (order: {
    department: string;
    assetId: string;
    assetCustomId: string;
    assetName: string;
    assetModel: string;
    complaint: string;
    supervisorName?: string;
  }) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const orderName = `${order.department} - ${order.assetCustomId} - ${todayDate}`;
    const newOrder: MaintenanceOrder = {
      id: Date.now().toString(),
      orderName,
      department: order.department,
      assetId: order.assetId,
      assetCustomId: order.assetCustomId,
      assetName: order.assetName,
      assetModel: order.assetModel,
      createdAt: todayDate,
      complaint: order.complaint,
      status: 'red',
      supervisorName: order.supervisorName
    };
    setOrders(prev => [newOrder, ...prev]);
    setDoc(doc(db, 'cmms_orders', newOrder.id), sanitizeForFirestore(newOrder)).catch(console.error);
  };

  const receiveOrder = (orderId: string, technicianName: string) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const updated = {
      ...target,
      status: 'yellow' as OrderStatus,
      receivedAt: todayDate,
      technician: technicianName
    };
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    setDoc(doc(db, 'cmms_orders', orderId), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  };

  const updateOrderDetails = (orderId: string, updated: Partial<MaintenanceOrder>) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const merged = { ...target, ...updated };
    setOrders(prev => prev.map(o => o.id === orderId ? merged : o));
    setDoc(doc(db, 'cmms_orders', orderId), sanitizeForFirestore(merged), { merge: true }).catch(console.error);
  };

  const completeOrder = (orderId: string, technicianName: string) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const updated = {
      ...target,
      status: 'green' as OrderStatus,
      completedAt: todayDate,
      technician: technicianName
    };
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    setDoc(doc(db, 'cmms_orders', orderId), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    deleteDoc(doc(db, 'cmms_orders', orderId)).catch(console.error);
  };

  // فئات/تصنيفات المتابعة
  const addCategory = (name: string, defaultIntervalMeter?: number) => {
    const cleanName = name.trim();
    if (!cleanName || categories.some(c => c.name === cleanName)) return;
    const newCat: MaintenanceCategory = {
      id: Date.now().toString(),
      name: cleanName,
      defaultIntervalMeter
    };
    setCategories(prev => [...prev, newCat]);
    setDoc(doc(db, 'cmms_categories', newCat.id), sanitizeForFirestore(newCat)).catch(console.error);
  };

  // سجلات المتابعة الدورية
  const addMaintenanceLog = (entry: Omit<MaintenanceLogEntry, 'id'>) => {
    const newEntry: MaintenanceLogEntry = { ...entry, id: Date.now().toString() };
    setMaintenanceLogs(prev => [newEntry, ...prev]);
    setDoc(doc(db, 'cmms_logs', newEntry.id), sanitizeForFirestore(newEntry)).catch(console.error);
  };

  const deleteMaintenanceLog = (id: string) => {
    setMaintenanceLogs(prev => prev.filter(l => l.id !== id));
    deleteDoc(doc(db, 'cmms_logs', id)).catch(console.error);
  };

  // التصدير إلى Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const assetsData = assets.map(a => ({
      'ID مخصص': a.customId,
      'اسم الجهاز': a.name,
      'القسم': a.department,
      'القسم الفرعي': a.subDepartment,
      'الكمية الحالية': a.currentQuantity,
      'الكمية الدفترية': a.bookQuantity,
      'الفارق': a.difference,
      'الموديل': a.model,
      'الرقم التسلسلي': a.serialNumber,
      'الشركة المصنعة': a.company,
      'التوابع': a.accessories?.join(' - ') || '',
      'الحالة': a.status === 'working' ? 'شغال' : a.status === 'broken' ? 'عاطل' : 'تالف',
      'مستلم العهدة': a.custodian,
      'ملاحظات': a.notes
    }));
    const wsAssets = XLSX.utils.json_to_sheet(assetsData);
    XLSX.utils.book_append_sheet(wb, wsAssets, 'الأصول والمعدات');

    const ordersData = orders.map(o => ({
      'رقم/اسم الطلب': o.orderName,
      'القسم': o.department,
      'ID الجهاز': o.assetCustomId,
      'اسم الجهاز': o.assetName,
      'الموديل': o.assetModel,
      'تاريخ الطلب': o.createdAt,
      'الشكوى': o.complaint,
      'الحالة': o.status === 'red' ? 'معلق (أحمر)' : o.status === 'yellow' ? 'قيد الصيانة (أصفر)' : 'تم الإصلاح (أخضر)',
      'التقرير المبدئي': o.initialReport || '',
      'القطع اللازمة': o.requiredParts || '',
      'التقرير النهائي': o.finalReport || '',
      'الفني المسؤول': o.technician || '',
      'تاريخ الاستلام': o.receivedAt || '',
      'تاريخ الإنجاز': o.completedAt || ''
    }));
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'طلبات الصيانة');

    const logsData = maintenanceLogs.map(l => {
      const asset = assets.find(a => a.id === l.assetId);
      return {
        'ID الجهاز': asset?.customId || l.assetId,
        'اسم الجهاز': asset?.name || '',
        'التصنيف': l.categoryName,
        'التاريخ': l.date,
        'ما تم عمله': l.workDone || '',
        'قراءة العداد الحالي': l.currentMeter ?? '',
        'قراءة العداد القادم': l.nextMeter ?? '',
        'اسم البطارية': l.batteryName || '',
        'موديل البطارية': l.batteryModel || '',
        'رقم تسلسل البطارية': l.batterySerial || '',
        'تاريخ تغيير البطارية': l.changeDate || '',
        'ملاحظات': l.notes || ''
      };
    });
    const wsLogs = XLSX.utils.json_to_sheet(logsData);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'متابعة الصيانة');

    XLSX.writeFile(wb, `CMMS_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // الاستيراد من Excel (.xlsx, .xls) أو CSV UTF-8
  const importFromExcel = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
      let wb: XLSX.WorkBook;

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        wb = XLSX.read(text, { type: 'string', raw: false });
      } else {
        const data = await file.arrayBuffer();
        wb = XLSX.read(data, { type: 'array', cellDates: true, codepage: 65001 });
      }

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        return { success: false, message: 'الملف فارغ ولا يحتوي على أي أوراق عمل.' };
      }

      const targetSheetName = wb.SheetNames.includes('الأصول والمعدات')
        ? 'الأصول والمعدات'
        : wb.SheetNames[0];

      const ws = wb.Sheets[targetSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json || json.length === 0) {
        return { success: false, message: 'لم يتم العثور على أي صفوف بيانات داخل الملف.' };
      }

      const normalizeKey = (key: string) => {
        return String(key || '')
          .replace(/^\uFEFF/, '')
          .replace(/["']/g, '')
          .trim()
          .toLowerCase()
          .replace(/[ة]/g, 'ه')
          .replace(/[أإآ]/g, 'ا')
          .replace(/\s+/g, ' ');
      };

      const getColumnValue = (row: any, ...possibleKeys: string[]) => {
        const normalizedPossibles = possibleKeys.map(k => normalizeKey(k));
        for (const rawKey of Object.keys(row)) {
          const normKey = normalizeKey(rawKey);
          if (normalizedPossibles.includes(normKey)) {
            const val = row[rawKey];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
        return '';
      };

      const importedAssets: Asset[] = [];
      const newDeptsMap: { [key: string]: Set<string> } = {};

      for (let i = 0; i < json.length; i++) {
        const row = json[i];

        const customId = getColumnValue(
          row,
          'ID',
          'Code',
          'ID مخصص',
          'معرف مخصص',
          'رقم الجهاز',
          'كود الجهاز',
          'الرقم المخصص',
          'Custom ID',
          'id',
          'code'
        );

        const name = getColumnValue(
          row,
          'اسم الجهاز',
          'Device Name',
          'اسم المعدة',
          'الاسم',
          'اسم الأصل',
          'الجهاز',
          'Name',
          'Asset Name'
        );

        if (!customId && !name) continue;

        const finalCustomId = customId || `AST-${Date.now()}-${i + 1}`;
        const finalName = name || 'جهاز بدون اسم';

        const rawDept = getColumnValue(
          row,
          'القسم',
          'قسم',
          'اسم القسم',
          'القسم الرئيسي',
          'اسم القسم الرئيسي',
          'Department',
          'Dept',
          'الإدارة',
          'الادارة',
          'اسم الإدارة',
          'اسم الادارة',
          'الفرع',
          'الموقع',
          'موقع الجهاز',
          'المكان',
          'العهدة',
          'جهة العهدة',
          'القسم / الادارة',
          'القسم/الإدارة',
          'موقع العهدة',
          'المبنى',
          'المستلم'
        );

        let department = rawDept ? rawDept.trim().replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ') : 'عام';
        // مطابقة مرنة مع الأقسام الموجودة في النظام لمنع تكرار الأقسام أو حدوث صفر أجهزة بسبب اختلافات طفيفة في المسافات أو الهمزات
        const existingDeptMatch = departments.find(d => normalizeDeptName(d.name) === normalizeDeptName(department));
        if (existingDeptMatch) {
          department = existingDeptMatch.name;
        }

        const rawSubDept = getColumnValue(
          row,
          'القسم الفرعي',
          'قسم فرعي',
          'اسم القسم الفرعي',
          'القسم الداخلي',
          'قسم داخلي',
          'اسم القسم الداخلي',
          'القسم الفرعي / الداخلي',
          'القسم الفرعي/الداخلي',
          'Sub Department',
          'SubDepartment',
          'SubDept',
          'الوحدة',
          'الوحده',
          'الموقع الفرعي',
          'الغرفة',
          'الغرفه',
          'المكان الفرعي',
          'الموقع الداخلي'
        );

        let subDepartment = rawSubDept ? rawSubDept.trim().replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ') : department;
        if (!subDepartment || normalizeDeptName(subDepartment) === normalizeDeptName(department)) {
          subDepartment = department;
        }

        if (!newDeptsMap[department]) newDeptsMap[department] = new Set();
        newDeptsMap[department].add(subDepartment);

        const currentQtyStr = getColumnValue(
          row,
          'الكمية',
          'الكميه',
          'الكمية الحالية',
          'الكميه الحالية',
          'Quantity',
          'Qty',
          'العدد',
          'العدد الحالي'
        );
        const currentQuantity = Number(currentQtyStr) || 1;

        const bookQtyStr = getColumnValue(
          row,
          'الكمية الدفترية',
          'الكميه الدفتريه',
          'الكمية الدفتريه',
          'الكميه الدفترية',
          'Book Quantity',
          'العدد الدفتري'
        );
        const bookQuantity = bookQtyStr ? (Number(bookQtyStr) || currentQuantity) : currentQuantity;

        const difference = currentQuantity - bookQuantity;

        const statusStr = getColumnValue(row, 'الحالة', 'حالة الجهاز', 'Status', 'حاله الجهاز', 'الحاله');
        const status: AssetStatus =
          statusStr.includes('عاطل') || statusStr.toLowerCase().includes('broken') || statusStr.includes('عطلان') ? 'broken' :
          statusStr.includes('تالف') || statusStr.toLowerCase().includes('damaged') || statusStr.includes('خارج الخدمة') ? 'damaged' : 'working';

        const accessoriesStr = getColumnValue(row, 'التوابع', 'الملحقات', 'Accessories');
        const accessories = accessoriesStr
          ? accessoriesStr.split(/[-,،]/).map(s => s.trim()).filter(Boolean)
          : [];

        const model = getColumnValue(row, 'الموديل', 'المودل', 'Model', 'موديل الجهاز');
        const serialNumber = getColumnValue(
          row,
          'الرقم التسلسلي',
          'سيريال',
          'Serial Number',
          'Serial',
          'S/N',
          'رقم تسلسلي'
        );
        const company = getColumnValue(
          row,
          'الشركة المصنعة',
          'الشركة المصنعه',
          'الشركه المصنعه',
          'Company',
          'Manufacturer',
          'الشركة',
          'المصنع',
          'Brand'
        );
        const custodian = getColumnValue(row, 'مستلم العهدة', 'العهدة', 'المستلم', 'Custodian');
        const notes = getColumnValue(row, 'ملاحظات', 'الملاحظات', 'Notes', 'ملاحظة', 'الملاحظه', 'ملاحظه');

        const newAssetItem: Asset = {
          id: Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
          customId: finalCustomId,
          name: finalName,
          department,
          subDepartment,
          currentQuantity,
          bookQuantity,
          difference,
          model,
          serialNumber,
          company,
          accessories,
          status,
          custodian,
          notes
        };

        importedAssets.push(newAssetItem);
        setDoc(doc(db, 'cmms_assets', newAssetItem.id), sanitizeForFirestore(newAssetItem)).catch(console.error);
      }

      if (importedAssets.length === 0) {
        return {
          success: false,
          message: 'لم يتم العثور على أصول في الملف. يرجى التأكد من أن الملف يحتوي على أعمدة مثل: "ID" أو "اسم الجهاز".'
        };
      }

      const updatedDepts = [...departments];
      Object.keys(newDeptsMap).forEach(deptName => {
        let existDept = updatedDepts.find(d => normalizeDeptName(d.name) === normalizeDeptName(deptName));
        if (!existDept) {
          existDept = {
            id: Date.now() + Math.random().toString(),
            name: deptName,
            subDepartments: Array.from(newDeptsMap[deptName])
          };
          updatedDepts.push(existDept);
        } else {
          const subs = new Set([...existDept.subDepartments, ...Array.from(newDeptsMap[deptName])]);
          existDept.subDepartments = Array.from(subs);
        }
        setDoc(doc(db, 'cmms_departments', existDept.id), sanitizeForFirestore(existDept)).catch(console.error);
      });

      setDepartments(updatedDepts);
      setAssets(importedAssets);

      return {
        success: true,
        message: `تم استيراد ${importedAssets.length} جهاز بنجاح من ملف (${file.name})`
      };
    } catch (err) {
      console.error('Excel/CSV Import Error:', err);
      return {
        success: false,
        message: 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من أن الملف بصيغة Excel أو CSV (UTF-8).'
      };
    }
  };

  // إعادة ضبط المصنع (للأدمن فقط)
  const resetFactory = async (passwordInput: string): Promise<{ success: boolean; message: string }> => {
    const adminUser = users.find(u => u.role === 'admin');
    const expectedPass = adminUser?.password || 'ADMIN123';
    if (!passwordInput || passwordInput.trim() !== expectedPass.trim()) {
      return { success: false, message: 'كلمة مرور الأدمن غير صحيحة!' };
    }

    // مسح المستندات من Firestore
    const collectionsToClear = ['cmms_assets', 'cmms_orders', 'cmms_departments', 'cmms_logs', 'cmms_categories', 'cmms_users'];
    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error('Error clearing collection:', colName, e);
      }
    }

    // تعيين البيانات المستعادة
    try {
      const userPromises = INITIAL_USERS.map(u => setDoc(doc(db, 'cmms_users', u.id), sanitizeForFirestore(u)));
      const catPromises = INITIAL_CATEGORIES.map(c => setDoc(doc(db, 'cmms_categories', c.id), sanitizeForFirestore(c)));
      await Promise.all([...userPromises, ...catPromises]);
    } catch (e) {
      console.error('Error restoring initial data in Firestore:', e);
    }

    setAssets([]);
    setOrders([]);
    setDepartments([]);
    setMaintenanceLogs([]);
    setCategories(INITIAL_CATEGORIES);
    setUsers(INITIAL_USERS);

    localStorage.removeItem('cmms_assets');
    localStorage.removeItem('cmms_orders');
    localStorage.removeItem('cmms_departments');
    localStorage.removeItem('cmms_logs');
    localStorage.removeItem('cmms_categories');
    localStorage.setItem('cmms_users', safeStringify(INITIAL_USERS));

    return { success: true, message: 'تم مسح جميع بيانات النظام بنجاح وإعادة ضبط المصنع' };
  };

  const syncLocalToCloud = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const operations: { ref: any; data: any; col: string; id: string }[] = [];

      departments.forEach(d => {
        if (d?.id) operations.push({ ref: doc(db, 'cmms_departments', d.id), data: sanitizeForFirestore(d), col: 'قسم', id: d.id });
      });

      assets.forEach(a => {
        if (a?.id) {
          let sanitized = sanitizeForFirestore(a);
          // If image is a huge base64 string (> 750KB), strip or compress for Firestore doc to prevent 1MB overflow
          if (sanitized.imageUrl && typeof sanitized.imageUrl === 'string' && sanitized.imageUrl.length > 750000) {
            console.warn(`Asset ${a.name} image exceeds Firestore doc limit (${sanitized.imageUrl.length} chars). Omitting base64 image in cloud sync.`);
            sanitized = { ...sanitized, imageUrl: '' };
          }
          operations.push({ ref: doc(db, 'cmms_assets', a.id), data: sanitized, col: 'جهاز', id: a.id });
        }
      });

      orders.forEach(o => {
        if (o?.id) operations.push({ ref: doc(db, 'cmms_orders', o.id), data: sanitizeForFirestore(o), col: 'أمر صيانة', id: o.id });
      });

      categories.forEach(c => {
        if (c?.id) operations.push({ ref: doc(db, 'cmms_categories', c.id), data: sanitizeForFirestore(c), col: 'تصنيف', id: c.id });
      });

      maintenanceLogs.forEach(l => {
        if (l?.id) operations.push({ ref: doc(db, 'cmms_logs', l.id), data: sanitizeForFirestore(l), col: 'سجل', id: l.id });
      });

      users.forEach(u => {
        if (u?.id) operations.push({ ref: doc(db, 'cmms_users', u.id), data: sanitizeForFirestore(u), col: 'مستخدم', id: u.id });
      });

      if (operations.length === 0) {
        return { success: true, message: 'لا توجد بيانات محلية للمزامنة.' };
      }

      // Sync documents concurrently in small chunks using setDoc with a per-item timeout
      const CHUNK_SIZE = 15;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map(op =>
            Promise.race([
              setDoc(op.ref, op.data, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout writing document')), 8000))
            ])
          )
        );

        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            successCount++;
          } else {
            console.error(`Failed to write ${chunk[idx].col} (${chunk[idx].id}):`, r.reason);
            failCount++;
          }
        });
      }

      if (failCount > 0 && successCount === 0) {
        return {
          success: false,
          message: 'تعذرت المزامنة مع قاعدة البيانات. يرجى التأكد من الاتصال بالإنترنت.'
        };
      }

      if (failCount > 0) {
        return {
          success: true,
          message: `تمت مزامنة ${successCount} عنصر بنجاح! (${failCount} عنصر تعذرت مزامنته بسبب حجم البيانات).`
        };
      }

      return {
        success: true,
        message: `تمت المزامنة بنجاح! تم رفع جميع البيانات (${operations.length} عنصر) إلى السحابة، ويمكنك الآن رؤيتها من أي جهاز آخر.`
      };
    } catch (err: any) {
      console.error('Error syncing local to cloud:', err);
      return { success: false, message: 'حدث خطأ أثناء المزامنة: ' + (err?.message || String(err)) };
    }
  };

  return {
    users,
    departments,
    assets,
    orders,
    categories,
    maintenanceLogs,
    syncLocalToCloud,
    addUser,
    updateUser,
    deleteUser,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addSubDepartment,
    deleteSubDepartment,
    addAsset,
    updateAsset,
    deleteAsset,
    batchImportImages,
    batchImportAssetImages: batchImportImages,
    addOrder,
    receiveOrder,
    updateOrderDetails,
    completeOrder,
    deleteOrder,
    addCategory,
    addMaintenanceLog,
    deleteMaintenanceLog,
    exportToExcel,
    exportAssetsExcel: exportToExcel,
    importFromExcel,
    importAssetsExcel: importFromExcel,
    resetFactory,
    factoryResetAll: resetFactory
  };
}
