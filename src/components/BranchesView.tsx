import React, { useState, useRef } from 'react';
import { Branch } from '../types';
import * as XLSX from 'xlsx';

interface BranchesViewProps {
  branches: Branch[];
  onSelectBranch: (id: string) => void;
  onAddBranch: () => void;
  onEditBranch: (id: string) => void;
  onDeleteBranch: (id: string) => void;
  onImportBranches?: (imported: Branch[], replace: boolean) => void;
  onClearAllData?: () => void;
  userRole?: 'admin' | 'visitor' | 'super_admin';
}

export default function BranchesView({
  branches,
  onSelectBranch,
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  onImportBranches,
  onClearAllData,
  userRole,
}: BranchesViewProps) {
  // Filters & Search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [buildingStatusFilter, setBuildingStatusFilter] = useState('');
  const [phoneTabletFilter, setPhoneTabletFilter] = useState('');

  // Excel Importer states
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamically extract all unique types from current branches list
  // so any newly typed types automatically become options in the filter!
  const defaultTypes = [
    'AIS BUDDY',
    'Direct Sale',
    'Partner Store (Tuenjai )',
    'Retail Outlet',
    'Retail Store',
    'Sewing Studio',
    'Retail Shoping Mall'
  ];
  
  const allUniqueTypes = Array.from(
    new Set([...defaultTypes, ...branches.map((b) => b.type).filter(Boolean)])
  ).sort();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter branches
  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.id.toLowerCase().includes(search.toLowerCase()) ||
      branch.manager.toLowerCase().includes(search.toLowerCase()) ||
      branch.province.toLowerCase().includes(search.toLowerCase()) ||
      (branch.area && branch.area.toLowerCase().includes(search.toLowerCase())) ||
      (branch.phoneTabletModel && branch.phoneTabletModel.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter ? branch.status === statusFilter : true;
    const matchesType = typeFilter ? branch.type === typeFilter : true;
    const matchesBuildingStatus = buildingStatusFilter
      ? (branch.buildingStatus || 'สัญญาเช่า') === buildingStatusFilter
      : true;

    let matchesPhoneTablet = true;
    if (phoneTabletFilter === 'all_selected') {
      matchesPhoneTablet = !!branch.phoneTabletSelected;
    } else if (phoneTabletFilter === 'Phone') {
      matchesPhoneTablet = !!branch.phoneTabletSelected && branch.phoneTabletType === 'Phone';
    } else if (phoneTabletFilter === 'Tablet') {
      matchesPhoneTablet = !!branch.phoneTabletSelected && branch.phoneTabletType === 'Tablet';
    } else if (phoneTabletFilter === 'none') {
      matchesPhoneTablet = !branch.phoneTabletSelected;
    }

    return matchesSearch && matchesStatus && matchesType && matchesPhoneTablet && matchesBuildingStatus;
  });

  // Calculate pagination bounds
  const totalItems = filteredBranches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBranches = filteredBranches.slice(startIndex, startIndex + itemsPerPage);

  const parseExcelDate = (val: any): string => {
    if (!val) return "";
    if (val instanceof Date) {
      const d = new Date(val.getTime() - val.getTimezoneOffset() * 60000);
      return d.toISOString().slice(0, 10);
    }
    if (typeof val === 'number') {
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().slice(0, 10);
    }
    const str = String(val).trim();
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, '0');
      const month = slashMatch[2].padStart(2, '0');
      let year = parseInt(slashMatch[3], 10);
      if (year > 2500) year -= 543;
      return `${year}-${month}-${day}`;
    }
    const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dashMatch) {
      const year = dashMatch[1];
      const month = dashMatch[2].padStart(2, '0');
      const day = dashMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return str;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error('ไม่สามารถอ่านไฟล์ได้');
        
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        if (!rawRows || rawRows.length === 0) {
          throw new Error('ไม่พบข้อมูลสาขาในไฟล์ Excel หรือรูปแบบไฟล์ไม่ถูกต้อง');
        }

        const importedBranches: Branch[] = [];
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `STL${year}${month}`;

        rawRows.forEach((row: any, index: number) => {
          const getVal = (synonyms: string[]): string => {
            for (const syn of synonyms) {
              const key = Object.keys(row).find(
                (k) => k.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '') === syn.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '')
              );
              if (key && row[key] !== undefined && row[key] !== null) {
                return String(row[key]).trim();
              }
            }
            return "";
          };

          const getNum = (synonyms: string[]): number => {
            const val = getVal(synonyms);
            if (!val) return 0;
            const parsed = parseFloat(val.replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
          };

          const name = getVal(['ชื่อสาขา', 'ชื่อ', 'branchname', 'name']);
          if (!name) return;

          const type = getVal(['ประเภทสาขา', 'ประเภท', 'branchtype', 'type']) || 'Retail Store';
          const province = getVal(['จังหวัด', 'province']) || 'กรุงเทพมหานคร';
          const area = getVal(['เขต', 'area', 'เขตarea', 'โซน']);
          const status = getVal(['สถานะ', 'status', 'สถานะสาขา']) || 'Active';
          const manager = getVal(['ผู้จัดการ', 'ผู้ติดต่อ', 'manager', 'contact', 'ผู้จัดการสาขา']);
          const phone = getVal(['เบอร์โทร', 'เบอร์โทรศัพท์', 'phone', 'telephone', 'tel']);
          const email = getVal(['อีเมล', 'email']);
          const spaceSize = getVal(['ขนาดพื้นที่', 'ขนาด', 'spacesize', 'size']) || '';
          const address = getVal(['ที่อยู่', 'address']) || '';

          const seq = String(index + 1).padStart(3, '0');
          const contractNumber = `${prefix}${seq}`;

          const startDate = parseExcelDate(getVal(['วันเริ่มสัญญา', 'วันเริ่ม', 'startdate', 'start_date', 'วันที่เริ่ม'])) || '2026-01-01';
          const endDate = parseExcelDate(getVal(['วันสิ้นสุดสัญญา', 'วันสิ้นสุด', 'enddate', 'end_date', 'วันที่สิ้นสุด'])) || '2028-12-31';

          const rent = getNum(['ค่าเช่า', 'ค่าเช่ารายเดือน', 'rent', 'monthlyrent', 'ค่าเช่ารายเดือนบาท']);
          const deposit = getNum(['เงินประกัน', 'deposit', 'เงินประกันสัญญา', 'เงินประกันบาท']);
          const advanceRent = getNum(['ค่าเช่าล่วงหน้า', 'advancerent', 'เงินค่าเช่าล่วงหน้า', 'ค่าเช่าล่วงหน้าบาท']);
          const noticePeriod = getNum(['ระยะเวลาแจ้งล่วงหน้า', 'noticeperiod', 'แจ้งล่วงหน้า', 'เตือนล่วงหน้า']) || 90;

          const leaseObj = {
            id: contractNumber,
            startDate,
            endDate,
            rent,
            deposit,
            advanceRent,
            noticePeriod,
            status: 'Active'
          };

          const branchId = getVal(['รหัสสาขา', 'รหัส', 'branchid', 'id']) || `BR-${seq}`;

          const newBranch: Branch = {
            id: branchId,
            name,
            type,
            province,
            openingDate: startDate,
            startDate,
            endDate,
            status,
            buildingStatus: 'สัญญาเช่า',
            rent,
            deposit,
            advanceRent,
            noticePeriod,
            address,
            manager,
            email,
            phone,
            area,
            spaceSize,
            contractNumber,
            leases: [leaseObj],
            documents: []
          };

          importedBranches.push(newBranch);
        });

        if (importedBranches.length === 0) {
          throw new Error('ไม่พบแถวข้อมูลที่สามารถนำเข้าได้ กรุณาตรวจสอบว่ามีคอลัมน์ชื่อ "ชื่อสาขา" ในไฟล์');
        }

        if (onImportBranches) {
          onImportBranches(importedBranches, true);
          setImportSuccess(`นำเข้าข้อมูลสาขาสำเร็จจำนวน ${importedBranches.length} สาขา และได้ทำการรีเซ็ตข้อมูลเป็นประวัติจริงเรียบร้อยแล้ว!`);
        }
      } catch (err: any) {
        setImportError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ Excel');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export to Excel (Thai support)
  const handleExportExcel = () => {
    const worksheetName = 'รายชื่อสาขา SINGER';
    const headers = [
      'รหัสสาขา',
      'ชื่อสาขา',
      'ประเภทสาขา',
      'จังหวัด',
      'เขต (Area)',
      'สถานะ',
      'ค่าเช่ารายเดือน (บาท)'
    ];

    let tableHtml = `
      <table border="1" style="border-collapse:collapse; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size:12px;">
        <thead>
          <tr style="background-color:#1e3a8a; color:#ffffff; font-weight:bold;">
            ${headers.map(h => `<th style="padding:8px; border:1px solid #cbd5e1; white-space:nowrap;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    branches.forEach((b) => {
      tableHtml += `
        <tr>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${b.id}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${b.name}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.type}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.province}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.area || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.status}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${b.rent || 0}</td>
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
          <h2 style="margin:0; color:#1e3a8a;">รายชื่อสาขาทั้งหมดในระบบ STL (SINGER)</h2>
          <p style="margin:5px 0; color:#475569; font-size:12px;">
            จำนวนสาขา: ${branches.length} สาขา | วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}
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
    link.setAttribute('download', `STL_Branches_Report_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6" id="branches-list-container">
      {/* Header and Call to Action buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">รายชื่อสาขา</h2>
          <p className="text-sm font-sans text-secondary mt-1">
            จัดการและดูข้อมูลสัญญาเช่า รายละเอียดสาขาทั้งหมดในระบบ STL
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {userRole !== 'visitor' && (
            <>
              <button
                onClick={() => setShowImportPanel(!showImportPanel)}
                className={`${showImportPanel ? 'bg-[#ea580c] hover:bg-[#d97706]' : 'bg-[#0f172a] hover:bg-[#1e293b]'} text-white border border-transparent text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm`}
                title="ล้างข้อมูลเดโม่และนำเข้าข้อมูลสาขาจากไฟล์ Excel"
              >
                <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
                ล้างข้อมูล & นำเข้า Excel
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-[#166534] hover:bg-[#14532d] text-white border border-[#15803d] text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                ส่งออก Excel
              </button>
              <button
                onClick={onAddBranch}
                className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                เพิ่มสาขา
              </button>
            </>
          )}
        </div>
      </div>

      {/* Excel Setup & Production Reset Panel */}
      {showImportPanel && (
        <div className="bg-white border-2 border-dashed border-primary/30 rounded-xl p-6 shadow-md animate-fade-in flex flex-col gap-5">
          <div className="flex justify-between items-start border-b border-outline-variant pb-3 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary">settings_suggest</span>
                เครื่องมือจัดการข้อมูลระบบ (System Preparation Tool)
              </h3>
              <p className="text-[11px] text-secondary font-sans mt-0.5">
                ล้างข้อมูลตัวอย่างเดโม่ และนำเข้าข้อมูลจริงผ่านไฟล์ Excel เพื่อขึ้นระบบใช้งานจริง (Production Start)
              </p>
            </div>
            <button
              onClick={() => {
                const confirmClear = window.confirm(
                  'คุณต้องการลบข้อมูลตัวอย่างทั้งหมดออกจากระบบใช่หรือไม่? ข้อมูลทั้งหมดจะกลายเป็นศูนย์และไม่สามารถกู้คืนได้'
                );
                if (confirmClear) {
                  if (onClearAllData) {
                    onClearAllData();
                    setImportSuccess('ลบข้อมูลตัวอย่างทั้งหมดเรียบร้อยแล้ว! ระบบพร้อมรองรับข้อมูลจริงแล้ว');
                  } else {
                    alert('ไม่สามารถเคลียร์ข้อมูลได้จากหน้าจอนี้');
                  }
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="ลบข้อมูลสาขาทั้งหมดในระบบ"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              ลบข้อมูล Demo ทั้งหมด
            </button>
          </div>

          {/* Upload Drop Zone & State Banners */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left drop zone */}
            <div className="lg:col-span-7 border-2 border-dashed border-outline-variant rounded-lg p-5 bg-slate-50/50 flex flex-col justify-center items-center text-center relative group min-h-[180px] hover:bg-slate-50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isImporting}
              />
              <span className="material-symbols-outlined text-primary text-4xl mb-2 group-hover:scale-110 transition-transform">
                cloud_upload
              </span>
              <p className="text-xs font-bold text-on-surface">ลากและวาง หรือ คลิกเลือกไฟล์ Excel / CSV</p>
              <p className="text-[10px] text-secondary mt-1 max-w-sm leading-relaxed">
                รองรับไฟล์ตารางข้อมูลประเภท .xlsx, .xls, .csv โดยเมื่ออัปโหลดระบบจะนำมาบันทึกและตั้งค่าใช้งานจริงทันที
              </p>
              {isImporting && (
                <div className="absolute inset-0 bg-white/90 rounded-lg flex flex-col justify-center items-center gap-2 z-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-primary">กำลังประมวลผลและนำเข้าสาขา...</p>
                </div>
              )}
            </div>

            {/* Right Guide text */}
            <div className="lg:col-span-5 bg-[#f8fafc] border border-slate-200 rounded-lg p-4 font-sans text-[11px] text-slate-600 flex flex-col gap-2.5">
              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                คู่มือหัวข้อคอลัมน์ใน Excel ที่รองรับ
              </p>
              <p className="leading-relaxed">
                คอลัมน์ในไฟล์สามารถเขียนเป็นหัวข้อภาษาไทยหรือภาษาอังกฤษ โดยระบบจะตรวจจับโดยอัตโนมัติ:
              </p>
              <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                <li><strong>ชื่อสาขา / ชื่อ</strong> (บังคับระบุ)</li>
                <li><strong>รหัสสาขา</strong> (หากไม่มีระบบจะรัน BR-001, BR-002, ...)</li>
                <li><strong>ประเภทสาขา</strong>, <strong>จังหวัด</strong>, <strong>เขต / โซน</strong>, <strong>ที่อยู่</strong></li>
                <li><strong>วันเริ่มสัญญา</strong>, <strong>วันสิ้นสุดสัญญา</strong></li>
                <li><strong>ค่าเช่ารายเดือน</strong>, <strong>เงินประกัน</strong>, <strong>ค่าเช่าล่วงหน้า</strong></li>
              </ul>
              <div className="bg-primary/5 border border-primary/10 rounded p-2 text-primary leading-normal mt-auto font-medium">
                💡 <strong>หมายเหตุเพิ่มเติม:</strong> ระบบจะทำการรันเลขที่สัญญาเช่าแบบเรียงลำดับให้เรียบร้อย และรายละเอียดอื่นๆ ที่ไม่มีจะถูกตั้งเป็นค่าว่าง (Blank) ให้โดยอัตโนมัติ
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {importError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2 animate-fade-in font-sans">
              <span className="material-symbols-outlined text-red-500 shrink-0">error</span>
              <div>
                <p className="font-bold">เกิดข้อผิดพลาดในการนำเข้า</p>
                <p className="mt-0.5 text-red-700">{importError}</p>
              </div>
            </div>
          )}

          {importSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-start gap-2 animate-fade-in font-sans">
              <span className="material-symbols-outlined text-emerald-600 shrink-0">check_circle</span>
              <div>
                <p className="font-bold">ดำเนินการเสร็จสิ้น!</p>
                <p className="mt-0.5 text-emerald-700">{importSuccess}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced search and dropdown filters row */}
      <div className="bg-white border border-outline-variant p-4 rounded-lg flex flex-wrap gap-4 items-center">
        {/* Input Search */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาสาขา, ที่ตั้ง, หรือผู้จัดการ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-44">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="ปิดปรับปรุง">ปิดปรับปรุง</option>
            <option value="ปิดไม่มีพนักงานขาย">ปิดไม่มีพนักงานขาย</option>
            <option value="เตรียมเปิดสาขา">เตรียมเปิดสาขา</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="w-44">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary"
          >
            <option value="">ประเภททั้งหมด</option>
            {allUniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Building Status Filter */}
        <div className="w-44">
          <select
            value={buildingStatusFilter}
            onChange={(e) => {
              setBuildingStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary"
          >
            <option value="">สถานะอาคารทั้งหมด</option>
            <option value="สัญญาเช่า">สัญญาเช่า</option>
            <option value="Asset Singer">Asset Singer</option>
            <option value="Partner">Partner</option>
          </select>
        </div>

        {/* Phone/Tablet Filter */}
        <div className="w-48">
          <select
            value={phoneTabletFilter}
            onChange={(e) => {
              setPhoneTabletFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary"
          >
            <option value="">กรองตาม Phone/Tablet</option>
            <option value="all_selected">มี Phone/Tablet (ทั้งหมด)</option>
            <option value="Phone">เฉพาะ Phone (มือถือ)</option>
            <option value="Tablet">เฉพาะ Tablet (แท็บเล็ต)</option>
            <option value="none">ไม่มี Phone/Tablet</option>
          </select>
        </div>
      </div>

      {/* Main Branches Data Table Card */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-surface-container-high border-b border-outline-variant">
              <tr className="text-xs text-secondary font-semibold font-sans">
                <th className="py-3 px-4 uppercase tracking-wider">รหัสสาขา</th>
                <th className="py-3 px-4 uppercase tracking-wider">ชื่อสาขา</th>
                <th className="py-3 px-4 uppercase tracking-wider">ประเภทสาขา</th>
                <th className="py-3 px-4 uppercase tracking-wider">สถานะอาคาร</th>
                <th className="py-3 px-4 uppercase tracking-wider">จังหวัด</th>
                <th className="py-3 px-4 uppercase tracking-wider">เขต (Area)</th>
                <th className="py-3 px-4 uppercase tracking-wider">วันเปิดสาขา</th>
                <th className="py-3 px-4 uppercase tracking-wider">วันเริ่ม</th>
                <th className="py-3 px-4 uppercase tracking-wider">วันหมด</th>
                <th className="py-3 px-4 uppercase tracking-wider">สถานะ</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">ค่าเช่า / เดือน</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">เงินประกัน (บาท)</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">ค่าเช่าล่วงหน้า</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">บอกเลิก (วัน)</th>
                <th className="py-3 px-4 uppercase tracking-wider text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-xs font-sans text-on-surface">
              {paginatedBranches.length > 0 ? (
                paginatedBranches.map((branch, index) => {
                  const isZebra = index % 2 === 1;

                  return (
                    <tr
                      key={branch.id}
                      onClick={() => onSelectBranch(branch.id)}
                      className={`border-b border-outline-variant/40 hover:bg-[#F8F9FA] transition-colors group cursor-pointer ${
                        isZebra ? 'bg-[#f8fbfd]' : 'bg-white'
                      }`}
                    >
                      <td className="py-4 px-4 font-semibold text-primary">{branch.id}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-on-surface">{branch.name}</div>
                        {branch.phoneTabletSelected && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-symbols-outlined text-[13px] text-primary">
                              {branch.phoneTabletType === 'Tablet' ? 'tablet_mac' : 'smartphone'}
                            </span>
                            <span className="text-[10px] text-secondary font-semibold bg-surface-container px-1 py-0.5 rounded border border-outline-variant/50">
                              {branch.phoneTabletType || 'Phone'}: {branch.phoneTabletModel || 'ไม่ระบุรุ่น'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-secondary">{branch.type}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          branch.buildingStatus === 'Asset Singer'
                            ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {branch.buildingStatus || 'สัญญาเช่า'}
                        </span>
                      </td>
                      <td className="py-4 px-4">{branch.province}</td>
                      <td className="py-4 px-4 text-secondary">{branch.area || '-'}</td>
                      <td className="py-4 px-4 text-secondary">{branch.openingDate}</td>
                      <td className="py-4 px-4 text-secondary">{branch.startDate}</td>
                      <td className="py-4 px-4 text-secondary">{branch.endDate}</td>
                      <td className="py-4 px-4">
                        {branch.status === 'Active' || branch.status === 'ใช้งานอยู่' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold bg-[#d3f9d8] text-[#2b8a3e] border border-[#a2f2b3]">
                            Active
                          </span>
                        ) : branch.status === 'ปิดปรับปรุง' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold bg-[#fff3bf] text-[#d9480f] border border-[#ffe066]">
                            ปิดปรับปรุง
                          </span>
                        ) : branch.status === 'ปิดไม่มีพนักงานขาย' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold bg-[#f3f0ff] text-[#6f2db8] border border-[#d0bfff]">
                            ปิดไม่มีพนักงานขาย
                          </span>
                        ) : branch.status === 'เตรียมเปิดสาขา' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold bg-[#e7f5ff] text-[#1c7ed6] border border-[#a5d8ff]">
                            เตรียมเปิดสาขา
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold bg-error-container text-primary border border-outline-variant">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-on-surface">
                        {branch.rent ? `฿${branch.rent.toLocaleString()}` : '฿0'}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary">
                        {branch.deposit ? branch.deposit.toLocaleString() : '0'}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary">
                        {branch.advanceRent ? branch.advanceRent.toLocaleString() : '0'}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary">{branch.noticePeriod || '90'}</td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectBranch(branch.id)}
                            className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer"
                            title="ดูรายละเอียดสาขา"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            onClick={() => onEditBranch(branch.id)}
                            className="text-secondary hover:text-amber-700 transition-colors p-1 cursor-pointer"
                            title="แก้ไขข้อมูลสาขา"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`คุณต้องการลบข้อมูลสาขา ${branch.name} หรือไม่?`)) {
                                onDeleteBranch(branch.id);
                              }
                            }}
                            className="text-secondary hover:text-red-700 transition-colors p-1 cursor-pointer"
                            title="ลบสาขา"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-secondary">
                    ไม่พบข้อมูลสาขาที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-4 border-t border-outline-variant bg-surface-bright flex justify-between items-center font-sans text-xs text-on-surface-variant">
          <div>
            แสดง {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, totalItems)} จากทั้งหมด {totalItems} รายการ
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white font-bold'
                      : 'border border-outline-variant hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
