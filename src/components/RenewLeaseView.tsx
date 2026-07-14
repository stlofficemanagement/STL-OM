import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Branch } from '../types';
import { generateNextContractNumber } from './BranchFormView';
import { initAuth, googleSignIn, uploadFileToDrive } from '../lib/drive';

interface RenewLeaseViewProps {
  branches: Branch[];
  preSelectedBranchId: string | null;
  onRenew: (
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
  ) => void;
  onCancel: () => void;
}

export default function RenewLeaseView({
  branches,
  preSelectedBranchId,
  onRenew,
  onCancel,
}: RenewLeaseViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Form states for renewal
  const [newContractNumber, setNewContractNumber] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [newRent, setNewRent] = useState<number>(0);
  const [newDeposit, setNewDeposit] = useState<number>(0);
  const [newDepositRef, setNewDepositRef] = useState<string>('');
  const [newAdvanceRent, setNewAdvanceRent] = useState<number>(0);
  const [newAdvanceRentRef, setNewAdvanceRentRef] = useState<string>('');
  const [newNoticePeriod, setNewNoticePeriod] = useState<string | number>(90);

  // Attachment states
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [simulatedFileName, setSimulatedFileName] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Google Drive integration states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err) {
      console.error(err);
      alert('เข้าสู่ระบบ Google Drive ล้มเหลว');
    }
  };

  // Find the currently selected branch
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  // Pre-load branch if navigated with preSelectedBranchId
  useEffect(() => {
    if (preSelectedBranchId) {
      setSelectedBranchId(preSelectedBranchId);
      const b = branches.find((x) => x.id === preSelectedBranchId);
      if (b) {
        setSearchQuery(`${b.name} (${b.id})`);
      }
    }
  }, [preSelectedBranchId, branches]);

  // When selectedBranch changes, prefill all data
  useEffect(() => {
    if (selectedBranch) {
      // Suggest next contract number from the system sequence
      const suggestedContract = generateNextContractNumber(branches);

      setNewContractNumber(suggestedContract);

      // Suggest start date (day after old end date, or today if old end date is missing)
      if (selectedBranch.endDate) {
        try {
          const oldEnd = new Date(selectedBranch.endDate);
          oldEnd.setDate(oldEnd.getDate() + 1);
          setNewStartDate(oldEnd.toISOString().split('T')[0]);

          // Suggest end date (3 years after start date)
          const newEnd = new Date(oldEnd);
          newEnd.setFullYear(newEnd.getFullYear() + 3);
          newEnd.setDate(newEnd.getDate() - 1);
          setNewEndDate(newEnd.toISOString().split('T')[0]);
        } catch (e) {
          setNewStartDate(new Date().toISOString().split('T')[0]);
          setNewEndDate(new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        }
      } else {
        setNewStartDate(new Date().toISOString().split('T')[0]);
        setNewEndDate(new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }

      setNewRent(selectedBranch.rent || 0);
      setNewDeposit(selectedBranch.deposit || 0);
      setNewDepositRef(selectedBranch.depositRef || '');
      setNewAdvanceRent(selectedBranch.advanceRent || 0);
      setNewAdvanceRentRef(selectedBranch.advanceRentRef || '');
      setNewNoticePeriod(selectedBranch.noticePeriod || 90);
      setSimulatedFileName('');
      setAttachedFile(null);
      setPdfUrl('');
    }
  }, [selectedBranch]);

  // Filter branches for search autocomplete
  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBranchSelect = (b: Branch) => {
    setSelectedBranchId(b.id);
    setSearchQuery(`${b.name} (${b.id})`);
    setShowDropdown(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      setAttachedFile(file);
      setSimulatedFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = () => {
        setPdfUrl(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      setAttachedFile(file);
      setSimulatedFileName(file.name);

      const reader = new FileReader();
      reader.onload = () => {
        setPdfUrl(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranchId) {
      alert('กรุณาเลือกรหัสสาขาที่ต้องการต่อสัญญาเช่า');
      return;
    }

    if (!newContractNumber.trim()) {
      alert('กรุณากรอกเลขที่สัญญาเช่าใหม่');
      return;
    }

    if (!newStartDate || !newEndDate) {
      alert('กรุณาระบุวันเริ่มสัญญาและสิ้นสุดสัญญาใหม่');
      return;
    }

    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    if (end <= start) {
      alert('วันสิ้นสุดสัญญาใหม่ ต้องเป็นวันที่หลังจากวันเริ่มสัญญาใหม่');
      return;
    }

    let finalPdfUrl = pdfUrl;
    let finalFileName = simulatedFileName || `สัญญาเช่าพื้นที่_${selectedBranch?.name || ''}_ต่ออายุ_${newContractNumber}.pdf`;

    // Google Drive Upload Logic
    if (attachedFile) {
      let useDrive = false;
      if (!googleToken) {
        const confirmLogin = window.confirm(
          'พบไฟล์เอกสารแนบ เพื่อจัดเก็บไฟล์สัญญาระยะยาวไปยัง Google Drive อย่างปลอดภัยตามนโยบาย กรุณาลงชื่อเข้าใช้งานบัญชี Google ของคุณ\n\nต้องการลงชื่อเข้าใช้งานด้วย Google ทันทีหรือไม่?\n(หากไม่สะดวกหรือเข้าสู่ระบบไม่สำเร็จ ท่านยังคงสามารถเลือกบันทึกสัญญาแบบออฟไลน์/ฐานข้อมูลโดยตรงได้)'
        );
        if (confirmLogin) {
          try {
            const res = await googleSignIn();
            if (res && res.accessToken) {
              useDrive = true;
            } else {
              const proceedOffline = window.confirm(
                'การลงชื่อเข้าใช้งาน Google ล้มเหลวหรือถูกยกเลิก\n\nต้องการเปลี่ยนมาบันทึกไฟล์สัญญานี้เก็บในฐานข้อมูลโดยตรงแทนหรือไม่? (แนะนำเป็นไฟล์ขนาดเล็กไม่เกิน 1MB)'
              );
              if (!proceedOffline) {
                return;
              }
            }
          } catch (err) {
            const proceedOffline = window.confirm(
              'การลงชื่อเข้าใช้งาน Google ล้มเหลวหรือขัดข้อง\n\nต้องการเปลี่ยนมาบันทึกไฟล์สัญญานี้เก็บในฐานข้อมูลโดยตรงแทนหรือไม่? (แนะนำเป็นไฟล์ขนาดเล็กไม่เกิน 1MB)'
            );
            if (!proceedOffline) {
              return;
            }
          }
        } else {
          const proceedOffline = window.confirm(
            'ท่านไม่ได้ลงชื่อเข้าใช้งานด้วย Google\n\nต้องการบันทึกไฟล์สัญญานี้เก็บในระบบฐานข้อมูลโดยตรงแทนหรือไม่? (แนะนำเป็นไฟล์ PDF ขนาดเล็กไม่เกิน 1MB)'
          );
          if (!proceedOffline) {
            return;
          }
        }
      } else {
        useDrive = true;
      }

      if (useDrive) {
        setIsUploading(true);
        try {
          const uploadName = simulatedFileName || `สัญญาเช่าพื้นที่_${selectedBranch?.name || ''}_ต่ออายุ_${newContractNumber}.pdf`;
          const result = await uploadFileToDrive(attachedFile, uploadName);
          finalPdfUrl = result.webViewLink;
          finalFileName = uploadName;
        } catch (uploadError: any) {
          console.error('Failed to upload file to Google Drive:', uploadError);
          const proceedOffline = window.confirm(
            `เกิดข้อผิดพลาดในการอัปโหลดไฟล์ไปยัง Google Drive: ${uploadError.message || uploadError}\n\nต้องการบันทึกไฟล์สัญญานี้ในฐานข้อมูลของระบบโดยตรงแทนหรือไม่?`
          );
          if (!proceedOffline) {
            setIsUploading(false);
            return;
          }
        }
        setIsUploading(false);
      }
    }

    onRenew(
      selectedBranchId,
      newContractNumber.trim(),
      newStartDate,
      newEndDate,
      Number(newRent),
      Number(newDeposit),
      newDepositRef.trim(),
      Number(newAdvanceRent),
      newAdvanceRentRef.trim(),
      newNoticePeriod,
      finalFileName,
      finalPdfUrl || undefined
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="renew-lease-view-container">
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-white/25 border-t-white rounded-full animate-spin"></div>
          <p className="text-white font-sans text-sm font-bold animate-pulse">กำลังอัปโหลดไฟล์สัญญาต่ออายุเช่าจริงไปยัง Google Drive...</p>
          <p className="text-white/70 font-sans text-xs">ระบบกำลังบันทึกเอกสารต้นฉบับและกำหนดสิทธิ์เข้าถึงสาธารณะ กรุณาอย่าปิดหน้านี้</p>
        </div>
      )}
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">ต่ออายุสัญญาเช่า</h2>
          <p className="text-sm font-sans text-secondary mt-1">
            ต่ออายุและบันทึกสัญญาฉบับใหม่สำหรับสาขาที่มีอยู่ พร้อมจัดเก็บสัญญาเดิมเข้าสู่ประวัติสัญญาอัตโนมัติ
          </p>
        </div>
        <button
          onClick={onCancel}
          className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          ย้อนกลับ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Selection and display of current branch details (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">filter_alt</span>
              ขั้นตอนที่ 1: เลือกรหัสสาขา
            </h3>

            {/* Search Dropdown Selector */}
            <div className="relative">
              <label className="text-[11px] font-bold text-secondary uppercase block mb-1">ค้นหาและเลือกรหัสสาขา</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อสาขา หรือ รหัสสาขา..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) {
                      setSelectedBranchId('');
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-10 py-2.5 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedBranchId('');
                      setShowDropdown(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer flex items-center"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {showDropdown && searchQuery && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-outline-variant rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  {filteredBranches.length > 0 ? (
                    filteredBranches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleBranchSelect(b)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-container border-b border-outline-variant/30 flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-on-surface">{b.name}</span>
                          <span className="text-[10px] text-secondary ml-2 font-mono">({b.id})</span>
                        </div>
                        <span className="text-[10px] bg-primary-container text-white px-2 py-0.5 rounded font-bold uppercase">
                          {b.buildingStatus || 'สัญญาเช่า'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-secondary font-semibold">
                      ไม่พบสาขาตรงกับคำค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedBranch ? (
            <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm animate-fade-in flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-outline-variant/50 pb-3">
                <div>
                  <span className="text-[10px] bg-primary-container text-white px-2 py-0.5 rounded font-bold uppercase block w-max mb-1.5">
                    {selectedBranch.buildingStatus || 'สัญญาเช่า'}
                  </span>
                  <h4 className="text-base font-bold text-on-surface leading-tight">{selectedBranch.name}</h4>
                  <p className="text-[11px] text-secondary mt-0.5 font-mono">รหัสสาขา: {selectedBranch.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-secondary uppercase">สถานะปัจจุบัน</p>
                  <p className="text-xs font-bold text-[#2b8a3e]">{selectedBranch.status}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider text-secondary -mb-1">ข้อมูลสัญญาเช่าปัจจุบัน</h4>

              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div className="bg-surface p-3 rounded border border-outline-variant/40">
                  <p className="text-[10px] font-bold text-secondary uppercase">เลขที่สัญญาปัจจุบัน</p>
                  <p className="font-bold text-primary truncate mt-0.5">{selectedBranch.contractNumber || 'ไม่ระบุ'}</p>
                </div>
                <div className="bg-surface p-3 rounded border border-outline-variant/40">
                  <p className="text-[10px] font-bold text-secondary uppercase">ค่าเช่ารายเดือนเดิม</p>
                  <p className="font-bold text-on-surface mt-0.5">฿{(selectedBranch.rent || 0).toLocaleString()}</p>
                </div>
                <div className="bg-surface p-3 rounded border border-outline-variant/40">
                  <p className="text-[10px] font-bold text-secondary uppercase">วันเริ่มสัญญาเดิม</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedBranch.startDate || 'ไม่ระบุ'}</p>
                </div>
                <div className="bg-surface p-3 rounded border border-outline-variant/40">
                  <p className="text-[10px] font-bold text-secondary uppercase">วันสิ้นสุดสัญญาเดิม</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedBranch.endDate || 'ไม่ระบุ'}</p>
                </div>
                <div className="bg-surface p-3 rounded border border-outline-variant/40 col-span-2">
                  <p className="text-[10px] font-bold text-secondary uppercase">ผู้ติดต่อ / ผู้จัดการสาขา</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedBranch.manager} ({selectedBranch.phone})</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-outline rounded-lg p-8 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">info</span>
              <p className="text-sm font-semibold">กรุณาเลือกรหัสสาขาก่อนเพื่อดูข้อมูลสัญญาปัจจุบัน</p>
            </div>
          )}
        </div>

        {/* Right column: Renewal Form (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-sm font-bold text-on-surface border-b border-outline-variant pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
              ขั้นตอนที่ 2: กรอกข้อมูลและวันที่สำหรับสัญญาเช่าฉบับใหม่
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Contract Number */}
              <div className="col-span-1 md:col-span-2">
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  เลขที่สัญญาใหม่ <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!selectedBranchId}
                  value={newContractNumber}
                  onChange={(e) => setNewContractNumber(e.target.value)}
                  placeholder="เช่น CONT-BKK-001-2026"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  วันเริ่มสัญญาใหม่ <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={!selectedBranchId}
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  วันสิ้นสุดสัญญาใหม่ <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={!selectedBranchId}
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* New Rent */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  ค่าเช่าใหม่ (บาท/เดือน)
                </label>
                <input
                  type="number"
                  disabled={!selectedBranchId}
                  value={newRent || ''}
                  onChange={(e) => setNewRent(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-bold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Notice Period */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  ระยะเวลาแจ้งบอกเลิกสัญญาล่วงหน้า
                </label>
                <input
                  type="text"
                  disabled={!selectedBranchId}
                  value={newNoticePeriod || ''}
                  onChange={(e) => setNewNoticePeriod(e.target.value)}
                  placeholder="เช่น 90 วัน หรือ 3 เดือน"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Deposit */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  เงินประกันสัญญาเช่าใหม่ (บาท)
                </label>
                <input
                  type="number"
                  disabled={!selectedBranchId}
                  value={newDeposit || ''}
                  onChange={(e) => setNewDeposit(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Deposit Ref */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  รหัสอ้างอิงเงินประกัน (Deposit Ref)
                </label>
                <input
                  type="text"
                  disabled={!selectedBranchId}
                  value={newDepositRef}
                  onChange={(e) => setNewDepositRef(e.target.value)}
                  placeholder="เช่น GL-DEP-001"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Advance Rent */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  ค่าเช่าล่วงหน้าใหม่ (บาท)
                </label>
                <input
                  type="number"
                  disabled={!selectedBranchId}
                  value={newAdvanceRent || ''}
                  onChange={(e) => setNewAdvanceRent(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Advance Rent Ref */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                  รหัสอ้างอิงค่าเช่าล่วงหน้า (Advance Ref)
                </label>
                <input
                  type="text"
                  disabled={!selectedBranchId}
                  value={newAdvanceRentRef}
                  onChange={(e) => setNewAdvanceRentRef(e.target.value)}
                  placeholder="เช่น GL-ADV-001"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Drag & Drop File Upload Zone for new Lease Contract with Google Drive Integration */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-bold text-secondary uppercase block">
                แนบเอกสารสัญญาใหม่ <span className="text-secondary font-normal">(รองรับไฟล์ PDF ขนาดจริง จัดเก็บคลาวด์)</span>
              </label>

              {/* Google Drive Connection Info */}
              {selectedBranchId && (
                <div className="p-3 bg-surface rounded-lg border border-outline-variant/60 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.43 12.98L14.7 4.76C14.41 4.25 13.86 3.94 13.27 3.94H10.73C10.14 3.94 9.59 4.25 9.3 4.76L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L6.93 18.72C7.22 19.23 7.77 19.54 8.36 19.54H15.64C16.23 19.54 16.78 19.23 17.07 18.72L19.43 14.62C19.72 14.11 19.72 13.49 19.43 12.98Z" fill="#1A73E8"/>
                        <path d="M13.27 3.94H10.73C10.14 3.94 9.59 4.25 9.3 4.76L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L5.87 12.37L10.05 5.12C10.34 4.61 10.89 4.3 11.48 4.3H13.27C13.86 4.3 14.41 4.61 14.7 5.12L15.64 6.75L13.27 3.94Z" fill="#0F9D58"/>
                        <path d="M19.43 12.98L17.07 8.9L14.7 12.98C14.41 13.49 13.86 13.8 13.27 13.8H8.36C7.77 13.8 7.22 13.49 6.93 12.98L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L6.93 18.72C7.22 19.23 7.77 19.54 8.36 19.54H15.64C16.23 19.54 16.78 19.23 17.07 18.72L19.43 14.62C19.72 14.11 19.72 13.49 19.43 12.98Z" fill="#FFC107"/>
                      </svg>
                      <div>
                        <p className="text-[11px] font-bold text-on-surface leading-tight">ระบบคลาวด์จัดเก็บไฟล์ Google Drive</p>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {googleUser ? `เชื่อมต่อสำเร็จ: ${googleUser.email}` : 'จัดเก็บไฟล์ต้นฉบับขนาดจริง (Public) ตรงไปยัง Google Drive'}
                        </p>
                      </div>
                    </div>
                    {googleUser ? (
                      <span className="flex items-center gap-1 text-[10px] bg-[#2b8a3e]/10 text-[#2b8a3e] px-2 py-0.5 rounded-full font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2b8a3e] animate-pulse"></span>
                        เชื่อมต่อแล้ว
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        ยังไม่ได้เชื่อมต่อ
                      </span>
                    )}
                  </div>

                  {!googleUser ? (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full mt-1 py-1.5 px-3 bg-white hover:bg-surface border border-outline rounded font-semibold text-[11px] text-on-surface flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="scale(0.5)"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" transform="scale(0.5)"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" transform="scale(0.5)"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" transform="scale(0.5)"></path>
                      </svg>
                      เชื่อมต่อกับ Google Drive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full mt-1 py-1 px-2 bg-white hover:bg-surface border border-outline rounded font-semibold text-[10px] text-secondary text-center cursor-pointer transition-colors"
                    >
                      สลับบัญชี Google Drive
                    </button>
                  )}
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (selectedBranchId) {
                    document.getElementById('renew-file-input')?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-lg p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                  !selectedBranchId
                    ? 'bg-gray-50 border-outline-variant cursor-not-allowed opacity-50'
                    : isDragging
                    ? 'border-primary bg-primary-container/10'
                    : 'border-outline hover:border-primary hover:bg-surface-container-low'
                }`}
              >
                <input
                  id="renew-file-input"
                  type="file"
                  accept=".pdf"
                  disabled={!selectedBranchId}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-3xl text-secondary mb-2">
                  upload_file
                </span>
                {simulatedFileName ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs font-bold text-primary truncate max-w-xs">{simulatedFileName}</p>
                    <p className="text-[10px] text-secondary">
                      {attachedFile ? `${(attachedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'พร้อมอัปโหลดคลาวด์'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-on-surface">ลากไฟล์ PDF สัญญาเช่าใหม่มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                    <p className="text-[10px] text-secondary mt-1">ไฟล์แนบจะถูกอัปโหลดขึ้น Google Drive เป็นไฟล์สาธารณะ (Public) อัตโนมัติ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 border-t border-outline-variant pt-4 mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-bold rounded transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!selectedBranchId}
                className="px-5 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                บันทึกการต่อสัญญาเช่า
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
