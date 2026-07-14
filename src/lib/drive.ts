import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Request Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Uploads a file to Google Drive and sets its permissions to public so anyone can view it.
 */
export const uploadFileToDrive = async (
  file: File,
  customFileName?: string
): Promise<{ id: string; webViewLink: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้งาน Google ก่อนอัปโหลดไฟล์ไปยัง Google Drive');
  }

  const fileName = customFileName || file.name;
  const boundary = 'foo_bar_boundary_pdf';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
  };

  const metadataPart = new Blob([JSON.stringify(metadata) + '\r\n'], { type: 'application/json' });
  const mediaPart = file;

  const body = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataPart,
    delimiter,
    'Content-Type: application/pdf\r\n\r\n',
    mediaPart,
    closeDelimiter
  ]);

  // 1. Upload File
  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.error('Drive upload failed:', errorText);
    throw new Error(`การอัปโหลดไฟล์ล้มเหลว: ${uploadRes.statusText}`);
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;
  if (!fileId) {
    throw new Error('ไม่ได้รับรหัสไฟล์ (File ID) จาก Google Drive');
  }

  // 2. Set permissions to public ("anyone" as "reader")
  const permissionRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!permissionRes.ok) {
    const errorText = await permissionRes.text();
    console.error('Failed to set public permission:', errorText);
  }

  const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  return {
    id: fileId,
    webViewLink,
  };
};
