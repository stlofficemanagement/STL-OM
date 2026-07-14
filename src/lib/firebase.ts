import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Branch, AuditLog, RenewalConsiderationSession } from '../types';
import { initialBranches, initialAuditLogs } from '../initialData';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyB4wZ-xHOHNinUHOrF8ZU_mdlOT8hPcAzQ",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0334181774.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0334181774",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0334181774.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1046077170783",
  appId: env.VITE_FIREBASE_APP_ID || "1:1046077170783:web:54f64ac47a35784f5367ea"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// We determine the Firestore Database ID dynamically:
// 1. If VITE_FIRESTORE_DATABASE_ID is explicitly set in environment variables, we use it.
// 2. If we are using the default AI Studio Project ID ("gen-lang-client-0334181774"), we MUST use the custom database ID
//    regardless of where the app is hosted (AI Studio preview or external sites like Vercel) because the database with
//    all the branches/rules lives under this custom database name.
// 3. If a custom Project ID is provided, we default to the standard "(default)" database.
const activeProjectId = env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0334181774";

const databaseId = env.VITE_FIRESTORE_DATABASE_ID || (
  activeProjectId === "gen-lang-client-0334181774"
    ? "ai-studio-stlleasemanageme-8bd1ac69-01b5-4826-ad17-0e92f42dcabf"
    : "(default)"
);

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, databaseId);

export const storage = getStorage(app);

export async function uploadFileToFirebaseStorage(file: File, filename: string): Promise<string> {
  const uniqueId = Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  const storageRef = ref(storage, `contracts/${uniqueId}_${filename}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

const initialSessions: RenewalConsiderationSession[] = [
  {
    id: 'CONS-2025-Q1',
    name: 'รอบพิจารณาต่อสัญญาประจำไตรมาส 1/2025',
    createdDate: '12 ม.ค. 2025',
    startDateFilter: '2025-01-01',
    endDateFilter: '2025-03-31',
    branches: [
      {
        branchId: 'BKK-001',
        branchName: 'สาขาเซ็นทรัลเวิลด์',
        endDate: '2025-02-15',
        rent: 120000,
        deposit: 360000,
        advanceRent: 120000,
        signTaxInfo: 'ภาษีป้าย 4,500 บาท/ปี',
        landTaxInfo: 'ภาษีที่ดิน 12,000 บาท/ปี',
        sales: 1250000,
        resolution: 'เห็นชอบให้ต่อสัญญา 3 ปี (ค่าเช่าเดิม)',
      },
      {
        branchId: 'BKK-002',
        branchName: 'สาขาสยามพารากอน',
        endDate: '2025-03-10',
        rent: 150000,
        deposit: 450000,
        advanceRent: 150000,
        signTaxInfo: 'ภาษีป้าย 6,200 บาท/ปี',
        landTaxInfo: 'ภาษีที่ดิน 15,000 บาท/ปี',
        sales: 1890000,
        resolution: 'เห็นชอบให้ต่อสัญญา 3 ปี เจรจาขอส่วนลด 5%',
      }
    ]
  },
  {
    id: 'CONS-2025-Q2',
    name: 'รอบพิจารณาต่อสัญญาประจำไตรมาส 2/2025',
    createdDate: '18 เม.ย. 2025',
    startDateFilter: '2025-04-01',
    endDateFilter: '2025-06-30',
    branches: [
      {
        branchId: 'CNX-001',
        branchName: 'สาขาเชียงใหม่ นิมมาน',
        endDate: '2025-05-20',
        rent: 450000,
        deposit: 135000,
        advanceRent: 45000,
        signTaxInfo: 'ภาษีป้าย 2,800 บาท/ปี',
        landTaxInfo: 'ภาษีที่ดิน 5,400 บาท/ปี',
        sales: 740000,
        resolution: 'เห็นชอบให้ต่อสัญญา 3 ปี เพิ่มค่าเช่า 3% ตามเงื่อนไข',
      }
    ]
  }
];

// Helper to seed Firestore if empty
export async function seedFirestoreIfEmpty() {
  // Seeding is disabled for production/actual use.
  console.log('Seeding is disabled for production use.');
}
