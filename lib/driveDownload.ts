/**
 * Download Google Drive files using the service account (private form uploads).
 * Falls back to public uc?export=download URL when SA is unavailable.
 */

import { google } from 'googleapis';
import { driveToDirectUrl } from '@/lib/prescriptionOcr';

function extractFileId(urlOrId: string): string | null {
  const u = String(urlOrId || '').trim();
  if (!u) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(u) && !u.includes('/')) return u;
  let m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return m[1];
  m = u.match(/[?&]id=([^&]+)/);
  if (m) return m[1];
  return null;
}

function getDriveAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

export async function downloadDriveFile(urlOrId: string): Promise<{
  base64: string;
  mime: string;
  fileId: string | null;
  via: 'service_account' | 'public_url';
}> {
  const fileId = extractFileId(urlOrId);
  const auth = getDriveAuth();

  if (fileId && auth) {
    try {
      const drive = google.drive({ version: 'v3', auth });
      const meta = await drive.files.get({
        fileId,
        fields: 'mimeType,name,size',
        supportsAllDrives: true,
      });
      const mime = meta.data.mimeType || 'image/jpeg';
      const size = Number(meta.data.size || 0);
      if (size > 12 * 1024 * 1024) {
        throw new Error('File exceeds 12MB');
      }

      // Google Docs / sheets — export not needed for form photo uploads
      if (mime.startsWith('application/vnd.google-apps.')) {
        throw new Error('Google Workspace native files are not supported for OCR');
      }

      const res = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      );
      const buf = Buffer.from(res.data as ArrayBuffer);
      if (buf.length < 50) throw new Error('Empty download');
      return {
        base64: buf.toString('base64'),
        mime: mime.startsWith('image/') ? mime : 'image/jpeg',
        fileId,
        via: 'service_account',
      };
    } catch (e: unknown) {
      // Fall through to public URL if SA cannot access (not shared with SA email)
      const msg = e instanceof Error ? e.message : '';
      if (/exceeds 12MB|Workspace native/i.test(msg)) throw e;
    }
  }

  // Public / anyone-with-link
  const direct = driveToDirectUrl(urlOrId);
  const res = await fetch(direct, {
    headers: {
      'User-Agent': 'medical-aid-automation/1.0',
      Accept: 'image/*,*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(
      `Failed to download (${res.status}). Share the file with the service account email or set link to "Anyone with the link".`
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) {
    throw new Error('Downloaded file too small — link may require auth');
  }
  if (buf.length > 12 * 1024 * 1024) {
    throw new Error('Image exceeds 12MB limit');
  }
  const head = buf.slice(0, 200).toString('utf8');
  if (/<html/i.test(head)) {
    throw new Error(
      'Got HTML instead of image — share file with service account or make link public'
    );
  }
  const mime =
    res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return {
    base64: buf.toString('base64'),
    mime: mime.startsWith('image/') ? mime : 'image/jpeg',
    fileId,
    via: 'public_url',
  };
}
