import { getActiveFirebaseConfig } from './firebase';

const CLIENT_ID_STORAGE_KEY = 'custom_google_drive_client_id';

export function getSavedClientId(): string | null {
  try {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
}

export function removeClientId(): void {
  localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
}

export async function authorizeGoogleDrive(): Promise<string> {
  // استخدام Google OAuth عبر نافذة منبثقة بسيطة وواضحة
  const clientId = getSavedClientId();
  if (!clientId) {
    throw new Error('يرجى إدخال Client ID الخاص بحساب Google أولاً من الإعدادات.');
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
  const redirectUri = encodeURIComponent(window.location.origin);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=select_account`;

  const popup = window.open(authUrl, 'GoogleDriveAuth', 'width=600,height=600');
  if (!popup) {
    throw new Error('قام المتصفح بحظر النافذة المنبثقة (Popup Blocker). الرجاء السماح بالنوافذ المنبثقة لموقعك.');
  }

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'));
        }
        if (popup.location.href.includes('access_token=')) {
          const params = new URLSearchParams(popup.location.hash.substring(1));
          const accessToken = params.get('access_token');
          popup.close();
          clearInterval(timer);
          if (accessToken) {
            resolve(accessToken);
          } else {
            reject(new Error('لم يتم الحصول على رمز الدخول من Google.'));
          }
        }
      } catch (e) {
        // cross-origin security errors until redirected back
      }
    }, 500);
  });
}

export async function backupDataToGoogleDrive(accessToken: string, data: any, fileName = 'CMMS_Backup.json'): Promise<void> {
  const fileContent = JSON.stringify(data, null, 2);
  const fileMetadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error('حدث خطأ أثناء رفع النسخة الاحتياطية إلى Google Drive.');
  }
}
