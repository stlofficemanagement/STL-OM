import React, { useState, useEffect } from 'react';
import { Branch, AuditLog, NotificationItem } from './types';
import {
  initialBranches,
  initialAuditLogs,
  initialNotifications,
} from './initialData';

import Sidebar from './components/Sidebar';
import TopAppBar from './components/TopAppBar';
import DashboardView from './components/DashboardView';
import BranchesView from './components/BranchesView';
import BranchDetailsView from './components/BranchDetailsView';
import BranchFormView from './components/BranchFormView';
import AuditLogView from './components/AuditLogView';
import LeasesView from './components/LeasesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import RoleWarningModal from './components/RoleWarningModal';
import LoginModal from './components/LoginModal';
import RenewLeaseView from './components/RenewLeaseView';
import RenewalConsiderationReportView from './components/RenewalConsiderationReportView';

import { db, seedFirestoreIfEmpty } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('เชื่อมต่อฐานข้อมูลล่าช้าหรือหมดเวลา (Database Timeout) กรุณาตรวจสอบการตั้งค่าอินเทอร์เน็ตหรือเครือข่ายของท่าน')),
        timeoutMs
      )
    )
  ]);
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore error during ${operationType} on ${path || 'unknown path'}:`, error);
  throw new Error(`การเชื่อมต่อฐานข้อมูลล้มเหลว (${operationType}): ${error instanceof Error ? error.message : String(error)}`);
}

export default function App() {
  // Core application states
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem('stl_branches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('stl_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Role & security authorization states
  const [userRole, setUserRole] = useState<'admin' | 'visitor' | 'super_admin'>(() => {
    return (localStorage.getItem('stl_user_role') as 'admin' | 'visitor' | 'super_admin') || 'visitor';
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('stl_admin_username') || '';
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Verification helper for write actions
  const verifyAction = (actionName: string): boolean => {
    if (userRole === 'visitor') {
      setPendingAction(actionName);
      return false;
    }
    return true;
  };

  // State-updater to persist roles
  const handleRoleChange = (newRole: 'admin' | 'visitor') => {
    if (newRole === 'admin') {
      if (userRole === 'admin' || userRole === 'super_admin') {
        // Already logged in
      } else {
        setIsLoginOpen(true);
      }
    } else {
      setUserRole('visitor');
      localStorage.setItem('stl_user_role', 'visitor');
      localStorage.removeItem('stl_admin_username');
      setAdminUsername('');
    }
  };

  const handleLoginSuccess = async (username: string) => {
    const isSuperAdmin = username === 'Officemanagement';
    const role = isSuperAdmin ? 'super_admin' : 'admin';
    
    setUserRole(role);
    setAdminUsername(username);
    localStorage.setItem('stl_user_role', role);
    localStorage.setItem('stl_admin_username', username);
    
    // Create a login audit log
    const timeNow = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const descriptionText = isSuperAdmin 
      ? `ผู้ดูแลระบบระดับสูง (Super Admin) ${username} เข้าสู่ระบบสำเร็จ เพื่อเปิดสิทธิ์การล้างข้อมูลและเริ่มใช้งานจริง (Production Reset)`
      : `ผู้ดูแลระบบ ${username} เข้าสู่ระบบสำเร็จ เพื่อเปิดสิทธิ์การสร้างและแก้ไขข้อมูล`;

    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      dateTime: timeNow,
      user: username,
      userInitial: username.charAt(0).toUpperCase(),
      action: 'Login',
      target: `User: ${username}`,
      description: descriptionText,
    };

    try {
      await setDoc(doc(db, 'logs', newLog.id), newLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `logs/${newLog.id}`);
    }
  };

  // Navigation states
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [renewBranchId, setRenewBranchId] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Global search query
  const [searchQuery, setSearchQuery] = useState('');

  // Presentation mode state for CEO review
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Initial load and real-time subscription from Firestore
  useEffect(() => {
    const initAndSubscribe = async () => {
      try {
        await seedFirestoreIfEmpty();
      } catch (error) {
        console.error("Error seeding firestore:", error);
      }

      // 1. Subscribe to branches
      const branchesRef = collection(db, 'branches');
      const unsubscribeBranches = onSnapshot(branchesRef, (snapshot) => {
        const branchesList: Branch[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && !data.id.startsWith('dbfile_')) {
            branchesList.push(data as Branch);
          }
        });
        // Sort branches by ID so they are shown in order
        branchesList.sort((a, b) => a.id.localeCompare(b.id));
        setBranches(branchesList);
        localStorage.setItem('stl_branches', JSON.stringify(branchesList));
      }, (error) => {
        console.error("Firestore branches onSnapshot error:", error);
      });

      // 2. Subscribe to logs
      const logsRef = collection(db, 'logs');
      const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
        const logsList: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          logsList.push(docSnap.data() as AuditLog);
        });
        // Sort logs newest first
        logsList.sort((a, b) => {
          const isATimestamp = a.id.startsWith('LOG-') && a.id.length > 7;
          const isBTimestamp = b.id.startsWith('LOG-') && b.id.length > 7;
          if (isATimestamp && !isBTimestamp) return -1;
          if (!isATimestamp && isBTimestamp) return 1;
          return b.id.localeCompare(a.id);
        });
        setLogs(logsList);
        localStorage.setItem('stl_logs', JSON.stringify(logsList));
      }, (error) => {
        console.error("Firestore logs onSnapshot error:", error);
      });

      return () => {
        unsubscribeBranches();
        unsubscribeLogs();
      };
    };

    let cleanupPromise = initAndSubscribe();

    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, []);

  // Utility to persist data and append log entries (retained for backward compatibility of local modifications if needed, but we write direct to Firestore)
  const saveState = async (updatedBranches: Branch[], updatedLogs: AuditLog[]) => {
    // We rely primarily on Firestore write events triggering onSnapshot, but let's keep this as a no-op or sync wrapper
  };

  const addAuditLog = (action: string, target: string, description: string) => {
    const timeNow = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      dateTime: timeNow,
      user: adminUsername || 'Admin System',
      userInitial: (adminUsername || 'A').charAt(0).toUpperCase(),
      action,
      target,
      description,
    };

    return newLog;
  };

  // Navigational handlers
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setSelectedBranchId(null);
    setRenewBranchId(null);
    setIsFormOpen(false);
    setBranchToEdit(undefined);
    setIsPresentationMode(false); // Reset presentation mode on view change
  };

  const handleSelectBranch = (id: string) => {
    setSelectedBranchId(id);
    setRenewBranchId(null);
    setCurrentView('branch-details');
    setIsFormOpen(false);
    setBranchToEdit(undefined);
  };

  const handleAddBranchClick = () => {
    if (!verifyAction('สร้าง/เพิ่มสาขาใหม่')) return;
    setBranchToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEditBranchClick = (id: string) => {
    if (!verifyAction('แก้ไขข้อมูลสาขาหรือสัญญาเช่า')) return;
    const targetBranch = branches.find((b) => b.id === id);
    setBranchToEdit(targetBranch);
    setIsFormOpen(true);
  };

  const handleRenewBranchClick = (id: string | null) => {
    if (!verifyAction('ต่อสัญญาเช่าสาขา')) return;
    setRenewBranchId(id);
    setCurrentView('renew-lease');
    setIsFormOpen(false);
    setBranchToEdit(undefined);
  };

  const handleRenewLease = async (
    branchId: string,
    newContractNumber: string,
    newStartDate: string,
    newEndDate: string,
    newRent: number,
    newDeposit: number,
    newDepositRef: string,
    newAdvanceRent: number,
    newAdvanceRentRef: string,
    newNoticePeriod: number | string,
    fileName: string,
    pdfUrl?: string
  ) => {
    const targetBranch = branches.find((b) => b.id === branchId);
    if (!targetBranch) return;

    // Archive current active lease to history as Inactive/Expired
    let updatedLeases = targetBranch.leases ? [...targetBranch.leases] : [];
    
    // Check if there's any active lease to archive
    const activeLeaseIdx = updatedLeases.findIndex((l) => l.status === 'Active');
    if (activeLeaseIdx >= 0) {
      updatedLeases[activeLeaseIdx] = {
        ...updatedLeases[activeLeaseIdx],
        status: 'Inactive'
      };
    } else {
      // Create backup of current branch's main parameters as an Inactive contract
      updatedLeases.unshift({
        id: targetBranch.contractNumber || 'CONT-OLD',
        startDate: targetBranch.startDate || '',
        endDate: targetBranch.endDate || '',
        rent: targetBranch.rent || 0,
        deposit: targetBranch.deposit || 0,
        depositRef: targetBranch.depositRef || '',
        advanceRent: targetBranch.advanceRent || 0,
        advanceRentRef: targetBranch.advanceRentRef || '',
        noticePeriod: targetBranch.noticePeriod || 90,
        status: 'Inactive'
      });
    }

    // Insert the new active contract at the top
    const newLeaseObj = {
      id: newContractNumber,
      startDate: newStartDate,
      endDate: newEndDate,
      rent: newRent,
      deposit: newDeposit,
      depositRef: newDepositRef,
      advanceRent: newAdvanceRent,
      advanceRentRef: newAdvanceRentRef,
      noticePeriod: newNoticePeriod,
      status: 'Active',
      pdfUrl,
      pdfName: fileName
    };
    updatedLeases.unshift(newLeaseObj);

    // Update documents
    let updatedDocs = targetBranch.documents ? [...targetBranch.documents] : [
      { name: `สัญญาเช่าพื้นที่_${targetBranch.name}_ฉบับจริง.pdf`, size: '4.8 MB', date: targetBranch.startDate || '15 ม.ค. 2023' },
      { name: 'หนังสือค้ำประกันธนาคาร_ประกันสัญญา.pdf', size: '1.2 MB', date: '20 ม.ค. 2023' },
      { name: 'สำเนาโฉนดที่ดิน_แบบแปลนร้านค้า.pdf', size: '8.5 MB', date: '10 ม.ค. 2023' }
    ];
    
    const timeNowDate = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    
    updatedDocs.unshift({
      name: fileName,
      size: '2.4 MB',
      date: timeNowDate
    });

    const leaseHistoryItem = {
      id: `HIST-${Date.now()}`,
      dateTime: new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      user: adminUsername || 'System Admin',
      description: `ต่อสัญญาเช่าสาขา`,
      changes: `• **ต่อสัญญาใหม่**: เลขที่สัญญา "${newContractNumber}"\n• **ระยะเวลา**: จาก ${newStartDate} ถึง ${newEndDate}\n• **ค่าเช่าสัญญาใหม่**: ฿${newRent.toLocaleString()} ต่อเดือน`
    };

    const existingHistory = targetBranch.editHistory || [];

    const updatedBranch: Branch = {
      ...targetBranch,
      contractNumber: newContractNumber,
      startDate: newStartDate,
      endDate: newEndDate,
      rent: newRent,
      deposit: newDeposit,
      depositRef: newDepositRef,
      advanceRent: newAdvanceRent,
      advanceRentRef: newAdvanceRentRef,
      noticePeriod: newNoticePeriod,
      pdfUrl: pdfUrl || targetBranch.pdfUrl,
      pdfFile: fileName || targetBranch.pdfFile,
      leases: updatedLeases,
      documents: updatedDocs,
      editHistory: [leaseHistoryItem, ...existingHistory]
    };

    const newLog = addAuditLog(
      'Renew',
      `Branch: ${targetBranch.name}`,
      `ต่อสัญญาเช่าสาขา ${targetBranch.name} (${targetBranch.id}) ด้วยสัญญาใหม่เลขที่ ${newContractNumber} (เริ่มสัญญา ${newStartDate} ถึง ${newEndDate}) แนบสัญญาใหม่: ${fileName}`
    );

    setIsSaving(true);
    let savedToCloud = false;
    try {
      await withTimeout(setDoc(doc(db, 'branches', branchId), updatedBranch), 5000);
      await withTimeout(setDoc(doc(db, 'logs', newLog.id), newLog), 5000);
      savedToCloud = true;
    } catch (error) {
      console.warn("Firestore error renewing lease, falling back to local update:", error);
    }

    // Always update local React state and localStorage so the UI stays up-to-date instantly!
    const updatedList = branches.map((b) => (b.id === branchId ? updatedBranch : b));
    setBranches(updatedList);
    localStorage.setItem('stl_branches', JSON.stringify(updatedList));

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('stl_logs', JSON.stringify(updatedLogs));

    setIsSaving(false);

    if (savedToCloud) {
      alert('ต่อสัญญาเช่าเรียบร้อยแล้ว');
    } else {
      alert('ต่อสัญญาเช่าสำเร็จในอุปกรณ์เครื่องนี้แล้ว (โหมดออฟไลน์/โลคอล)\n\n*หมายเหตุ: เนื่องจากระบบตรวจพบว่าการเชื่อมต่อฐานข้อมูลคลาวด์ล่าช้าหรือไม่มีสิทธิ์การเข้าถึงภายนอก (Database Timeout)*');
    }

    setRenewBranchId(null);
    setSelectedBranchId(branchId);
    setCurrentView('branch-details');
  };

  const handleDeleteBranch = async (id: string) => {
    if (!verifyAction('ลบสาขาออกจากระบบ')) return;
    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) return;

    const newLog = addAuditLog(
      'Delete',
      `Branch: ${targetBranch.name}`,
      `ลบสาขา ${targetBranch.name} (${targetBranch.id}) ออกจากฐานข้อมูลระบบ`
    );

    setIsSaving(true);
    let deletedFromCloud = false;
    try {
      await withTimeout(deleteDoc(doc(db, 'branches', id)), 5000);
      await withTimeout(setDoc(doc(db, 'logs', newLog.id), newLog), 5000);
      deletedFromCloud = true;
    } catch (error) {
      console.warn("Firestore error deleting branch, falling back to local update:", error);
    }

    // Always update local React state and localStorage so the UI stays up-to-date instantly!
    const updatedList = branches.filter((b) => b.id !== id);
    setBranches(updatedList);
    localStorage.setItem('stl_branches', JSON.stringify(updatedList));

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('stl_logs', JSON.stringify(updatedLogs));

    setIsSaving(false);

    if (deletedFromCloud) {
      alert('ลบสาขาสำเร็จเรียบร้อยแล้ว');
    } else {
      alert('ลบข้อมูลสาขาสำเร็จในอุปกรณ์เครื่องนี้แล้ว (โหมดออฟไลน์/โลคอล)\n\n*หมายเหตุ: เนื่องจากระบบตรวจพบว่าการเชื่อมต่อฐานข้อมูลคลาวด์ล่าช้าหรือไม่มีสิทธิ์การเข้าถึงภายนอก (Database Timeout)*');
    }

    handleViewChange('branches');
  };

  const handleSaveBranch = async (branchData: Branch) => {
    const isEdit = branches.some((b) => b.id === branchData.id);
    let newLog: AuditLog;

    if (isEdit) {
      const oldBranch = branches.find((b) => b.id === branchData.id);
      let changesText = "";
      if (oldBranch) {
        const changesList: string[] = [];
        
        const fieldLabels: { [key: string]: string } = {
          name: "ชื่อสาขา",
          type: "ประเภทสาขา",
          province: "จังหวัด",
          openingDate: "วันที่เปิดสาขา",
          startDate: "วันที่เริ่มสัญญาเช่า",
          endDate: "วันที่สิ้นสุดสัญญาเช่า",
          status: "สถานะสาขา",
          buildingStatus: "สถานะอาคาร",
          rent: "ค่าเช่าต่อเดือน",
          deposit: "เงินประกันสัญญา",
          depositRef: "เลขที่อ้างอิงเงินประกันสัญญาเช่า",
          advanceRent: "ค่าเช่าล่วงหน้า",
          advanceRentRef: "เลขที่อ้างอิงการจ่ายค่าเช่าล่วงหน้า",
          noticePeriod: "ระยะเวลาแจ้งบอกเลิกสัญญาล่วงหน้า",
          address: "ที่อยู่โดยละเอียด",
          manager: "ผู้จัดการสาขา",
          email: "อีเมลติดต่อ",
          phone: "เบอร์โทรศัพท์ติดต่อ",
          operatingHours: "เวลาทำการ",
          area: "Area (หมายเลข)",
          spaceSize: "ขนาดพื้นที่",
          boothCount: "จำนวนคูหา",
          floorCount: "จำนวนชั้น",
          contractNumber: "เลขที่สัญญา",
          networkType: "ประเภทเครือข่าย",
          networkOtherDetail: "รายละเอียดเครือข่ายอื่นๆ",
          networkDetail: "รายละเอียด Network",
          cctvType: "ประเภทกล้อง CCTV",
          cctvCount: "จำนวนกล้อง CCTV",
          cctvDetail: "รายละเอียด CCTV",
          printerType: "ประเภท Printer",
          printerDetail: "รายละเอียด Printer",
          landlordName: "ชื่อเจ้าของพื้นที่เช่า",
          landlordPhone: "เบอร์ติดต่อเจ้าของพื้นที่เช่า",
          signTaxInfo: "ข้อมูลภาษีป้าย",
          landTaxInfo: "ข้อมูลภาษีที่ดิน",
          phoneTabletSelected: "การใช้งานโทรศัพท์/แท็บเล็ต",
          phoneTabletNumber: "เบอร์โทรศัพท์/แท็บเล็ตสาขา",
          phoneTabletPackage: "รายละเอียดแพ็กเกจโทรศัพท์/แท็บเล็ต",
          phoneTabletType: "ประเภทอุปกรณ์ (Phone/Tablet)",
          phoneTabletModel: "รุ่น/ซีเรียลนัมเบอร์ของอุปกรณ์",
        };

        Object.keys(fieldLabels).forEach((key) => {
          const oldVal = oldBranch[key as keyof Branch];
          const newVal = branchData[key as keyof Branch];
          
          if (oldVal !== newVal) {
            // Treat undefined/null/empty string as equivalent if they both mean "no value"
            const isEmptyOld = oldVal === undefined || oldVal === null || oldVal === "";
            const isEmptyNew = newVal === undefined || newVal === null || newVal === "";
            if (isEmptyOld && isEmptyNew) return;

            let oldString = oldVal !== undefined && oldVal !== null ? String(oldVal) : "ไม่มีข้อมูล";
            let newString = newVal !== undefined && newVal !== null ? String(newVal) : "ไม่มีข้อมูล";

            // Beautify boolean
            if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
              oldString = oldVal ? "เปิดใช้งาน" : "ปิดใช้งาน";
              newString = newVal ? "เปิดใช้งาน" : "ปิดใช้งาน";
            }

            // Beautify numbers
            if (['rent', 'deposit', 'advanceRent'].includes(key)) {
              const oldNum = Number(oldVal) || 0;
              const newNum = Number(newVal) || 0;
              if (oldNum !== newNum) {
                oldString = `฿${oldNum.toLocaleString()}`;
                newString = `฿${newNum.toLocaleString()}`;
              } else {
                return;
              }
            }

            changesList.push(`• **${fieldLabels[key]}**: เปลี่ยนจาก "${oldString}" เป็น "${newString}"`);
          }
        });

        changesText = changesList.length > 0 ? changesList.join("\n") : "ไม่มีการเปลี่ยนแปลงรายละเอียดของเขตข้อมูลหลัก";
      }

      const timeNow = new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const historyItem = {
        id: `HIST-${Date.now()}`,
        dateTime: timeNow,
        user: adminUsername || 'System Admin',
        description: `แก้ไขข้อมูลรายละเอียดสาขา`,
        changes: changesText
      };

      const existingHistory = oldBranch?.editHistory || [];
      branchData.editHistory = [historyItem, ...existingHistory];

      newLog = addAuditLog(
        'Edit',
        `Branch: ${branchData.name}`,
        `แก้ไข/อัปเดตรายละเอียดและพารามิเตอร์สัญญาเช่าสาขา ${branchData.name} (${branchData.id})`
      );
    } else {
      newLog = addAuditLog(
        'Create',
        `Branch: ${branchData.name}`,
        `เพิ่มสาขาพาร์ทเนอร์ใหม่ ${branchData.name} (${branchData.id}) พร้อมอัปโหลดแบบแปลน`
      );
    }

    setIsSaving(true);
    let savedToCloud = false;
    try {
      await withTimeout(setDoc(doc(db, 'branches', branchData.id), branchData), 5000);
      await withTimeout(setDoc(doc(db, 'logs', newLog.id), newLog), 5000);
      savedToCloud = true;
    } catch (error) {
      console.warn("Firestore error saving branch, falling back to local update:", error);
    }

    // Always update local React state and localStorage so the UI stays up-to-date instantly!
    const isEditing = branches.some((b) => b.id === branchData.id);
    let updatedList: Branch[];
    if (isEditing) {
      updatedList = branches.map((b) => (b.id === branchData.id ? branchData : b));
    } else {
      updatedList = [...branches, branchData].sort((a, b) => a.id.localeCompare(b.id));
    }
    setBranches(updatedList);
    localStorage.setItem('stl_branches', JSON.stringify(updatedList));

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('stl_logs', JSON.stringify(updatedLogs));

    setIsSaving(false);
    setIsFormOpen(false);
    setBranchToEdit(undefined);

    if (savedToCloud) {
      alert('บันทึกข้อมูลสาขาและสัญญาเช่าเรียบร้อยแล้ว');
    } else {
      alert('บันทึกข้อมูลสาขาและสัญญาเช่าสำเร็จในอุปกรณ์เครื่องนี้แล้ว (โหมดออฟไลน์/โลคอล)\n\n*หมายเหตุ: เนื่องจากระบบตรวจพบว่าการเชื่อมต่อฐานข้อมูลคลาวด์ล่าช้าหรือไม่มีสิทธิ์การเข้าถึงภายนอก (Database Timeout)*');
    }

    handleSelectBranch(branchData.id); // View details of saved branch immediately!
  };

  const handleClearAllData = async () => {
    if (!verifyAction('ล้างข้อมูลระบบทั้งหมดเป็น 0')) return;

    const confirmClear = window.confirm(
      'คำเตือน! คุณกำลังจะลบข้อมูลสาขา สัญญาเช่าทั้งหมด และประวัติประมวลผลเป็น 0 เพื่อเริ่มใช้งานจริง การดำเนินการนี้ไม่สามารถย้อนกลับได้ คุณต้องการดำเนินการต่อหรือไม่?'
    );
    if (!confirmClear) return;

    const resetLog = addAuditLog(
      'DeleteAll',
      'ระบบทั้งหมด',
      `ผู้ดูแลระบบล้างข้อมูลเพื่อเริ่มใช้งานจริง (Reset All Data to 0)`
    );

    try {
      const branchesSnap = await getDocs(collection(db, 'branches'));
      const branchBatch = writeBatch(db);
      branchesSnap.forEach((docSnap) => {
        branchBatch.delete(docSnap.ref);
      });
      await branchBatch.commit();

      const logsSnap = await getDocs(collection(db, 'logs'));
      const logBatch = writeBatch(db);
      logsSnap.forEach((docSnap) => {
        logBatch.delete(docSnap.ref);
      });
      await logBatch.commit();

      await setDoc(doc(db, 'logs', resetLog.id), resetLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all_collections');
    }
    
    // Redirect to Dashboard
    handleViewChange('dashboard');
    alert('ระบบได้ถูกเคลียร์ข้อมูลทั้งหมดเรียบร้อยแล้ว! พร้อมสำหรับการบันทึกและตั้งค่าใช้งานจริง');
  };

  const handleImportBranches = async (imported: Branch[], replace: boolean) => {
    const newLog = addAuditLog(
      'Import',
      `สาขาในระบบ`,
      `นำเข้าข้อมูลสาขาสำเร็จจำนวน ${imported.length} สาขา จากการอัปโหลดไฟล์ Excel`
    );

    try {
      if (replace) {
        const branchesSnap = await getDocs(collection(db, 'branches'));
        const deleteBatch = writeBatch(db);
        branchesSnap.forEach((docSnap) => {
          deleteBatch.delete(docSnap.ref);
        });
        await deleteBatch.commit();
      }

      const saveBatch = writeBatch(db);
      imported.forEach((branch) => {
        const docRef = doc(db, 'branches', branch.id);
        saveBatch.set(docRef, branch);
      });
      await saveBatch.commit();

      await setDoc(doc(db, 'logs', newLog.id), newLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'import_branches');
    }
  };

  const handleClearAllDataSimple = async () => {
    const resetLog = addAuditLog(
      'DeleteAll',
      'ระบบทั้งหมด',
      `ผู้ใช้งานสั่งล้างข้อมูล Demo ทั้งหมดเพื่อเตรียมความพร้อมระบบ (Production Reset)`
    );

    try {
      const branchesSnap = await getDocs(collection(db, 'branches'));
      const branchBatch = writeBatch(db);
      branchesSnap.forEach((docSnap) => {
        branchBatch.delete(docSnap.ref);
      });
      await branchBatch.commit();

      const logsSnap = await getDocs(collection(db, 'logs'));
      const logBatch = writeBatch(db);
      logsSnap.forEach((docSnap) => {
        logBatch.delete(docSnap.ref);
      });
      await logBatch.commit();

      await setDoc(doc(db, 'logs', resetLog.id), resetLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all_collections');
    }
  };

  // Dynamic generation of notifications based on current branches and logs
  const dynamicNotifications = React.useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Generate near-expiry alerts based on endDate and noticePeriod
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    branches.forEach((b) => {
      if (!b.endDate || b.status === 'Inactive' || b.status === 'หมดอายุ') return;

      const bEndDate = new Date(b.endDate);
      bEndDate.setHours(0, 0, 0, 0);

      const diffTime = bEndDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const parsedNoticeDays = parseInt(String(b.noticePeriod).replace(/[^0-9]/g, ''), 10);
      const noticeDays = isNaN(parsedNoticeDays) ? 90 : parsedNoticeDays;

      if (diffDays <= 0) {
        list.push({
          id: `NOT-EXP-${b.id}-${b.endDate}`,
          type: 'error',
          title: `🚨 สัญญาเช่าหมดอายุแล้ว: ${b.name}`,
          description: `หมดอายุเมื่อวันที่ ${b.endDate} กรุณาดำเนินการต่อสัญญา`
        });
      } else if (diffDays <= noticeDays) {
        list.push({
          id: `NOT-WARN-${b.id}-${b.endDate}`,
          type: 'warning',
          title: `⚠️ ใกล้หมดสัญญา: ${b.name}`,
          description: `เหลืออีก ${diffDays} วัน (หมดอายุ ${b.endDate}) - ต้องแจ้งบอกเลิก/ต่อสัญญาล่วงหน้า ${noticeDays} วัน`
        });
      } else if (diffDays <= noticeDays + 30) {
        list.push({
          id: `NOT-INFO-${b.id}-${b.endDate}`,
          type: 'success',
          title: `📋 เตรียมพิจารณาสัญญา: ${b.name}`,
          description: `จะเข้าสู่ช่วงแจ้งล่วงหน้า ${noticeDays} วัน ในอีก ${diffDays - noticeDays} วัน`
        });
      }
    });

    // 2. Generate update/edit notifications from recent audit logs
    logs.slice(0, 8).forEach((log) => {
      let type: 'warning' | 'success' | 'error' = 'success';
      let emoji = '📝';
      
      if (log.action === 'Delete' || log.action === 'DeleteAll') {
        type = 'error';
        emoji = '🗑️';
      } else if (log.action === 'Create') {
        type = 'success';
        emoji = '➕';
      } else if (log.action === 'Login') {
        type = 'success';
        emoji = '🔑';
      } else {
        type = 'success';
        emoji = '✏️';
      }

      list.push({
        id: `NOT-LOG-${log.id}`,
        type,
        title: `${emoji} ${log.action === 'Edit' ? 'อัปเดตข้อมูล' : log.action === 'Create' ? 'เพิ่มข้อมูลใหม่' : log.action === 'Delete' ? 'ลบข้อมูล' : log.action}: ${log.target.replace('Branch: ', '')}`,
        description: `${log.description} (${log.dateTime})`
      });
    });

    // If list is empty, add a default welcoming notification
    if (list.length === 0) {
      list.push({
        id: 'NOT-DEFAULT',
        type: 'success',
        title: '🎉 ยินดีต้อนรับสู่ระบบ STL Lease',
        description: 'ระบบพร้อมใช้งาน ข้อมูลสัญญาเช่าทุกสาขาเรียบร้อยและปลอดภัย'
      });
    }

    return list;
  }, [branches, logs]);

  // Layout dispatcher based on current states
  const renderMainContent = () => {
    if (isFormOpen) {
      return (
        <BranchFormView
          branchToEdit={branchToEdit}
          onSave={handleSaveBranch}
          onCancel={() => {
            setIsFormOpen(false);
            setBranchToEdit(undefined);
          }}
          branches={branches}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            branches={branches}
            notifications={dynamicNotifications}
            onSelectBranch={handleSelectBranch}
            onNavigateToView={handleViewChange}
          />
        );
      case 'branches':
        return (
          <BranchesView
            branches={branches}
            onSelectBranch={handleSelectBranch}
            onAddBranch={handleAddBranchClick}
            onEditBranch={handleEditBranchClick}
            onDeleteBranch={handleDeleteBranch}
            onImportBranches={handleImportBranches}
            onClearAllData={handleClearAllDataSimple}
            userRole={userRole}
          />
        );
      case 'branch-details':
        const selectedBranch = branches.find((b) => b.id === selectedBranchId);
        if (selectedBranch) {
          return (
            <BranchDetailsView
              branch={selectedBranch}
              onBack={() => handleViewChange('branches')}
              onEdit={handleEditBranchClick}
              onAddLease={handleRenewBranchClick}
              userRole={userRole}
              onVerifyAction={verifyAction}
              onUpdateBranch={(updatedBranch, newLog) => {
                const updatedList = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
                setBranches(updatedList);
                localStorage.setItem('stl_branches', JSON.stringify(updatedList));
                if (newLog) {
                  const updatedLogs = [newLog, ...logs];
                  setLogs(updatedLogs);
                  localStorage.setItem('stl_logs', JSON.stringify(updatedLogs));
                }
              }}
            />
          );
        }
        return (
          <BranchesView
            branches={branches}
            onSelectBranch={handleSelectBranch}
            onAddBranch={handleAddBranchClick}
            onEditBranch={handleEditBranchClick}
            onDeleteBranch={handleDeleteBranch}
            onImportBranches={handleImportBranches}
            onClearAllData={handleClearAllDataSimple}
            userRole={userRole}
          />
        );
      case 'leases':
        return <LeasesView branches={branches} onSelectBranch={handleSelectBranch} userRole={userRole} />;
      case 'renew-lease':
        return (
          <RenewLeaseView
            branches={branches}
            preSelectedBranchId={renewBranchId}
            onRenew={handleRenewLease}
            onCancel={() => handleViewChange('branches')}
          />
        );
      case 'renewal-consideration':
        return (
          <RenewalConsiderationReportView
            branches={branches}
            userRole={userRole}
            isPresentationMode={isPresentationMode}
            onTogglePresentationMode={setIsPresentationMode}
            onAddAuditLog={async (action, target, description) => {
              const newLog = addAuditLog(action, target, description);
              try {
                await setDoc(doc(db, 'logs', newLog.id), newLog);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, `logs/${newLog.id}`);
              }
            }}
          />
        );
      case 'reports':
        return <ReportsView branches={branches} userRole={userRole} />;
      case 'admin':
        return <AuditLogView logs={logs} />;
      case 'settings':
        return <SettingsView userRole={userRole} onVerifyAction={verifyAction} onClearAllData={handleClearAllData} />;
      default:
        return (
          <DashboardView
            branches={branches}
            notifications={dynamicNotifications}
            onSelectBranch={handleSelectBranch}
            onNavigateToView={handleViewChange}
          />
        );
    }
  };

  return (
    <div className="bg-[#f6faff] text-on-surface font-sans min-h-screen flex h-full">
      {/* Side Navigation panel (Fixed Left) */}
      {!isPresentationMode && (
        <Sidebar
          currentView={isFormOpen ? 'branches' : currentView}
          onViewChange={handleViewChange}
          onCreateLease={handleAddBranchClick}
          userRole={userRole}
        />
      )}

      {/* Main Container context (Offset left by width of sidebar: 16rem/64px) */}
      <div className={`flex-1 ${isPresentationMode ? 'ml-0' : 'ml-64'} flex flex-col min-h-screen relative bg-[#f6faff]`}>
        {/* Header App Bar */}
        {!isPresentationMode && (
          <TopAppBar
            currentView={currentView}
            onViewChange={handleViewChange}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            userRole={userRole}
            onRoleChange={handleRoleChange}
            adminUsername={adminUsername}
          />
        )}

        {/* Scrollable primary content canvas */}
        <main className={`flex-1 ${isPresentationMode ? 'mt-4 px-12 py-6' : 'mt-16 p-8'} bg-[#f6faff] ${currentView === 'renewal-consideration' ? 'max-w-none' : 'max-w-[1440px]'} mx-auto w-full`}>
          {renderMainContent()}
        </main>
      </div>

      {/* Role Warning Modal overlay */}
      <RoleWarningModal
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        actionName={pendingAction || ''}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Global Saving Spinner Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-white/25 border-t-white rounded-full animate-spin"></div>
          <p className="text-white font-sans text-sm font-bold animate-pulse">กำลังบันทึกข้อมูลและซิงค์ฐานข้อมูล...</p>
          <p className="text-white/70 font-sans text-xs">กรุณาอย่าปิดหน้านี้ ระบบกำลังทำรายการอย่างปลอดภัย</p>
        </div>
      )}
    </div>
  );
}

