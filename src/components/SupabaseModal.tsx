import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, Copy, Check, RefreshCw, ExternalLink, Key, Link as LinkIcon, Server } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseClient, resetSupabaseClient } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataToSync: {
    departments: any[];
    assets: any[];
    orders: any[];
    categories: any[];
    maintenanceLogs: any[];
    users: any[];
  };
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, dataToSync }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      if (config.url && config.anonKey) {
        testConnection(config.url, config.anonKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testConnection = async (testUrl = url, testKey = anonKey) => {
    if (!testUrl || !testKey) {
      setStatus('error');
      setStatusMsg('يرجى إدخال رابط المشروع (Project URL) والمفتاح العام (Anon Key).');
      return;
    }

    setStatus('testing');
    setStatusMsg('جاري الاتصال بسحابة Supabase...');

    try {
      saveSupabaseConfig(testUrl, testKey);
      resetSupabaseClient();
      const client = getSupabaseClient();

      if (!client) {
        throw new Error('فشل إنشاء عميل Supabase. تأكد من صحة الرابط.');
      }

      // Try selecting or pinging
      const { error } = await client.from('cmms_data').select('id').limit(1);

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        // 42P01 is table does not exist yet which means auth/url is valid!
        throw error;
      }

      setStatus('connected');
      setStatusMsg('تم الاتصال بسحابة Supabase بنجاح! السحابة جاهزة لنقل البيانات.');
    } catch (err: any) {
      console.error('Supabase test connection error:', err);
      setStatus('error');
      const msg = err?.message || String(err);
      if (msg.includes('Failed to fetch') || msg.includes('FetchError') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
        setStatusMsg('تعذر الوصول إلى رابط المشروع (ERR_NAME_NOT_RESOLVED). يرجى التأكد من اختيار مشروع فعال على Supabase ونسخ Project URL الصحيح من (Project Settings -> API).');
      } else {
        setStatusMsg('فشل الاتصال بـ Supabase: ' + msg);
      }
    }
  };

  const handleSaveAndSync = async () => {
    saveSupabaseConfig(url, anonKey);
    resetSupabaseClient();
    const client = getSupabaseClient();

    if (!client) {
      setStatus('error');
      setStatusMsg('يرجى التأكد من إدخال بيانات الربط الصحيحة أولاً.');
      return;
    }

    setIsSyncing(true);
    setStatusMsg('جاري رفع البيانات إلى سحابة Supabase...');

    try {
      // We store all CMMS collections into key-value store table `cmms_data` or individual collections
      const payload = [
        { key_name: 'departments', data_value: dataToSync.departments, updated_at: new Date().toISOString() },
        { key_name: 'assets', data_value: dataToSync.assets, updated_at: new Date().toISOString() },
        { key_name: 'orders', data_value: dataToSync.orders, updated_at: new Date().toISOString() },
        { key_name: 'categories', data_value: dataToSync.categories, updated_at: new Date().toISOString() },
        { key_name: 'maintenanceLogs', data_value: dataToSync.maintenanceLogs, updated_at: new Date().toISOString() },
        { key_name: 'users', data_value: dataToSync.users, updated_at: new Date().toISOString() },
      ];

      const { error } = await client.from('cmms_data').upsert(payload, { onConflict: 'key_name' });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('جدول cmms_data غير موجود بعد في قاعدة بيانات Supabase. يمكنك إنشاؤه بنسخ كود SQL الموضح أدناه وتشغيله بضغطة زر واحدة في SQL Editor داخل موقع Supabase.');
        }
        throw error;
      }

      setStatus('connected');
      setStatusMsg('تمت مزامنة ورفع جميع البيانات بنجاح إلى قاعدة بيانات Supabase PostgreSQL!');
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      setStatus('error');
      const msg = err?.message || String(err);
      if (msg.includes('Failed to fetch') || msg.includes('FetchError') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
        setStatusMsg('تعذر الوصول إلى النطاق (ERR_NAME_NOT_RESOLVED). يرجى التأكد من نسخ Project URL الصحيح لمشروعك من لوحة تحكم Supabase.');
      } else {
        setStatusMsg('خطأ أثناء المزامنة: ' + msg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const sqlCode = `-- قم بنسخ هذا الكود وتشغيله في SQL Editor داخل موقع Supabase
CREATE TABLE IF NOT EXISTS public.cmms_data (
  key_name TEXT PRIMARY KEY,
  data_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- السماح بالقراءة والكتابة للجميع
ALTER TABLE public.cmms_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read" ON public.cmms_data FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON public.cmms_data FOR ALL USING (true);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                ربط سحابة Supabase PostgreSQL
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  سحابة مجانية 100%
                </span>
              </h3>
              <p className="text-xs text-gray-5-00 mt-0.5">
                مزامنة فائقة السرعة وقاعدة بيانات PostgreSQL مع دعم الوصول المباشر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
            status === 'connected' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            status === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />}
            {status === 'connected' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            {status === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
              رابط المشروع (Project URL)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dir-ltr font-mono bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              المفتاح العام (anon / public key)
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dir-ltr font-mono bg-gray-50/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح موقع Supabase وإنشاء حساب مجاني
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => testConnection()}
              disabled={status === 'testing' || isSyncing}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              فحص الاتصال
            </button>
            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSyncing || status === 'testing'}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
              حفظ ومزامنة الآن
            </button>
          </div>
        </div>

        {/* SQL Script Accordion */}
        <div className="mt-6 p-4 rounded-xl bg-gray-900 text-gray-100 text-xs dir-ltr">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
            <span className="font-mono text-emerald-400 font-semibold text-[11px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Supabase SQL Editor Script
            </span>
            <button
              onClick={copySqlToClipboard}
              className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-400" />
                  Copy SQL
                </>
              )}
            </button>
          </div>
          <pre className="font-mono text-[11px] text-gray-300 overflow-x-auto p-2 bg-black/40 rounded-lg whitespace-pre-wrap">
            {sqlCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
