import React, { useState } from 'react';
import { Cloud, Check, AlertTriangle, X, Shield, Lock } from 'lucide-react';
import { authorizeGoogleDrive, backupDataToGoogleDrive, getSavedClientId, saveClientId } from '../lib/googleDrive';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataToBackup: any;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose, dataToBackup }) => {
  const [clientId, setClientId] = useState(getSavedClientId() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveClientId = () => {
    if (!clientId.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال Client ID صحيح أولاً.' });
      return;
    }
    saveClientId(clientId.trim());
    setStatusMsg({ type: 'success', text: 'تم حفظ Client ID بنجاح! يمكنك الآن النسخ الاحتياطي.' });
  };

  const handleBackupNow = async () => {
    setIsLoading(true);
    setStatusMsg({ type: 'info', text: 'جاري فتح نافذة تسجيل الدخول في حساب Google...' });
    try {
      const token = await authorizeGoogleDrive();
      setStatusMsg({ type: 'info', text: 'تم تسجيل الدخول بنجاح! جاري رفع ملف النسخة الاحتياطية إلى Google Drive...' });
      await backupDataToGoogleDrive(token, dataToBackup, `CMMS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      setStatusMsg({ type: 'success', text: 'تم أخذ النسخة الاحتياطية وحفظها في Google Drive بنجاح!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'حدث خطأ غير متوقع أثناء الاتصال.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">النسخ الاحتياطي في Google Drive</h3>
            <p className="text-sm text-gray-500">حفظ بيانات النظام مباشرة في السحابة الخاصة بك</p>
          </div>
        </div>

        {statusMsg && (
          <div className={`p-4 rounded-xl text-sm mb-4 flex items-start gap-2 ${
            statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {statusMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
            <p className="leading-relaxed">{statusMsg.text}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Google Client ID (إجباري للربط مع Drive):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="flex-1 text-left dir-ltr px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleSaveClientId}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                حفظ
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              يمكنك الحصول على Client ID من <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Cloud Console</a> — APIs &amp; Services — Credentials.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleBackupNow}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Cloud className="w-5 h-5" />
              <span>{isLoading ? 'جاري الاتصال والنسخ...' : 'بدء النسخ الاحتياطي الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
