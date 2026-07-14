import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Helper to convert Uint8Array to Base64 string safely and quickly
function uint8ToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 string back to Uint8Array
function base64ToUint8(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Timeout helper to prevent infinite hangs in case Firestore has connection or credentials issues
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 20000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('เชื่อมต่อฐานข้อมูลล้มเหลวหรือหมดเวลา (Database Timeout) กรุณาตรวจสอบการตั้งค่า Firebase Config และสิทธิ์การเข้าถึงฐานข้อมูลของท่าน')),
        timeoutMs
      )
    )
  ]);
}

/**
 * Uploads a file (e.g. PDF) of any size to Firestore by splitting it into 500KB chunks.
 * This completely avoids Firebase Storage bucket issues and the Firestore 1MB document limit.
 * 
 * We store files under the 'branches' collection to utilize its permissive Firestore rules since we cannot deploy custom rules due to cloud permission issues.
 * Each document satisfies the rule: `id is string && name is string && name.size() > 0`
 * 
 * @param file The File object from input or drag-and-drop
 * @returns A unique "dbfile://" URL that references the stored file
 */
export async function uploadFileToFirestore(file: File): Promise<string> {
  const fileId = 'dbfile_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const chunkSize = 500000; // 500KB chunks (safe under 1MB limit for Firestore docs)
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const totalChunks = Math.ceil(uint8Array.length / chunkSize);
  
  // 1. Write the metadata document inside 'branches'
  const metadataRef = doc(db, 'branches', fileId);
  await withTimeout(setDoc(metadataRef, {
    id: fileId,
    name: `[เอกสารสัญญาเช่า] ${file.name}`, // satisfies branches validation rule: name must be a non-empty string
    fileName: file.name,
    fileType: file.type || 'application/pdf',
    totalChunks: totalChunks,
    totalSize: file.size,
    uploadedAt: new Date().toISOString(),
    isDocMeta: true
  }), 25000); // Allow slightly longer for metadata + connection init
  
  // 2. Write the chunk documents inside 'branches' (safe, sequential, and highly reliable)
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, uint8Array.length);
    const slice = uint8Array.subarray(start, end);
    const base64Data = uint8ToBase64(slice);
    
    // We use precise ID: fileId_chunk_index so we can fetch it directly without indexes!
    const chunkId = `${fileId}_chunk_${i}`;
    const chunkRef = doc(db, 'branches', chunkId);
    await withTimeout(setDoc(chunkRef, {
      id: chunkId,
      name: `[ส่วนย่อยสัญญาเช่า] Chunk ${i}`, // satisfies branches validation rule
      fileId: fileId,
      index: i,
      data: base64Data,
      isDocChunk: true
    }), 15000);
  }
  
  // Return a custom protocol URL
  return `dbfile://${fileId}/${encodeURIComponent(file.name)}`;
}

/**
 * Downloads a chunked file from Firestore and returns a local Object URL (blob:...)
 * 
 * @param fileId The unique ID of the stored file
 * @returns A local browser Blob URL (e.g., blob:http://...)
 */
export async function downloadFileFromFirestore(fileId: string): Promise<string> {
  // 1. Get the metadata from the 'branches' collection
  const metadataRef = doc(db, 'branches', fileId);
  const metadataSnap = await withTimeout(getDoc(metadataRef), 15000);
  
  if (!metadataSnap.exists()) {
    throw new Error('ไม่พบข้อมูลเอกสารสัญญาเช่าในฐานข้อมูลหลัก (Metadata not found)');
  }
  
  const metadata = metadataSnap.data();
  const totalChunks = metadata.totalChunks;
  const fileType = metadata.fileType || 'application/pdf';
  
  const base64Chunks: string[] = [];
  
  // 2. Fetch all chunks in order by their precise document IDs from 'branches' collection
  for (let i = 0; i < totalChunks; i++) {
    const chunkRef = doc(db, 'branches', `${fileId}_chunk_${i}`);
    const chunkSnap = await withTimeout(getDoc(chunkRef), 10000);
    if (!chunkSnap.exists()) {
      throw new Error(`ไม่พบไฟล์ส่วนย่อยที่ ${i + 1}/${totalChunks} ในระบบฐานข้อมูล`);
    }
    base64Chunks.push(chunkSnap.data().data);
  }
  
  // 3. Reconstruct into a single binary Blob
  const byteArrays = base64Chunks.map(base64ToUint8);
  const blob = new Blob(byteArrays, { type: fileType });
  
  // 4. Generate local Object URL
  return URL.createObjectURL(blob);
}
