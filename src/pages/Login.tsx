import React, { useState } from 'react';
import { Wrench, Lock, User, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';

interface LoginProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const matchedUser = users.find(
      u =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password
    );

    if (matchedUser) {
      onLogin(matchedUser);
    } else if (username.toLowerCase() === 'admin' && password === 'ADMIN123') {
      // حساب الأدمن الافتراضي الدائم في حال عدم تطابق الكيس
      onLogin({
        id: 'admin-1',
        username: 'admin',
        password: 'ADMIN123',
        name: 'مدير النظام',
        role: 'admin'
      });
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو التواصل مع مدير النظام.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">نظام إدارة الأصول والصيانة</h1>
          <p className="text-sm text-gray-500 mt-1">سجل دخولك للمتابعة وإدارة الأصول والعهد وطلبات الصيانة</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">اسم المستخدم</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="showPasswordCheckbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="showPasswordCheckbox" className="text-xs font-bold text-gray-600 cursor-pointer select-none">
                إظهار كلمة المرور
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition mt-2"
          >
            تسجيل الدخول
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200/60 leading-relaxed">
            <div>حساب مدير النظام الافتراضي:</div>
            <div className="mt-1 font-mono text-gray-800 font-extrabold">admin / ADMIN123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

