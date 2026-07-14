import React, { useState, useEffect } from 'react';
import { Branch, RenewalConsiderationSession } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface RenewalConsiderationReportViewProps {
  branches: Branch[];
  onAddAuditLog?: (action: string, target: string, description: string) => void;
  userRole?: 'admin' | 'visitor' | 'super_admin';
  isPresentationMode?: boolean;
  onTogglePresentationMode?: (val: boolean) => void;
}

export default function RenewalConsiderationReportView({
  branches,
  onAddAuditLog,
  userRole,
  isPresentationMode = false,
  onTogglePresentationMode,
}: RenewalConsiderationReportViewProps) {
  // Zoom level state for presentation mode (normal, large, xlarge)
  const [presentationZoom, setPresentationZoom] = useState<'normal' | 'large' | 'xlarge'>('large');

  // Saved sessions state
  const [sessions, setSessions] = useState<RenewalConsiderationSession[]>([]);
  const [activeSession, setActiveSession] = useState<RenewalConsiderationSession | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form state for creating a new session
  const [sessionName, setSessionName] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [selectedBranchesInCreation, setSelectedBranchesInCreation] = useState<{
    [branchId: string]: boolean;
  }>({});

  // Dynamic values inputted by user inside creation screen
  const [dynamicSales, setDynamicSales] = useState<{ [branchId: string]: number | '' }>({});
  const [dynamicResolutions, setDynamicResolutions] = useState<{ [branchId: string]: string }>({});

  // Search filter for history sessions
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Editing state for active session (Task workflow)
  const [isEditingActiveSession, setIsEditingActiveSession] = useState<boolean>(false);
  const [editingBranchesData, setEditingBranchesData] = useState<RenewalConsiderationSession['branches']>([]);

  const handleUpdateEditingBranchField = (
    branchId: string,
    field: 'sales' | 'resolution',
    value: any
  ) => {
    setEditingBranchesData((prev) =>
      prev.map((b) => (b.branchId === branchId ? { ...b, [field]: value } : b))
    );
  };

  const handleSaveActiveSessionChanges = async () => {
    if (!activeSession) return;

    const updatedSession: RenewalConsiderationSession = {
      ...activeSession,
      branches: editingBranchesData,
    };

    try {
      await setDoc(doc(db, 'sessions', updatedSession.id), updatedSession);
    } catch (e) {
      console.error('Failed to update session in Firestore', e);
    }
    setActiveSession(updatedSession);
    setIsEditingActiveSession(false);

    if (onAddAuditLog) {
      onAddAuditLog(
        'Update',
        `Consideration Report: ${activeSession.name}`,
        `อัปเดตข้อมูลยอดขายและมติที่ประชุมในรอบพิจารณาต่อสัญญา "${activeSession.name}"`
      );
    }
  };

  const handleCancelActiveSessionEditing = () => {
    setIsEditingActiveSession(false);
  };

  // Load saved sessions in real-time on mount from Firestore
  useEffect(() => {
    const sessionsRef = collection(db, 'sessions');
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const sessionsList: RenewalConsiderationSession[] = [];
      snapshot.forEach((docSnap) => {
        sessionsList.push(docSnap.data() as RenewalConsiderationSession);
      });
      // Sort sessions newest first by ID
      sessionsList.sort((a, b) => b.id.localeCompare(a.id));
      setSessions(sessionsList);
    }, (error) => {
      console.error('Firestore sessions subscription error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update active session and editing state when remote changes happen
  useEffect(() => {
    if (activeSession) {
      const updatedActive = sessions.find((s) => s.id === activeSession.id);
      if (updatedActive) {
        if (JSON.stringify(updatedActive) !== JSON.stringify(activeSession)) {
          setActiveSession(updatedActive);
          if (isEditingActiveSession) {
            setEditingBranchesData(updatedActive.branches);
          }
        }
      } else {
        setActiveSession(null);
        setIsEditingActiveSession(false);
      }
    }
  }, [sessions]);


  // Filter branches based on the expiration date filters
  const filteredBranchesByDate = branches.filter((b) => {
    if (!b.endDate) return false;
    // We only care about active/expiring/expired leases
    if (startDateFilter && b.endDate < startDateFilter) return false;
    if (endDateFilter && b.endDate > endDateFilter) return false;
    return true;
  });

  // When filters or list changes, pre-select matched branches and set dynamic inputs
  useEffect(() => {
    if (isCreating) {
      const selections: { [branchId: string]: boolean } = {};
      const salesInputs: { [branchId: string]: number | '' } = {};
      const resolutionInputs: { [branchId: string]: string } = {};

      filteredBranchesByDate.forEach((b) => {
        selections[b.id] = true; // Auto-check filtered ones
        salesInputs[b.id] = '';
        
        // Find previous resolution for this branch if any exists in previous sessions
        const prevRes = findPreviousResolution(b.id);
        resolutionInputs[b.id] = ''; // blank by default
      });

      setSelectedBranchesInCreation(selections);
      setDynamicSales(salesInputs);
      setDynamicResolutions(resolutionInputs);
    }
  }, [startDateFilter, endDateFilter, isCreating]);

  // Find previous resolution from history
  const findPreviousResolution = (branchId: string): string => {
    // Sort sessions in reverse order (newest first) to get the latest resolution
    const sortedSessions = [...sessions].sort((a, b) => b.createdDate.localeCompare(a.createdDate));
    for (const s of sortedSessions) {
      const found = s.branches.find((b) => b.branchId === branchId);
      if (found && found.resolution) {
        return found.resolution;
      }
    }
    return '';
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      alert('กรุณากรอกชื่อรอบพิจารณาต่อสัญญา');
      return;
    }

    // Prepare branches for the session
    const selectedBranchIds = Object.keys(selectedBranchesInCreation).filter(
      (id) => selectedBranchesInCreation[id]
    );

    if (selectedBranchIds.length === 0) {
      alert('กรุณาเลือกสาขาอย่างน้อย 1 สาขาเพื่อต่อสัญญาเช่า');
      return;
    }

    const sessionBranchesData = selectedBranchIds.map((id) => {
      const b = branches.find((x) => x.id === id)!;
      const rawSales = dynamicSales[b.id];
      const salesVal: number | "" = (rawSales === "" || rawSales === undefined) ? "" : Number(rawSales);
      return {
        branchId: b.id,
        branchName: b.name,
        endDate: b.endDate || '',
        rent: b.rent || 0,
        deposit: b.deposit || 0,
        advanceRent: b.advanceRent || 0,
        signTaxInfo: b.signTaxInfo || 'ไม่ระบุ',
        landTaxInfo: b.landTaxInfo || 'ไม่ระบุ',
        sales: salesVal,
        resolution: String(dynamicResolutions[b.id] || 'รอมติที่ประชุม'),
        previousResolution: findPreviousResolution(b.id) || 'ไม่มีประวัติมติเดิม',
      };
    });

    const timeNowStr = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const newSession: RenewalConsiderationSession = {
      id: `CONS-${Date.now()}`,
      name: sessionName.trim(),
      createdDate: timeNowStr,
      startDateFilter: startDateFilter || undefined,
      endDateFilter: endDateFilter || undefined,
      branches: sessionBranchesData,
    };

    try {
      await setDoc(doc(db, 'sessions', newSession.id), newSession);
    } catch (e) {
      console.error('Failed to save new session to Firestore', e);
    }

    if (onAddAuditLog) {
      onAddAuditLog(
        'Create',
        `Consideration Report: ${newSession.name}`,
        `เปิดรายงานพิจารณาต่อสัญญาใหม่ "${newSession.name}" จำนวนสาขาที่นำเสนอ ${sessionBranchesData.length} สาขา`
      );
    }

    // Reset and return
    setIsCreating(false);
    setSessionName('');
    setStartDateFilter('');
    setEndDateFilter('');
    setActiveSession(newSession);
  };

  // Export session data to CSV
  const handleExportSessionCSV = (session: RenewalConsiderationSession) => {
    const escapeCSVValue = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim().replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const headers = [
      'รหัสสาขา',
      'ชื่อสาขา',
      'วันสิ้นสุดสัญญาเดิม',
      'ค่าเช่ารายเดือน (บาท)',
      'เงินประกันสัญญา (บาท)',
      'เงินค่าเช่าล่วงหน้า (บาท)',
      'ภาษีป้าย',
      'ภาษีที่ดิน',
      'ยอดขายต่อเดือน (บาท)',
      'มติที่ประชุมเดิม (อ้างอิง)',
      'มติที่ประชุมใหม่',
    ];

    const rows = session.branches.map((b) => [
      b.branchId,
      b.branchName,
      b.endDate,
      b.rent,
      b.deposit,
      b.advanceRent,
      b.signTaxInfo,
      b.landTaxInfo,
      b.sales,
      b.previousResolution || 'ไม่มี',
      b.resolution,
    ]);

    const csvContent =
      '\ufeff' +
      [headers.join(','), ...rows.map((row) => row.map(escapeCSVValue).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานพิจารณาต่อสัญญา_${session.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export session data to Excel
  const handleExportSessionExcel = (session: RenewalConsiderationSession) => {
    const worksheetName = 'รายงานการพิจารณาต่อสัญญา';
    
    let tableHtml = `
      <table border="1" style="border-collapse:collapse; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size:12px;">
        <thead>
          <tr style="background-color:#1e3a8a; color:#ffffff; font-weight:bold;">
            <th style="padding:8px; border:1px solid #cbd5e1;">รหัสสาขา</th>
            <th style="padding:8px; border:1px solid #cbd5e1; min-width:180px;">ชื่อสาขา</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">วันสิ้นสุดสัญญาเดิม</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">ค่าเช่ารายเดือน (บาท)</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">เงินประกันสัญญา (บาท)</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">เงินค่าเช่าล่วงหน้า (บาท)</th>
            <th style="padding:8px; border:1px solid #cbd5e1; min-width:120px;">ภาษีป้าย</th>
            <th style="padding:8px; border:1px solid #cbd5e1; min-width:120px;">ภาษีที่ดิน</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">ยอดขายต่อเดือน (บาท)</th>
            <th style="padding:8px; border:1px solid #cbd5e1; min-width:180px;">มติที่ประชุมเดิม (อ้างอิง)</th>
            <th style="padding:8px; border:1px solid #cbd5e1; min-width:220px; background-color:#16a34a; color:#ffffff;">มติที่ประชุมใหม่</th>
          </tr>
        </thead>
        <tbody>
    `;

    session.branches.forEach((b) => {
      const rentVal = b.rent || 0;
      const depositVal = b.deposit || 0;
      const advanceVal = b.advanceRent || 0;
      const salesVal = b.sales !== '' && b.sales !== undefined ? b.sales : '';
      
      tableHtml += `
        <tr>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${b.branchId}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${b.branchName}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.endDate || 'ไม่ระบุ'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${rentVal}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${depositVal}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${advanceVal}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.signTaxInfo || 'ไม่ระบุ'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.landTaxInfo || 'ไม่ระบุ'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; ${salesVal !== '' ? "mso-number-format:'#\\,##0';" : ''}">${salesVal !== '' ? salesVal : '-'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; color:#475569;">${b.previousResolution || 'ไม่มี'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold; color:#166534; background-color:#f0fdf4;">${b.resolution || 'รอมติที่ประชุม'}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
       <x:ExcelWorkbook>
        <x:ExcelWorksheets>
         <x:ExcelWorksheet>
          <x:Name>${worksheetName}</x:Name>
          <x:WorksheetOptions>
           <x:DisplayGridlines/>
          </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      </head>
      <body>
        <div style="margin-bottom:15px; font-family:'Segoe UI', sans-serif;">
          <h2 style="margin:0; color:#1e3a8a;">${session.name}</h2>
          <p style="margin:5px 0; color:#475569; font-size:12px;">
            วันที่รายงาน: ${session.createdDate} | รหัสอ้างอิง: ${session.id}
          </p>
        </div>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานพิจารณาต่อสัญญา_${session.name}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="renewal-consideration-container">
      {/* View Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">
            รายงานพิจารณาต่อสัญญาเช่า
          </h2>
          <p className="text-sm font-sans text-secondary mt-1">
            เปิดรอบและจัดทำแผนพิจารณาต่อสัญญา โดยเปรียบเทียบค่าเช่า ภาษี ยอดขาย และประวัติมติที่ประชุมเดิมแบบบูรณาการ
          </p>
        </div>
        <div className="flex gap-3">
          {activeSession || isCreating ? (
            <button
              onClick={() => {
                setActiveSession(null);
                setIsCreating(false);
              }}
              className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
              ดูประวัติทั้งหมด
            </button>
          ) : (
            userRole !== 'visitor' && (
              <button
                onClick={() => {
                  setIsCreating(true);
                  // Set default dates to filter expiring branches (this year / next few months)
                  const today = new Date();
                  const nextYear = new Date();
                  nextYear.setFullYear(today.getFullYear() + 1);
                  setStartDateFilter(today.toISOString().split('T')[0]);
                  setEndDateFilter(nextYear.toISOString().split('T')[0]);
                  setSessionName(`แผนพิจารณาต่อสัญญาสาขา รอบ ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`);
                }}
                className="bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                เปิดรอบพิจารณาใหม่
              </button>
            )
          )}
        </div>
      </div>

      {/* CREATION WORKFLOW */}
      {isCreating && (
        <form onSubmit={handleCreateSessionSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Setup Panel (Left side) */}
          <div className="xl:col-span-4 bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-5 h-fit">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/60 pb-3">
              <span className="material-symbols-outlined text-primary text-lg">settings</span>
              ตั้งค่ารอบพิจารณา
            </h3>

            {/* Session Name */}
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                ชื่อรอบการพิจารณาต่อสัญญา <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="เช่น พิจารณาต่อสัญญาไตรมาส 3/2026"
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
              />
            </div>

            {/* Expiration Date Filters */}
            <div className="flex flex-col gap-3 p-3.5 rounded border border-outline-variant bg-surface">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">filter_alt</span>
                ตัวกรองวันหมดสัญญาเช่า
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[10px] text-secondary font-bold uppercase block mb-1">จากวันหมดสัญญา</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-outline-variant rounded text-[11px] font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary font-bold uppercase block mb-1">ถึงวันหมดสัญญา</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-outline-variant rounded text-[11px] font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-secondary font-sans leading-relaxed mt-1">
                ระบบจะค้นหาและแสดงผลเฉพาะสาขาที่มีสัญญาหมดอายุอยู่ในช่วงวันดังกล่าวเท่านั้น
              </p>
            </div>

            {/* List of matching branches with checkbox selections */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-secondary uppercase">
                  เลือกสาขาที่นำเสนอเข้าประชุม ({filteredBranchesByDate.length} สาขาที่พบ)
                </label>
                {filteredBranchesByDate.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = filteredBranchesByDate.every((b) => selectedBranchesInCreation[b.id]);
                      const newSelections = { ...selectedBranchesInCreation };
                      filteredBranchesByDate.forEach((b) => {
                        newSelections[b.id] = !allSelected;
                      });
                      setSelectedBranchesInCreation(newSelections);
                    }}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    สลับการเลือกทั้งหมด
                  </button>
                )}
              </div>

              <div className="border border-outline-variant rounded bg-surface max-h-60 overflow-y-auto p-2 flex flex-col gap-1.5">
                {filteredBranchesByDate.length > 0 ? (
                  filteredBranchesByDate.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-start gap-2.5 p-2 rounded hover:bg-surface-container-low cursor-pointer border border-outline-variant/20 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedBranchesInCreation[b.id]}
                        onChange={(e) => {
                          setSelectedBranchesInCreation({
                            ...selectedBranchesInCreation,
                            [b.id]: e.target.checked,
                          });
                        }}
                        className="mt-0.5 rounded text-primary focus:ring-primary focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate leading-tight">{b.name}</p>
                        <p className="text-[10px] text-secondary font-mono leading-none mt-1">
                          หมดสัญญา: {b.endDate || 'ไม่ระบุ'} • ID: {b.id}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-secondary font-semibold font-sans">
                    ไม่พบสาขาหมดสัญญาในช่วงเวลาที่กำหนด
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={filteredBranchesByDate.length === 0}
              className="w-full mt-2 bg-primary hover:bg-primary/95 text-white font-bold py-2.5 px-4 rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              สร้างรอบรายงานพิจารณาต่อสัญญา
            </button>
          </div>

          {/* Form Fields inputs table (Right side - 8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/60 pb-3 mb-4">
                <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                รายละเอียดรายสาขา ยอดขาย และมติที่ประชุมใหม่
              </h3>

              {/* Editable table representation */}
              <div className="overflow-x-auto border border-outline-variant rounded-lg">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant text-secondary font-bold">
                      <th className="p-3 w-1/4">สาขา</th>
                      <th className="p-3 text-right">ข้อมูลสัญญาเดิม (เช่า/ประกัน/ล่วงหน้า)</th>
                      <th className="p-3">ภาษีป้าย & ภาษีที่ดิน</th>
                      <th className="p-3 w-40">ยอดขายรายเดือน (บาท) *</th>
                      <th className="p-3 w-52">มติเดิม & มติที่ประชุมใหม่ *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {filteredBranchesByDate.filter((b) => selectedBranchesInCreation[b.id]).length > 0 ? (
                      filteredBranchesByDate
                        .filter((b) => selectedBranchesInCreation[b.id])
                        .map((b) => {
                          const prevRes = findPreviousResolution(b.id);
                          return (
                            <tr key={b.id} className="hover:bg-surface/30">
                              {/* Branch Name & Info */}
                              <td className="p-3">
                                <div className="font-bold text-on-surface leading-tight">{b.name}</div>
                                <div className="text-[10px] text-secondary font-mono mt-1">ID: {b.id}</div>
                                <div className="text-[10px] text-primary font-semibold mt-0.5">หมดอายุ: {b.endDate || 'ไม่ระบุ'}</div>
                              </td>

                              {/* Lease Stats */}
                              <td className="p-3 text-right">
                                <div className="leading-snug">
                                  <span className="text-[10px] text-secondary uppercase font-bold mr-1">เช่า:</span>
                                  <span className="font-semibold text-on-surface">฿{(b.rent || 0).toLocaleString()}</span>
                                </div>
                                <div className="leading-snug">
                                  <span className="text-[10px] text-secondary uppercase font-bold mr-1">ประกัน:</span>
                                  <span className="text-on-surface">฿{(b.deposit || 0).toLocaleString()}</span>
                                </div>
                                <div className="leading-snug">
                                  <span className="text-[10px] text-secondary uppercase font-bold mr-1">ล่วงหน้า:</span>
                                  <span className="text-on-surface">฿{(b.advanceRent || 0).toLocaleString()}</span>
                                </div>
                              </td>

                              {/* Taxes */}
                              <td className="p-3 max-w-[180px]">
                                <div className="text-[10px] text-on-surface truncate font-semibold" title={b.signTaxInfo}>
                                  🏷️ {b.signTaxInfo || 'ไม่ระบุภาษีป้าย'}
                                </div>
                                <div className="text-[10px] text-on-surface truncate font-semibold mt-1" title={b.landTaxInfo}>
                                  🪵 {b.landTaxInfo || 'ไม่ระบุภาษีที่ดิน'}
                                </div>
                              </td>

                              {/* Sales input */}
                              <td className="p-3">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[11px] font-semibold">฿</span>
                                  <input
                                    type="number"
                                    placeholder="กรอกยอดขาย"
                                    value={dynamicSales[b.id] === undefined ? '' : dynamicSales[b.id]}
                                    onChange={(e) => {
                                      setDynamicSales({
                                        ...dynamicSales,
                                        [b.id]: e.target.value === '' ? '' : Number(e.target.value),
                                      });
                                    }}
                                    className="w-full pl-6 pr-2 py-1.5 bg-surface border border-outline-variant rounded text-xs font-bold font-sans outline-none focus:border-primary"
                                  />
                                </div>
                              </td>

                              {/* Resolution input & Previous reference */}
                              <td className="p-3 flex flex-col gap-1.5">
                                {prevRes && (
                                  <div className="bg-[#e8f4fd] text-primary p-1.5 rounded text-[10px] font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] shrink-0">history</span>
                                    <span>มติเดิม: {prevRes}</span>
                                  </div>
                                )}
                                <input
                                  type="text"
                                  placeholder="พิมพ์มติที่ประชุม..."
                                  value={dynamicResolutions[b.id] || ''}
                                  onChange={(e) => {
                                    setDynamicResolutions({
                                      ...dynamicResolutions,
                                      [b.id]: e.target.value,
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                                />
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {[
                                    'รอมติที่ประชุม',
                                    'ต่อสัญญา 3 ปี (ค่าเช่าเดิม)',
                                    'ต่อสัญญา 3 ปี (ปรับเพิ่ม 3%)',
                                    'ต่อสัญญา 1 ปี (ประเมินต่อ)',
                                    'เจรจาขอส่วนลดค่าเช่า 10%',
                                    'เห็นควรปิดสาขา',
                                  ].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => {
                                        setDynamicResolutions({
                                          ...dynamicResolutions,
                                          [b.id]: preset,
                                        });
                                      }}
                                      className="text-[9px] bg-surface-container-high hover:bg-primary-container hover:text-white border border-outline-variant/30 text-secondary px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-secondary font-semibold">
                          ยังไม่ได้เลือกสาขา หรือไม่พบสาขาใดๆ เลือกจากรายชื่อด้านซ้ายเพื่อกรอกข้อมูล
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* READ-ONLY & EDITABLE VIEW OF ACTIVE RETRIEVED SESSION */}
      {activeSession && !isCreating && (() => {
        const totalBranchesCount = activeSession.branches.length;
        const salesEnteredCount = activeSession.branches.filter((b) => b.sales !== '').length;
        const resolutionDecidedCount = activeSession.branches.filter(
          (b) => b.resolution && b.resolution !== 'รอมติที่ประชุม'
        ).length;

        // Dynamic classes based on presentation mode and zoom level
        const thClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'p-5 text-sm text-[#1e293b] font-extrabold uppercase tracking-wider bg-slate-100 border-b-2 border-slate-300'
            : presentationZoom === 'large'
            ? 'p-4 text-xs text-[#1e293b] font-bold uppercase tracking-wider bg-slate-50 border-b-2 border-slate-200'
            : 'p-3 text-[11px] text-[#1e293b] font-bold uppercase'
          : 'p-3 text-secondary font-bold';

        const tdClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'p-5 text-base font-semibold border-b border-slate-200'
            : presentationZoom === 'large'
            ? 'p-4 text-sm font-semibold border-b border-slate-150'
            : 'p-3 text-xs'
          : 'p-3';

        const textBranchNameClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'text-lg font-extrabold text-on-surface'
            : presentationZoom === 'large'
            ? 'text-base font-bold text-on-surface'
            : 'text-xs font-bold text-on-surface'
          : 'font-bold text-on-surface';

        const subTextClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'text-xs text-secondary mt-1 font-mono'
            : presentationZoom === 'large'
            ? 'text-[11px] text-secondary mt-0.5 font-mono'
            : 'text-[10px] text-secondary mt-0.5 font-mono'
          : 'text-[10px] text-secondary font-mono mt-0.5';

        const boldTextOnSurfaceClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'text-base font-bold text-on-surface'
            : presentationZoom === 'large'
            ? 'text-sm font-bold text-on-surface'
            : 'text-xs font-bold text-on-surface'
          : 'font-semibold text-on-surface';

        const normalTextOnSurfaceClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'text-base text-on-surface font-semibold'
            : presentationZoom === 'large'
            ? 'text-sm text-on-surface font-semibold'
            : 'text-xs text-on-surface'
          : 'text-on-surface';

        const badgeClass = isPresentationMode
          ? presentationZoom === 'xlarge'
            ? 'text-xs px-3 py-1.5 font-extrabold rounded-full'
            : presentationZoom === 'large'
            ? 'text-[11px] px-2.5 py-1 font-bold rounded-full'
            : 'text-[10px] px-2 py-0.5 font-bold rounded-full'
          : 'text-[10px] px-2.5 py-1 font-semibold';

        return (
          <div className={`bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-6 animate-fade-in ${isPresentationMode ? 'border-2 border-primary/30 shadow-md ring-4 ring-primary/5' : ''}`} id="active-consideration-session">
            {/* Presentation Controls HUD */}
            {isPresentationMode && (
              <div className="bg-[#0f172a] text-slate-100 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl animate-bounce">📊</span>
                  <div>
                    <h4 className="text-sm font-bold tracking-wide text-amber-400 font-sans flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      โหมดนำเสนอผู้บริหารระดับสูง (CEO Presentation Mode)
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                      ปรับขนาดตารางให้อ่านง่าย คมชัดสูงสุดบนโปรเจคเตอร์ และขยายพื้นที่มุมมองจนสุดหน้าจอโดยอัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold px-2 uppercase font-sans">ระดับซูม:</span>
                    {(['normal', 'large', 'xlarge'] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setPresentationZoom(z)}
                        className={`text-[11px] font-bold px-3 py-1 rounded transition-all cursor-pointer font-sans ${
                          presentationZoom === z
                            ? 'bg-primary text-white shadow-md'
                            : 'text-slate-300 hover:bg-slate-700/80'
                        }`}
                      >
                        {z === 'normal' ? 'ปกติ' : z === 'large' ? 'ใหญ่ (📺 CEO)' : 'ใหญ่มาก (🖥️ โปรเจคเตอร์)'}
                      </button>
                    ))}
                  </div>

                  {/* Exit button */}
                  <button
                    type="button"
                    onClick={() => onTogglePresentationMode?.(false)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors font-sans shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs">fullscreen_exit</span>
                    ปิดโหมดนำเสนอ
                  </button>
                </div>
              </div>
            )}

            {/* Active Session details header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant pb-4 gap-3">
              <div>
                <span className="text-[10px] bg-primary text-white font-bold px-2.5 py-1 rounded-full tracking-wide uppercase mb-1.5 block w-max leading-none shadow-sm font-sans">
                  แผนงานพิจารณาต่อสัญญาเช่า
                </span>
                <h3 className="text-2xl font-bold text-on-surface leading-snug">{activeSession.name}</h3>
                <p className="text-xs text-secondary mt-1 font-sans">
                  วันที่เปิดบันทึกรายงาน: {activeSession.createdDate} • รหัสอ้างอิง: {activeSession.id}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 items-center">
                <button
                  type="button"
                  onClick={() => onTogglePresentationMode?.(!isPresentationMode)}
                  className={`text-xs font-bold py-2 px-4 rounded transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    isPresentationMode
                      ? 'bg-[#ea580c] hover:bg-[#d97706] text-white'
                      : 'bg-[#1e3a8a] hover:bg-[#172554] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isPresentationMode ? 'fullscreen_exit' : 'present_to_all'}
                  </span>
                  {isPresentationMode ? 'ออกจากโหมดนำเสนอ' : '🖥️ โหมดนำเสนอ CEO'}
                </button>

                {userRole !== 'visitor' && (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => handleExportSessionExcel(activeSession)}
                      className="bg-[#166534] hover:bg-[#14532d] text-white border border-[#15803d] text-xs font-bold py-2 px-3.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">table_view</span>
                      ส่งออก Excel
                    </button>
                    <button
                      onClick={() => handleExportSessionCSV(activeSession)}
                      className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-3.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      ส่งออก CSV
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('คุณต้องการลบรอบการพิจารณานี้ออกจากประวัติหรือไม่?')) {
                          try {
                            await deleteDoc(doc(db, 'sessions', activeSession.id));
                          } catch (e) {
                            console.error('Failed to delete session in Firestore', e);
                          }
                          setActiveSession(null);
                        }
                      }}
                      className="bg-white hover:bg-red-50 border border-outline-variant hover:border-red-200 text-red-600 text-xs font-semibold py-2 px-3.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      ลบข้อมูล
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Workflow Guideline Banner */}
            <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-[#0284c7] text-2xl mt-0.5">info</span>
                <div>
                  <h4 className="text-sm font-bold text-[#0369a1] font-sans">ขั้นตอนการบันทึกข้อมูล (Workflow)</h4>
                  <p className="text-xs text-[#0e7490] font-sans mt-0.5 leading-relaxed">
                    1. <strong>กรอกยอดขายรายสาขา:</strong> ใส่ข้อมูลเพื่อประเมินสัดส่วนก่อนการนำเสนอที่ประชุม <br />
                    2. <strong>บันทึกมติที่ประชุมใหม่:</strong> อัปเดตผลอนุมัติหรือเจรจาต่อสัญญาได้ในภายหลัง
                  </p>
                </div>
              </div>
              {userRole !== 'visitor' && (
                !isEditingActiveSession ? (
                  <button
                    onClick={() => {
                      setEditingBranchesData([...activeSession.branches]);
                      setIsEditingActiveSession(true);
                    }}
                    className="bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2 px-4 rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    แก้ไขยอดขาย & มติประชุม
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveActiveSessionChanges}
                      className="bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2.5 px-4 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      บันทึกข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelActiveSessionEditing}
                      className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      ยกเลิก
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Summary statistics metrics of the task */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e0f2fe] text-[#0369a1] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">store</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">สาขาทั้งหมดในแผน</p>
                  <p className="text-lg font-extrabold text-on-surface">{totalBranchesCount} สาขา</p>
                </div>
              </div>
              
              <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0fdf4] text-[#166534] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">บันทึกยอดขายรายเดือนแล้ว</p>
                  <p className="text-lg font-extrabold text-on-surface">
                    {salesEnteredCount} / {totalBranchesCount} สาขา
                    <span className="text-[11px] font-semibold text-secondary ml-1">
                      ({Math.round((salesEnteredCount / (totalBranchesCount || 1)) * 100)}%)
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fef3c7] text-[#92400e] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">มติการประชุมที่อนุมัติแล้ว</p>
                  <p className="text-lg font-extrabold text-on-surface">
                    {resolutionDecidedCount} / {totalBranchesCount} สาขา
                    <span className="text-[11px] font-semibold text-secondary ml-1">
                      ({Math.round((resolutionDecidedCount / (totalBranchesCount || 1)) * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Results table */}
            <div className={`overflow-x-auto border rounded-lg shadow-sm ${isPresentationMode ? 'border-slate-300' : 'border-outline-variant'}`}>
              <table className={`w-full text-left border-collapse font-sans ${isPresentationMode ? 'text-sm' : 'text-xs'}`}>
                <thead>
                  <tr className={`${isPresentationMode ? 'bg-slate-100/80 border-b border-slate-300' : 'bg-surface border-b border-outline-variant'} text-secondary font-bold`}>
                    <th className={thClass}>สาขา</th>
                    <th className={`${thClass} text-right`}>วันสิ้นสุดสัญญาเดิม</th>
                    <th className={`${thClass} text-right`}>ค่าเช่าเดิม</th>
                    <th className={`${thClass} text-right`}>เงินประกันสัญญา</th>
                    <th className={`${thClass} text-right`}>ค่าเช่าล่วงหน้า</th>
                    <th className={thClass}>ภาษีป้าย & ภาษีที่ดิน</th>
                    <th className={`${thClass} text-right`}>ยอดขายรายเดือน (บาท)</th>
                    <th className={thClass}>มติที่ประชุมอ้างอิงเดิม</th>
                    <th className={`${thClass} text-primary font-extrabold`}>มติที่ประชุมใหม่</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isPresentationMode ? 'divide-slate-200' : 'divide-outline-variant/60'}`}>
                  {/* EDIT MODE */}
                  {isEditingActiveSession &&
                    editingBranchesData.map((b) => {
                      const prevRes = b.previousResolution;
                      return (
                        <tr key={b.branchId} className={`hover:bg-surface/30 ${isPresentationMode ? 'bg-slate-50/50' : 'bg-[#fbfbfe]'}`}>
                          <td className={`${tdClass} font-bold text-on-surface`}>
                            <div className={textBranchNameClass}>{b.branchName}</div>
                            <div className={subTextClass}>ID: {b.branchId}</div>
                          </td>
                          <td className={`${tdClass} text-right font-semibold text-secondary`}>{b.endDate || 'ไม่ระบุ'}</td>
                          <td className={`${tdClass} text-right font-semibold text-on-surface`}>฿{(b.rent || 0).toLocaleString()}</td>
                          <td className={`${tdClass} text-right text-on-surface`}>฿{(b.deposit || 0).toLocaleString()}</td>
                          <td className={`${tdClass} text-right text-on-surface`}>฿{(b.advanceRent || 0).toLocaleString()}</td>
                          <td className={`${tdClass} max-w-[200px] text-secondary`}>
                            <div className={`truncate ${subTextClass}`} title={b.signTaxInfo}>🏷️ {b.signTaxInfo}</div>
                            <div className={`truncate mt-0.5 ${subTextClass}`} title={b.landTaxInfo}>🪵 {b.landTaxInfo}</div>
                          </td>
                          {/* Editable Sales */}
                          <td className={tdClass}>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[11px] font-semibold">฿</span>
                              <input
                                type="number"
                                placeholder="ใส่ยอดขาย"
                                value={b.sales === undefined || b.sales === '' ? '' : b.sales}
                                onChange={(e) => {
                                  handleUpdateEditingBranchField(
                                    b.branchId,
                                    'sales',
                                    e.target.value === '' ? '' : Number(e.target.value)
                                  );
                                }}
                                className={`w-full pl-6 pr-2 py-1.5 bg-white border border-primary/50 rounded font-bold outline-none focus:border-primary shadow-sm ${isPresentationMode ? 'text-sm' : 'text-xs'}`}
                              />
                            </div>
                          </td>
                          <td className={tdClass}>
                            <span className={`${badgeClass} text-secondary leading-snug block bg-surface border border-outline-variant/30 max-w-[200px] truncate`} title={prevRes}>
                              {prevRes || '-'}
                            </span>
                          </td>
                          {/* Editable Resolution */}
                          <td className={tdClass}>
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                placeholder="พิมพ์มติที่ประชุม..."
                                value={b.resolution || ''}
                                onChange={(e) => {
                                  handleUpdateEditingBranchField(b.branchId, 'resolution', e.target.value);
                                }}
                                className={`w-full px-3 py-1.5 bg-white border border-primary/50 rounded font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm ${isPresentationMode ? 'text-sm' : 'text-xs'}`}
                              />
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[
                                  'รอมติที่ประชุม',
                                  'ต่อสัญญา 3 ปี (ค่าเช่าเดิม)',
                                  'ต่อสัญญา 3 ปี (ปรับเพิ่ม 3%)',
                                  'ต่อสัญญา 1 ปี (ประเมินต่อ)',
                                  'เจรจาขอส่วนลดค่าเช่า 10%',
                                  'เห็นควรปิดสาขา',
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateEditingBranchField(b.branchId, 'resolution', preset);
                                    }}
                                    className={`text-[9px] bg-surface-container-high hover:bg-primary-container hover:text-white border border-outline-variant/30 text-secondary px-1.5 py-0.5 rounded transition-all cursor-pointer`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {/* READ ONLY MODE */}
                  {!isEditingActiveSession &&
                    activeSession.branches.map((b) => {
                      const isPendingSales = b.sales === '';
                      const isAwaitingRes = b.resolution === 'รอมติที่ประชุม' || !b.resolution;

                      return (
                        <tr key={b.branchId} className={isPresentationMode ? 'hover:bg-slate-50 border-b border-slate-200' : 'hover:bg-surface/30'}>
                          <td className={`${tdClass} font-bold text-on-surface`}>
                            <div className={textBranchNameClass}>{b.branchName}</div>
                            <div className={subTextClass}>ID: {b.branchId}</div>
                          </td>
                          <td className={`${tdClass} text-right font-semibold text-secondary`}>{b.endDate || 'ไม่ระบุ'}</td>
                          <td className={`${tdClass} text-right font-semibold text-on-surface`}>฿{(b.rent || 0).toLocaleString()}</td>
                          <td className={`${tdClass} text-right text-on-surface`}>฿{(b.deposit || 0).toLocaleString()}</td>
                          <td className={`${tdClass} text-right text-on-surface`}>฿{(b.advanceRent || 0).toLocaleString()}</td>
                          <td className={`${tdClass} max-w-[200px] text-secondary`}>
                            <div className={`truncate ${subTextClass}`} title={b.signTaxInfo}>🏷️ {b.signTaxInfo}</div>
                            <div className={`truncate mt-0.5 ${subTextClass}`} title={b.landTaxInfo}>🪵 {b.landTaxInfo}</div>
                          </td>
                          <td className={`${tdClass} text-right font-bold text-on-surface`}>
                            {isPendingSales ? (
                              <span className={`text-amber-600 font-bold bg-amber-50 rounded border border-amber-200/50 inline-flex items-center gap-1 ${badgeClass}`}>
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                ใส่ยอดขายก่อนประชุม
                              </span>
                            ) : (
                              `฿${Number(b.sales).toLocaleString()}`
                            )}
                          </td>
                          <td className={tdClass}>
                            <span className={`${badgeClass} text-secondary leading-snug block bg-surface border border-outline-variant/30 max-w-[200px] truncate`} title={b.previousResolution}>
                              {b.previousResolution || '-'}
                            </span>
                          </td>
                          <td className={tdClass}>
                            {isAwaitingRes ? (
                              <span className={`bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-extrabold flex items-center gap-1 w-max leading-none shadow-sm animate-pulse ${badgeClass}`}>
                                <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                                รอมติประชุม
                              </span>
                            ) : (
                              <span className={`bg-primary text-white rounded-full font-bold block w-max leading-none shadow-sm ${badgeClass}`}>
                                {b.resolution}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* SESSIONS HISTORY / LIST VIEW */}
      {!activeSession && !isCreating && (
        <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-outline-variant/60">
            <div>
              <h3 className="text-base font-bold text-on-surface">ประวัติรอบการพิจารณาต่อสัญญาเช่า</h3>
              <p className="text-xs text-secondary mt-0.5">ค้นหาและตรวจสอบรอบการประชุมและมติพิจารณาต่อสัญญาทั้งหมดที่ผ่านมา</p>
            </div>
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="ค้นหาชื่อรอบพิจารณา..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((s) => {
                const pendingSalesCount = s.branches.filter((b) => b.sales === '').length;
                const pendingResolutionsCount = s.branches.filter(
                  (b) => !b.resolution || b.resolution === 'รอมติที่ประชุม'
                ).length;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSession(s);
                      setIsEditingActiveSession(false);
                    }}
                    className="group bg-white border border-outline-variant hover:border-primary hover:shadow-md rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <span className="text-[9px] bg-surface-container-highest text-secondary font-bold px-2 py-0.5 rounded font-mono uppercase">
                          {s.id}
                        </span>
                        <span className="text-[10px] text-secondary font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">calendar_today</span>
                          {s.createdDate}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {s.name}
                      </h4>
                      
                      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-secondary">
                        <span className="material-symbols-outlined text-xs">store</span>
                        <span>จำนวนสาขาในแผน: <strong>{s.branches.length} สาขา</strong></span>
                      </div>

                      {/* Workflow Task Progress summary in card */}
                      <div className="mt-3.5 pt-2.5 border-t border-outline-variant/50 flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-secondary">payments</span>
                            กรอกยอดขายแล้ว:
                          </span>
                          <span className="font-bold text-on-surface">
                            {s.branches.length - pendingSalesCount} / {s.branches.length}
                          </span>
                        </div>
                        {pendingSalesCount > 0 && (
                          <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold w-max flex items-center gap-0.5 border border-amber-100">
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            ต้องใส่ข้อมูลก่อนการประชุม ({pendingSalesCount} สาขา)
                          </div>
                        )}

                        <div className="flex justify-between text-[11px] mt-1">
                          <span className="text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-secondary">gavel</span>
                            บันทึกมติที่ประชุมแล้ว:
                          </span>
                          <span className="font-bold text-on-surface">
                            {s.branches.length - pendingResolutionsCount} / {s.branches.length}
                          </span>
                        </div>
                        {pendingResolutionsCount > 0 && (
                          <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold w-max flex items-center gap-0.5 border border-blue-100">
                            <span className="material-symbols-outlined text-[11px]">schedule</span>
                            รอมติภายหลังการประชุม ({pendingResolutionsCount} สาขา)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/60 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-primary group-hover:underline">
                      <span>เปิดดูแผนและบันทึกข้อมูลรอบนี้</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center border border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">
                  query_stats
                </span>
                <p className="text-sm font-semibold">ยังไม่มีประวัติรอบรายงานการพิจารณาต่อสัญญาเช่า</p>
                <p className="text-xs mt-1">คลิก "เปิดรอบพิจารณาใหม่" เพื่อเริ่มต้นบันทึกข้อมูลมติที่ประชุมแรกของคุณ</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

