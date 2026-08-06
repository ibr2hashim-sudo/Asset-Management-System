import React, { useState } from 'react';
import { Users, UserPlus, Shield, Trash2, Edit2, Check, X, Key, Building2 } from 'lucide-react';
import { UserAccount, UserRole, Department } from '../types';

interface UsersPageProps {
  users: UserAccount[];
  departments: Department[];
  onAddUser: (user: Omit<UserAccount, 'id'>) => { success: boolean; message: string };
  onUpdateUser: (id: string, updated: Partial<UserAccount>) => void;
  onDeleteUser: (id: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({
  users,
  departments,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('supervisor');
  const [department, setDepartment] = useState('');

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleOpenModal = (user?: UserAccount) => {
    setMessage(null);
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword(user.password || '');
      setName(user.name);
      setRole(user.role);
      setDepartment(user.department || '');
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setName('');
      setRole('supervisor');
      setDepartment(departments.length > 0 ? departments[0].name : '');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (role === 'supervisor' && !department) {
      setMessage({ text: 'يرجى اختيار القسم الخاص بمشرف القسم', isError: true });
      return;
    }

    if (editingUser) {
      onUpdateUser(editingUser.id, {
        username: username.trim(),
        password: password.trim() || undefined,
        name: name.trim(),
        role,
        department: role === 'supervisor' ? department : undefined
      });
      setMessage({ text: 'تم تعديل بيانات المستخدم بنجاح', isError: false });
      setTimeout(() => setIsModalOpen(false), 1200);
    } else {
      const res = onAddUser({
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role,
        department: role === 'supervisor' ? department : undefined
      });
      if (res.success) {
        setMessage({ text: res.message, isError: false });
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setMessage({ text: res.message, isError: true });
      }
    }
  };

  const getRoleBadge = (r: UserRole, dept?: string) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
            <Shield className="w-3.5 h-3.5" />
            مدير النظام (Admin)
          </span>
        );
      case 'tech':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
            فني صيانة (Tech)
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
            <Building2 className="w-3.5 h-3.5" />
            مشرف قسم: {dept || 'غير محدد'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            إدارة المستخدمين والصلاحيات
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إضافة وتعديل وحذف حسابات المستخدمين (مدير نظام، فني صيانة، ومشرف قسم) وتحديد الأقسام
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-sm whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-bold">
              <tr>
                <th className="py-4 px-6">الاسم الكامل</th>
                <th className="py-4 px-6">اسم المستخدم (الدخول)</th>
                <th className="py-4 px-6">الصلاحية والقسم</th>
                <th className="py-4 px-6">كلمة المرور</th>
                <th className="py-4 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-4 px-6 font-bold text-gray-800">{u.name}</td>
                  <td className="py-4 px-6 font-mono text-gray-600 font-bold">{u.username}</td>
                  <td className="py-4 px-6">{getRoleBadge(u.role, u.department)}</td>
                  <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                    {u.password ? '••••••••' : 'بدون'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل المستخدم"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف حساب (${u.name})؟`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-800">
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {message && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-bold text-center ${
                  message.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. فهد العتيبي / مشرف قسم الطوارئ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم المستخدم (للدخول)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="example_user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    placeholder={editingUser ? 'اتركه فارغاً لعدم التغيير' : 'كلمة المرور'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">تحديد صلاحية المستخدم</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  <option value="supervisor">مشرف قسم (اطلاع على قسمه فقط + طلب صيانة)</option>
                  <option value="tech">فني صيانة (اطلاع وإدارة الصيانة والمتابعة الدورية)</option>
                  <option value="admin">مدير النظام (صلاحية كاملة + تقارير وإدارة مستخدمين)</option>
                </select>
              </div>

              {role === 'supervisor' && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 animate-fadeIn">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    اختيار القسم الخاص بمشرف القسم (إلزامي)
                  </label>
                  {departments.length === 0 ? (
                    <p className="text-xs text-red-600 font-bold">
                      لا توجد أقسام مسجلة حتى الآن. يرجى إضافة قسم في شاشة الأصول أولاً.
                    </p>
                  ) : (
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required={role === 'supervisor'}
                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                    >
                      <option value="">-- اختر القسم --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-amber-800 mt-1">
                    ملاحظة: سيتمكن المشرف من رؤية أجهزة هذا القسم فقط في شاشة العهد وتقديم طلبات الصيانة لها.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-sm"
                >
                  {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
