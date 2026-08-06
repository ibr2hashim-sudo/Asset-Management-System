export function normalizeDeptName(s: string): string {
  if (!s) return '';
  return s
    .trim()
    .replace(/[\s\u00A0\uFEFF\u200B]+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

export function getRealSubDepartments(dept: Department): string[] {
  if (!dept || !dept.subDepartments) return [];
  const normDept = normalizeDeptName(dept.name);
  return dept.subDepartments.filter(s => normalizeDeptName(s) !== normDept);
}


export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  department?: string; // إلزامي لمشرف القسم
}

export interface Department {
  id: string;
  name: string;
  subDepartments: string[];
}

export type AssetStatus = 'working' | 'broken' | 'damaged';

export interface Asset {
  id: string;
  customId: string; // ID مخصص لكل جهاز لا يتكرر
  name: string; // اسم الجهاز
  department: string; // القسم
  subDepartment: string; // اسم القسم الفرعي
  currentQuantity: number; // الكمية الحالية
  bookQuantity: number; // الكمية الدفترية
  difference: number; // الفارق
  model: string; // موديل الجهاز
  serialNumber: string; // رقم التسلسلي للجهاز
  company: string; // اسم الشركة
  accessories: string[]; // توابع الجهاز (ECG Cable / SPO2 / bp Cuff / Bottle / 2 Bottle / إلخ)
  status: AssetStatus; // شغال / عاطل / تالف
  custodian: string; // مستلم العهدة
  notes: string; // ملاحظات
  image?: string; // صورة الجهاز
}

export type OrderStatus = 'red' | 'yellow' | 'green';
// أحمر = إشعار جديد
// أصفر = تم استلام الشكوى (قيد الصيانة)
// أخضر = تم الإصلاح

export interface MaintenanceOrder {
  id: string;
  orderName: string; // اسم القسم - ID الجهاز - تاريخ اليوم
  department: string;
  assetId: string;
  assetCustomId: string;
  assetName: string;
  assetModel: string;
  createdAt: string; // YYYY-MM-DD
  complaint: string; // الشكوى (حقل نصي)
  status: OrderStatus;
  supervisorName?: string;
  initialReport?: string; // تقرير مبدئي للصيانة
  requiredParts?: string; // طلب القطع اللازمة للإصلاح
  finalReport?: string; // التقرير النهائي للإصلاح
  technician?: string;
  receivedAt?: string;
  completedAt?: string;
}

export interface MaintenanceCategory {
  id: string;
  name: string;
  defaultIntervalMeter?: number; // للأدمن لتحديد الوقت/العداد بين الصيانة والصيانة القادمة للزيوت والفلاتر
}

export interface MaintenanceLogEntry {
  id: string;
  assetId: string;
  categoryName: string; // 'تكييف' | 'زيوت وفلاتر' | 'بطاريات' | مخصص
  date: string;
  // التكييف
  workDone?: string;
  // الزيوت والفلاتر
  currentMeter?: number;
  nextMeter?: number;
  // البطاريات
  batteryName?: string;
  batteryModel?: string;
  batterySerial?: string;
  changeDate?: string;
  notes?: string;
}

