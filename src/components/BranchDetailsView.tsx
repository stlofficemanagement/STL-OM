import React, { useState, useEffect } from 'react';
import { Branch } from '../types';
import { downloadFileFromFirestore } from '../lib/fileStorage';

interface BranchDetailsViewProps {
  branch: Branch;
  onBack: () => void;
  onEdit: (id: string) => void;
  onAddLease: (id: string) => void;
  userRole: 'admin' | 'visitor' | 'super_admin';
  onVerifyAction: (actionName: string) => boolean;
}

export default function BranchDetailsView({
  branch,
  onBack,
  onEdit,
  onAddLease,
  userRole,
  onVerifyAction,
}: BranchDetailsViewProps) {
  // Tabs: overview, leases, documents, history
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'documents' | 'history'>('overview');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfName, setSelectedPdfName] = useState('');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);

  const [loadedPdfUrl, setLoadedPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Local logs for this branch
  const recentNotes = [
    { text: 'ต่อสัญญาร้านกาแฟ 3 ปี', sub: '15 ต.ค. 2023 • โดย Admin' },
    { text: 'แก้ไขข้อมูลพื้นที่เช่า A1', sub: '2 ส.ค. 2023 • โดย สมชาย' },
    { text: 'อัปเดตระบบประกันอัคคีภัย', sub: '12 พ.ค. 2023 • โดย สมหญิง' }
  ];

  // Leases list for this branch (custom state or derived)
  const branchLeases = branch.leases && branch.leases.length > 0
    ? branch.leases
    : [
        {
          id: branch.contractNumber || 'CONT-001',
          startDate: branch.startDate,
          endDate: branch.endDate,
          rent: branch.rent,
          deposit: branch.deposit,
          depositRef: branch.depositRef,
          advanceRent: branch.advanceRent,
          advanceRentRef: branch.advanceRentRef,
          noticePeriod: branch.noticePeriod,
          status: 'Active',
          pdfUrl: branch.pdfUrl,
          pdfName: branch.pdfFile
        },
        {
          id: 'CONT-PREV-2021',
          startDate: '2021-01-01',
          endDate: '2022-12-31',
          rent: branch.rent * 0.9,
          deposit: branch.deposit * 0.9,
          advanceRent: branch.advanceRent * 0.9,
          noticePeriod: 90,
          status: 'Expired'
        }
      ];

  // ค้นหาสัญญาเช่าล่าสุดที่มีสถานะใช้งาน (Active) หรือเลือกสัญญาตัวล่าสุดในลิสต์มาแสดงหน้าแรก
  const activeLease = branchLeases.find(l => l.status === 'Active') || branchLeases[0] || null;

  // ดึงข้อมูลเลขที่สัญญา และ ลิงก์ PDF จริงจากตัวสัญญาที่แอดเข้ามา
  const currentContractNumber = activeLease ? activeLease.id : (branch.contractNumber || 'ไม่มีข้อมูลสัญญา');
  const currentPdfUrl = activeLease?.pdfUrl || branch.pdfUrl || null;
  const currentPdfName = activeLease?.pdfName || branch.pdfFile || `สัญญาเช่าพื้นที่_${branch.name}_ฉบับจริง.pdf`;

  useEffect(() => {
    let active = true;
    if (isPdfViewerOpen && currentPdfUrl) {
      if (currentPdfUrl.startsWith('dbfile://')) {
        setIsLoadingPdf(true);
        // Extract the fileId from dbfile://fileId/...
        const fileId = currentPdfUrl.replace('dbfile://', '').split('/')[0];
        downloadFileFromFirestore(fileId)
          .then(objectUrl => {
            if (active) {
              setLoadedPdfUrl(objectUrl);
              setIsLoadingPdf(false);
            }
          })
          .catch(err => {
            console.error("Error loading PDF from Firestore chunks:", err);
            if (active) {
              alert("ไม่สามารถโหลดไฟล์ PDF ได้เนื่องจากข้อผิดพลาด: " + err.message);
              setIsLoadingPdf(false);
            }
          });
      } else {
        setLoadedPdfUrl(currentPdfUrl);
      }
    } else {
      if (loadedPdfUrl && loadedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(loadedPdfUrl);
      }
      setLoadedPdfUrl(null);
      setIsLoadingPdf(false);
    }
    return () => {
      active = false;
    };
  }, [isPdfViewerOpen, currentPdfUrl]);

  // Resolved lease variables for display
  const displayStartDate = activeLease?.startDate || branch.startDate;
  const displayEndDate = activeLease?.endDate || branch.endDate;
  const displayRent = activeLease?.rent !== undefined ? activeLease.rent : branch.rent;
  const displayDeposit = activeLease?.deposit !== undefined ? activeLease.deposit : branch.deposit;
  const displayDepositRef = activeLease?.depositRef || branch.depositRef;
  const displayAdvanceRent = activeLease?.advanceRent !== undefined ? activeLease.advanceRent : branch.advanceRent;
  const displayAdvanceRentRef = activeLease?.advanceRentRef || branch.advanceRentRef;
  const displayNoticePeriod = activeLease?.noticePeriod !== undefined ? activeLease.noticePeriod : branch.noticePeriod;

  const formatNoticePeriod = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === '') return '90 วัน';
    const str = String(val).trim();
    if (/^\d+$/.test(str)) {
      return `${str} วัน`;
    }
    return str;
  };

  // Document list
  const documents = branch.documents && branch.documents.length > 0
    ? branch.documents
    : [
        { name: currentPdfName, size: '4.8 MB', date: activeLease?.startDate || branch.startDate || '15 ม.ค. 2023' },
        { name: 'หนังสือค้ำประกันธนาคาร_ประกันสัญญา.pdf', size: '1.2 MB', date: '20 ม.ค. 2023' },
        { name: 'สำเนาโฉนดที่ดิน_แบบแปลนร้านค้า.pdf', size: '8.5 MB', date: '10 ม.ค. 2023' }
      ];

  // ฟังก์ชันช่วยแปลงชื่อเดือนภาษาไทยเป็นสากล เพื่อให้ new Date() ทำงานได้ไม่พัง
  const parseThaiDateStr = (dateStr: string): string => {
    const thaiMonths: { [key: string]: string } = {
      'ม.ค.': 'Jan', 'ก.พ.': 'Feb', 'มี.ค.': 'Mar', 'เม.ย.': 'Apr',
      'พ.ค.': 'May', 'มิ.ย.': 'Jun', 'ก.ค.': 'Jul', 'ส.ค.': 'Aug',
      'ก.ย.': 'Sep', 'ต.ค.': 'Oct', 'พ.ย.': 'Nov', 'ธ.ค.': 'Dec'
    };
    let cleanStr = dateStr;
    Object.keys(thaiMonths).forEach(thaiMonth => {
      if (cleanStr.includes(thaiMonth)) {
        cleanStr = cleanStr.replace(thaiMonth, thaiMonths[thaiMonth]);
      }
    });
    return cleanStr;
  };

  // ฟังก์ชันคำนวณจำนวนวันคงเหลือสัญญาตามจริง (ปรับปรุงให้ปลอดภัยยิ่งขึ้นและสอดคล้องกับวันเริ่ม วันหมดสัญญาตามสั่ง)
  const calculateRemainingDays = (endDateStr?: string, startDateStr?: string): string => {
    if (!endDateStr) return 'ไม่ระบุ';
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ตรวจสอบว่ามีวันเริ่มสัญญาด้วยไหม เพื่อคำนวณวันคงเหลือสัมพันธ์กัน
      // 1. แปลงวันที่สิ้นสุดสัญญา (ไทย format) ก่อนเข้า new Date
      const formattedEndDateStr = parseThaiDateStr(endDateStr);
      let endDate = new Date(formattedEndDateStr);
      if (isNaN(endDate.getTime())) {
        endDate = new Date(endDateStr);
      }
      endDate.setHours(0, 0, 0, 0);

      // ตรวจสอบว่าแปลงวันที่สำเร็จหรือไม่ (Invalid Date)
      if (isNaN(endDate.getTime())) return 'ไม่ระบุ';

      // 2. ถ้าหากมีวันเริ่มสัญญา สามารถตรวจสอบเพิ่มเติมได้ แต่ระยะเวลาคงเหลือจะอิงกับ "วันนี้" เทียบกับ "วันสิ้นสุดสัญญา"
      // หากวันนี้ยังไม่ถึงวันเริ่มสัญญา ก็ยังแสดงจำนวนวันคงเหลือของสัญญาทั้งหมด (หรือจากวันเริ่มถึงวันหมดอายุ)
      if (startDateStr) {
        const formattedStartDateStr = parseThaiDateStr(startDateStr);
        let startDate = new Date(formattedStartDateStr);
        if (isNaN(startDate.getTime())) {
          startDate = new Date(startDateStr);
        }
        startDate.setHours(0, 0, 0, 0);
        
        // หากต้องการคำนวณวันทั้งหมดของสัญญา หรือจากวันนี้
        if (!isNaN(startDate.getTime()) && today.getTime() < startDate.getTime()) {
          // หากวันนี้ยังไม่ถึงวันเริ่มสัญญา จะนับระยะเวลาจาก วันเริ่มสัญญา ถึง วันสิ้นสุดสัญญา
          const totalTime = endDate.getTime() - startDate.getTime();
          const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24));
          return `ยังไม่เริ่มสัญญา (ระยะสัญญา ${totalDays} วัน)`;
        }
      }

      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return 'หมดอายุแล้ว';
      }
      return `${diffDays} วัน`;
    } catch (e) {
      return 'ไม่ระบุ';
    }
  };

  // ฟังก์ชันสำหรับดาวน์โหลดไฟล์ PDF
  const downloadFile = (url: string, filename: string) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("Failed to download local file:", e);
        // Fallback to open in new tab
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // ฟังก์ชันสำหรับเปิดดูไฟล์ PDF
  const handleOpenPdf = (docName?: string) => {
    const targetPdfName = docName || currentPdfName;
    setSelectedPdfName(targetPdfName);
    setPdfPage(1);
    setIsPdfViewerOpen(true);
  };

  return (
    <div className="flex flex-col gap-6" id="branch-details-container">
      {/* Breadcrumb Navigation Header */}
      <nav aria-label="Breadcrumb" className="flex text-xs font-sans text-secondary">
        <ol className="inline-flex items-center space-x-2">
          <li>
            <button
              onClick={onBack}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              สาขาทั้งหมด
            </button>
          </li>
          <li className="flex items-center">
            <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
            <span className="text-on-surface font-semibold ml-2">{branch.name}</span>
          </li>
        </ol>
      </nav>

      {/* Main Page Title Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-display font-extrabold text-on-surface">{branch.name}</h1>
            {branch.status === 'Active' || branch.status === 'ใช้งานอยู่' ? (
              <span className="bg-[#d3f9d8] border border-[#a2f2b3] text-[#2b8a3e] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2b8a3e] inline-block"></span> Active
              </span>
            ) : branch.status === 'ปิดปรับปรุง' ? (
              <span className="bg-[#fff3bf] border border-[#ffe066] text-[#d9480f] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d9480f] inline-block"></span> ปิดปรับปรุง
              </span>
            ) : branch.status === 'ปิดไม่มีพนักงานขาย' ? (
              <span className="bg-[#f3f0ff] border border-[#d0bfff] text-[#6f2db8] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6f2db8] inline-block"></span> ปิดไม่มีพนักงานขาย
              </span>
            ) : branch.status === 'เตรียมเปิดสาขา' ? (
              <span className="bg-[#e7f5ff] border border-[#a5d8ff] text-[#1c7ed6] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1c7ed6] inline-block"></span> เตรียมเปิดสาขา
              </span>
            ) : (
              <span className="bg-error-container border border-outline-variant text-primary px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Inactive
              </span>
            )}
            {branch.buildingStatus && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border shadow-sm ${
                branch.buildingStatus === 'Asset Singer'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {branch.buildingStatus === 'Asset Singer' ? 'domain' : 'description'}
                </span>
                {branch.buildingStatus}
              </span>
            )}
          </div>
          <p className="text-xs font-sans text-secondary">
            รหัสสาขา: {branch.id} • {branch.province} • ผู้จัดการ: {branch.manager}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (onVerifyAction('แก้ไขข้อมูลสาขา')) {
                onEdit(branch.id);
              }
            }}
            className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            แก้ไขข้อมูล
          </button>
          <button
            onClick={() => {
              if (onVerifyAction('เพิ่มสัญญาเช่าใหม่')) {
                onAddLease(branch.id);
              }
            }}
            className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold py-2 px-4 rounded transition-colors shadow-sm cursor-pointer"
          >
            เพิ่มสัญญาเช่า
          </button>
        </div>
      </div>

      {/* Custom Tab Lists Navigation */}
      <div className="border-b border-outline-variant mb-4">
        <div className="flex gap-6 text-sm font-semibold font-sans">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => setActiveTab('leases')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'leases' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            สัญญาเช่า ({branchLeases.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'documents' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            เอกสาร
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'history' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            ประวัติการแก้ไข ({branch.editHistory?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab Area Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Block: Key Info and map card (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Contact Details Card */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-display font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">info</span> ข้อมูลสาขา
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">ผู้ติดต่อ / ผู้จัดการหลัก</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-semibold text-xs border border-outline-variant">
                        {branch.manager ? branch.manager.substring(0, 2) : 'สม'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{branch.manager || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-secondary">{branch.email || 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">เบอร์โทรศัพท์ติดต่อ</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">call</span>
                      {branch.phone || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Area (หมายเลข)</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">location_city</span>
                      {branch.area || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">วันที่เปิดสาขา</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
                      {branch.openingDate || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">สถานะอาคาร</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">domain</span>
                      {branch.buildingStatus || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">จำนวนคูหา</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">grid_view</span>
                      {branch.boothCount || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">จำนวนชั้น</p>
                    <p className="text-sm text-on-surface flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[18px] text-secondary">layers</span>
                      {branch.floorCount || 'ไม่ระบุ'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">ที่อยู่โดยละเอียด</p>
                  <p className="text-xs text-on-surface font-semibold leading-relaxed mb-4">
                    {branch.address}
                  </p>
                  <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">store</span>
                    <div>
                      <p className="text-xs font-bold text-on-surface">ประเภทสาขา & ขนาดพื้นที่ร้านค้า</p>
                      <p className="text-xs text-secondary">
                        {branch.type} - {branch.spaceSize || 'ขนาด 150 ตร.ม.'}
                        {branch.boothCount && ` • ${branch.boothCount}`}
                        {branch.floorCount && ` • ${branch.floorCount}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Details Card */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-display font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">devices_other</span> รายละเอียด Asset
              </h2>
              
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${branch.phoneTabletSelected ? 'xl:grid-cols-4' : ''} gap-6`}>
                {/* 1. Network */}
                <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[20px]">router</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Network</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-on-surface">
                      {branch.networkType || 'ไม่ระบุ'}
                    </p>
                    {branch.networkType === 'อื่นๆ' && branch.networkOtherDetail && (
                      <p className="text-xs text-secondary mt-1 font-sans font-medium">
                        ระบุผู้ให้บริการ Network อื่นๆ: {branch.networkOtherDetail}
                      </p>
                    )}
                    {branch.networkDetail && (
                      <div className="text-xs text-secondary mt-1.5 font-sans font-medium break-words border-t border-outline-variant/30 pt-1.5">
                        <span className="font-bold block text-[10px] text-secondary/70 uppercase mb-0.5">รายละเอียด Network</span>
                        {branch.networkDetail}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. CCTV */}
                <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                    <span className="text-xs font-bold uppercase tracking-wider">CCTV</span>
                  </div>
                  <div>
                    <div className="flex flex-col gap-1 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] w-fit">
                        ประเภทกล้อง CCTV: {branch.cctvType || 'Robot'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] w-fit">
                        จำนวนกล้อง CCTV: {branch.cctvCount === 'NO' ? 'ไม่มี (NO)' : `${branch.cctvCount || '1'} ตัว`}
                      </span>
                    </div>
                    <div className="text-xs text-secondary font-sans font-medium break-words border-t border-outline-variant/30 pt-1.5">
                      <span className="font-bold block text-[10px] text-secondary/70 uppercase mb-0.5">รายละเอียดเพิ่มเติม CCTV</span>
                      {branch.cctvDetail || 'ไม่มีข้อมูล'}
                    </div>
                  </div>
                </div>

                {/* 3. Printer */}
                <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[20px]">print</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Printer</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-secondary font-bold">Printer:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        branch.printerType === 'สัญญาเช่า' 
                          ? 'bg-[#fff3bf] text-[#d9480f] border border-[#ffe066]' 
                          : 'bg-[#d3f9d8] text-[#2b8a3e] border border-[#a2f2b3]'
                      }`}>
                        {branch.printerType || 'Asset'}
                      </span>
                    </div>
                    <div className="text-xs text-secondary font-sans font-medium break-words border-t border-outline-variant/30 pt-1.5">
                      <span className="font-bold block text-[10px] text-secondary/70 uppercase mb-0.5">รายละเอียด Printer</span>
                      {branch.printerDetail || 'ไม่มีข้อมูล'}
                    </div>
                  </div>
                </div>

                {/* 4. Phone/Tablet */}
                {branch.phoneTabletSelected && (
                  <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-primary">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">
                          {branch.phoneTabletType === 'Tablet' ? 'tablet_mac' : 'smartphone'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider">Phone / Tablet</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase leading-none ${
                        branch.phoneTabletType === 'Tablet'
                          ? 'bg-[#e3fafc] text-[#0b7285] border border-[#c2e7ff]'
                          : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#c2e7ff]'
                      }`}>
                        {branch.phoneTabletType || 'Phone'}
                      </span>
                    </div>
                    <div>
                      {branch.phoneTabletModel && (
                        <div className="mb-2">
                          <p className="text-[10px] text-secondary leading-none mb-1">รุ่น / ซีเรียลนัมเบอร์ (Model & S/N)</p>
                          <p className="text-xs text-on-surface font-semibold font-sans break-words leading-tight">
                            {branch.phoneTabletModel}
                          </p>
                        </div>
                      )}
                      <div className="mb-2 border-t border-outline-variant/30 pt-1.5">
                        <p className="text-[10px] text-secondary leading-none mb-1">เบอร์โทรสาขา (Phone/Tablet)</p>
                        <p className="text-sm font-mono font-bold text-on-surface flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          {branch.phoneTabletNumber || 'ไม่ระบุ'}
                        </p>
                      </div>
                      <div className="border-t border-outline-variant/30 pt-1.5">
                        <p className="text-[10px] text-secondary leading-none mb-1">รายละเอียดแพ็กเกจ (Package)</p>
                        <p className="text-xs text-on-surface font-sans font-medium break-words leading-tight">
                          {branch.phoneTabletPackage || 'ไม่ระบุ'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map view placeholder (Central World Specific styled) */}
            <div className="bg-white border border-outline-variant rounded-lg p-0 overflow-hidden shadow-sm relative h-80 flex flex-col">
              <div className="px-6 py-4 border-b border-outline-variant bg-surface flex justify-between items-center z-10">
                <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">แผนที่ตั้งสาขา</h2>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`)}
                  className="text-primary hover:text-primary-container text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span> ดูใน Google Maps
                </button>
              </div>
              <div className="flex-1 bg-surface-container-highest relative overflow-hidden">
                <img
                  alt="Map view of branch location"
                  className="w-full h-full object-cover opacity-90"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuABQxXt8DF7_Rjh67EY_FTm69W8vVCmd7-IiI1NmryBhkT7loyxkN-3AunOELGayUilsB8wJymr0sR9yzFqkD5SBjziAfk5CgS9Td2PdNH3Oe9kP6S8CEx6B24C_p6VP0tXoyRL8UzjfLQ8Rf8TuGI3n0TCEOH_3mwNVn3ERDm0sqOB9M-yFx-wKvpFQzSvKWeNsOIQLg3sadndU5QWXszZdiyy8CvLZvxyCvWhuOUKvNYWo-lDQqcI66ryH0jj9lmRav8bQ7ZdJXQ"
                />
                {/* Overlay Pin indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative animate-bounce">
                    <span className="material-symbols-outlined text-primary text-4xl drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Financial overview metrics & timeline logs (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Financial Overview stats Card */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-6">
              <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">ข้อมูลทางการเงิน (สรุป)</h2>
              
              <div className="flex flex-col gap-4">
                <div className="p-3 rounded border border-outline-variant bg-surface flex justify-between items-center text-xs">
                  <p className="text-secondary font-medium">เลขที่สัญญา / อ้างอิง</p>
                  <p className="text-on-surface font-bold uppercase">{currentContractNumber}</p>
                </div>

                {/* PDF Lease Attachment Action */}
                <button
                  onClick={() => handleOpenPdf()}
                  className="w-full flex items-center justify-between p-3 rounded border border-[#c2e7ff] bg-[#f4f8ff] text-[#1a73e8] hover:bg-[#e8f0fe] hover:border-[#1a73e8]/30 transition-all text-xs font-semibold group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500 text-[18px]">picture_as_pdf</span>
                    <span>ดูสำเนาสัญญาเช่า PDF</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                </button>

                <div className="p-4 rounded border border-[#ffe066] bg-[#fffbf0] flex flex-col gap-1 shadow-sm">
                  <p className="text-xs text-secondary font-semibold">ค่าเช่าต่อเดือน (บาท)</p>
                  <p className="text-3xl font-display text-primary font-extrabold">
                    ฿{displayRent?.toLocaleString() || '0'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase leading-tight text-ellipsis overflow-hidden whitespace-nowrap">จำนวนวันเหลือสัญญา</p>
                    <p className="text-sm font-display text-on-surface font-extrabold mt-1">
                      {calculateRemainingDays(displayEndDate, displayStartDate)}
                    </p>
                  </div>
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase leading-tight">ระยะเวลาแจ้งบอกเลิกสัญญาล่วงหน้า (วัน)</p>
                    <p className="text-lg font-display text-on-surface font-extrabold mt-1">
                      {formatNoticePeriod(displayNoticePeriod)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase leading-tight">วันเริ่มสัญญา</p>
                    <p className="text-xs font-sans text-on-surface font-bold mt-1">
                      {displayStartDate || 'ไม่ระบุ'}
                    </p>
                  </div>
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase leading-tight">วันสิ้นสุดสัญญา</p>
                    <p className="text-xs font-sans text-on-surface font-bold mt-1">
                      {displayEndDate || 'ไม่ระบุ'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded border border-outline-variant bg-surface flex justify-between items-center text-xs">
                  <p className="text-secondary font-medium">ประเภทสัญญา</p>
                  <p className="text-on-surface font-semibold">สัญญาเช่าพื้นที่เชิงพาณิชย์</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase">เงินประกันสัญญา (บาท)</p>
                    <p className="text-xs text-on-surface font-bold">
                      ฿{displayDeposit?.toLocaleString() || '0'}
                    </p>
                    {displayDepositRef && (
                      <p className="text-[9px] text-[#1a73e8] font-bold bg-[#f4f8ff] border border-[#c2e7ff] px-1.5 py-0.5 rounded mt-1 inline-block w-fit uppercase font-mono tracking-wider">
                        REF: {displayDepositRef}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-secondary uppercase">เงินค่าเช่าล่วงหน้า (บาท)</p>
                    <p className="text-xs text-on-surface font-bold">
                      ฿{displayAdvanceRent?.toLocaleString() || '0'}
                    </p>
                    {displayAdvanceRentRef && (
                      <p className="text-[9px] text-[#1a73e8] font-bold bg-[#f4f8ff] border border-[#c2e7ff] px-1.5 py-0.5 rounded mt-1 inline-block w-fit uppercase font-mono tracking-wider">
                        REF: {displayAdvanceRentRef}
                      </p>
                    )}
                  </div>
                </div>

                {/* Landlord Contact Info */}
                {(branch.landlordName || branch.landlordPhone) && (
                  <div className="border-t border-outline-variant pt-4 mt-2 flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">contact_phone</span>
                      เจ้าของพื้นที่เช่า / ช่องทางการติดต่อ
                    </h3>
                    <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-2 text-xs">
                      {branch.landlordName && (
                        <div>
                          <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">เจ้าของพื้นที่เช่า / ช่องทางการติดต่อ</p>
                          <p className="text-on-surface font-semibold leading-tight">{branch.landlordName}</p>
                        </div>
                      )}
                      {branch.landlordPhone && (
                        <div className={branch.landlordName ? "border-t border-outline-variant/30 pt-2 mt-1" : ""}>
                          <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">เบอร์ติดต่อ เจ้าของพื้นที่เช่า</p>
                          <p className="text-on-surface font-mono font-bold text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            {branch.landlordPhone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tax Information */}
                {(branch.signTaxInfo || branch.landTaxInfo) && (
                  <div className="border-t border-outline-variant pt-4 mt-2 flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">gavel</span>
                      ข้อมูลภาษีป้าย & ข้อมูลภาษีที่ดิน
                    </h3>
                    <div className="p-3 rounded border border-outline-variant bg-surface flex flex-col gap-2 text-xs">
                      {branch.signTaxInfo && (
                        <div>
                          <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">ข้อมูลภาษีป้าย</p>
                          <p className="text-on-surface font-semibold leading-tight">{branch.signTaxInfo}</p>
                        </div>
                      )}
                      {branch.landTaxInfo && (
                        <div className={branch.signTaxInfo ? "border-t border-outline-variant/30 pt-2 mt-1" : ""}>
                          <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">ข้อมูลภาษีที่ดิน</p>
                          <p className="text-on-surface font-semibold leading-tight">{branch.landTaxInfo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note & activity logs Card */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">บันทึกล่าสุด</h2>
                  <button
                    onClick={() => {
                      if (!onVerifyAction('เพิ่มบันทึกข้อความข้อเสนอหรือกิจกรรม')) return;
                      const note = prompt('พิมพ์บันทึกข้อความบันทึกใหม่:');
                      if (note) alert('บันทึกข้อความสำเร็จ!');
                    }}
                    className="text-primary hover:text-primary-container transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  </button>
                </div>

                <div className="relative border-l-2 border-surface-container-highest ml-2 pl-4 flex flex-col gap-5">
                  {recentNotes.map((note, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-white border-2 border-primary rounded-full"></div>
                      <p className="text-xs font-bold text-on-surface">{note.text}</p>
                      <p className="text-[10px] text-secondary mt-0.5">{note.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leases' && (
        <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm animate-fade-in flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">ประวัติสัญญาเช่าทั้งหมด</h3>
            <button
              onClick={() => {
                if (onVerifyAction('เพิ่มสัญญาเช่าใหม่')) {
                  onAddLease(branch.id);
                }
              }}
              className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors cursor-pointer"
            >
              + เพิ่มสัญญาใหม่
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-[#F1F3F5] text-xs text-secondary font-semibold border-b border-outline-variant">
                <tr>
                  <th className="p-3">เลขที่สัญญา</th>
                  <th className="p-3">วันเริ่มสัญญา</th>
                  <th className="p-3">วันสิ้นสุดสัญญา</th>
                  <th className="p-3 text-right">ค่าเช่ารายเดือน</th>
                  <th className="p-3 text-right">เงินประกัน (บาท)</th>
                  <th className="p-3">อ้างอิงเงินประกัน</th>
                  <th className="p-3 text-right">ค่าเช่าล่วงหน้า (บาท)</th>
                  <th className="p-3">อ้างอิงค่าเช่าล่วงหน้า</th>
                  <th className="p-3 text-right">บอกเลิกสัญญาล่วงหน้า</th>
                  <th className="p-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-xs text-on-surface">
                {branchLeases.map((l) => (
                  <tr key={l.id} className="border-b border-outline-variant/30 hover:bg-[#F8F9FA] transition-colors">
                    <td className="p-3 font-semibold text-primary">{l.id}</td>
                    <td className="p-3 text-secondary">{l.startDate}</td>
                    <td className="p-3 text-secondary">{l.endDate}</td>
                    <td className="p-3 text-right font-bold">฿{l.rent.toLocaleString()}</td>
                    <td className="p-3 text-right text-secondary">฿{l.deposit.toLocaleString()}</td>
                    <td className="p-3">
                      {l.depositRef ? (
                        <span className="font-mono text-xs bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded font-semibold uppercase">
                          {l.depositRef}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold">
                      ฿{(l.advanceRent || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {l.advanceRentRef ? (
                        <span className="font-mono text-xs bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded font-semibold uppercase">
                          {l.advanceRentRef}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-secondary">{formatNoticePeriod(l.noticePeriod)}</td>
                    <td className="p-3">
                      {l.status === 'Active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#d3f9d8] text-[#2b8a3e] font-semibold">
                          ใช้งานอยู่
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-error-container text-primary font-semibold">
                          หมดอายุ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm animate-fade-in flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">เอกสารแนบสัญญาเช่า</h3>
            <button
              onClick={() => {
                if (onVerifyAction('อัปโหลดไฟล์เอกสารสัญญา')) {
                  alert('อัปโหลดเอกสารใหม่สำเร็จ');
                }
              }}
              className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors cursor-pointer"
            >
              + อัปโหลดไฟล์
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="p-4 border border-outline-variant rounded-lg hover:border-primary bg-surface-bright flex items-start gap-3 group transition-all cursor-pointer"
                onClick={() => handleOpenPdf(doc.name)}
              >
                <div className="p-2.5 bg-red-100 text-primary rounded shrink-0">
                  <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-secondary mt-1">
                    ขนาด: {doc.size} • อัปเดตเมื่อ: {doc.date}
                  </p>
                </div>
                <button className="text-secondary hover:text-primary transition-colors self-center">
                  <span className="material-symbols-outlined text-sm">download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm animate-fade-in flex flex-col gap-6" id="history-tab-content">
          <div className="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                ประวัติการแก้ไขและเปลี่ยนแปลงข้อมูลสาขา
              </h3>
              <p className="text-xs text-secondary mt-1">
                ระบบจัดเก็บประวัติอัตโนมัติทุกครั้งที่มีการบันทึกการแก้ไขผ่านฟอร์มสาขา
              </p>
            </div>
            <span className="text-xs bg-surface-container-highest border border-outline-variant text-on-surface font-semibold px-3 py-1 rounded-full">
              ทั้งหมด {branch.editHistory?.length || 0} รายการ
            </span>
          </div>

          {(!branch.editHistory || branch.editHistory.length === 0) ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-outline text-4xl">history_toggle_off</span>
              <p className="text-xs font-semibold text-secondary">ยังไม่มีบันทึกประวัติการแก้ไขสำหรับสาขานี้</p>
              <p className="text-[10px] text-outline">เมื่อคุณเริ่มแก้ไขข้อมูลรายละเอียดสาขา ประวัติจะแสดงที่นี่โดยอัตโนมัติ</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-surface-container-highest ml-3 pl-6 flex flex-col gap-6 font-sans">
              {branch.editHistory.map((item) => (
                <div key={item.id} className="relative group bg-surface border border-outline-variant/60 rounded-lg p-4 shadow-2xs hover:border-primary/50 hover:bg-slate-50/40 transition-all">
                  {/* Timeline point indicator */}
                  <div className="absolute -left-[32px] top-5 w-3.5 h-3.5 bg-white border-3 border-primary rounded-full group-hover:scale-110 transition-transform"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                      <span className="text-xs font-bold text-on-surface">{item.user}</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {item.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span className="font-mono">{item.dateTime}</span>
                    </div>
                  </div>

                  <div className="text-xs text-secondary space-y-1.5 pl-1 leading-relaxed">
                    {item.changes.split('\n').map((line, lIdx) => {
                      if (line.startsWith('• ') || line.startsWith('•')) {
                        // Check if bold markdown **...** is present
                        const match = line.match(/^•\s*\*\*(.*?)\*\*:(.*)$/);
                        if (match) {
                          return (
                            <div key={lIdx} className="flex gap-1.5 items-start mt-1">
                              <span className="text-primary mt-1 select-none font-bold">•</span>
                              <span>
                                <strong className="text-on-surface font-semibold">{match[1]}:</strong>
                                <span className="text-secondary ml-1">{match[2]}</span>
                              </span>
                            </div>
                          );
                        }
                      }
                      return (
                        <p key={lIdx} className="text-secondary">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive PDF Viewer Modal */}
      {isPdfViewerOpen && (() => {
        const isActualPdf = selectedPdfName === currentPdfName && currentPdfUrl;
        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6" id="pdf-viewer-overlay">
            <div className="bg-[#2d3238] text-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fade-in" id="pdf-viewer-container">
              {/* Toolbar Header */}
              <div className="bg-[#1e2225] border-b border-[#3e444b] px-4 py-3 flex flex-wrap justify-between items-center gap-3">
                {/* Document Title */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                  <span className="text-sm font-semibold truncate max-w-[240px] md:max-w-md font-sans text-gray-200">
                    {selectedPdfName || `สัญญาเช่าพื้นที่_${branch.name}_ฉบับจริง.pdf`}
                  </span>
                </div>

                {/* Page navigation controls */}
                {isActualPdf ? (
                  <div className="flex items-center bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1 text-xs font-semibold font-sans">
                    <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    เอกสารสัญญาอัปโหลดจริง
                  </div>
                ) : (
                  <div className="flex items-center bg-[#2d3238] rounded-full px-1 py-0.5 border border-[#3e444b] text-xs">
                    <button
                      disabled={pdfPage <= 1}
                      onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                      className="p-1 hover:text-primary-container hover:bg-[#3e444b] rounded-full disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white transition-all cursor-pointer flex items-center justify-center"
                      title="หน้าก่อนหน้า"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <span className="px-3 font-sans font-bold select-none text-gray-300">
                      หน้า {pdfPage} จาก 3
                    </span>
                    <button
                      disabled={pdfPage >= 3}
                      onClick={() => setPdfPage(p => Math.min(3, p + 1))}
                      className="p-1 hover:text-primary-container hover:bg-[#3e444b] rounded-full disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white transition-all cursor-pointer flex items-center justify-center"
                      title="หน้าถัดไป"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}

                {/* Zoom and action controls */}
                <div className="flex items-center gap-4 text-xs">
                  {!isActualPdf && (
                    <div className="flex items-center bg-[#2d3238] rounded border border-[#3e444b] px-1 py-0.5">
                      <button
                        disabled={pdfZoom <= 50}
                        onClick={() => setPdfZoom(z => Math.max(50, z - 25))}
                        className="p-1 hover:bg-[#3e444b] rounded disabled:opacity-40 transition-all cursor-pointer flex items-center"
                        title="ซูมออก"
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="px-2 font-mono font-bold text-gray-300 select-none">{pdfZoom}%</span>
                      <button
                        disabled={pdfZoom >= 150}
                        onClick={() => setPdfZoom(z => Math.min(150, z + 25))}
                        className="p-1 hover:bg-[#3e444b] rounded disabled:opacity-40 transition-all cursor-pointer flex items-center"
                        title="ซูมเข้า"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (isActualPdf && loadedPdfUrl) {
                        downloadFile(loadedPdfUrl, selectedPdfName || 'สัญญาเช่า.pdf');
                      } else {
                        alert(`กำลังเริ่มดาวน์โหลดไฟล์: ${selectedPdfName || 'สัญญาเช่า'}`);
                      }
                    }}
                    className="bg-primary hover:bg-primary/90 text-white rounded px-3 py-1.5 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    title="ดาวน์โหลด PDF"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span className="hidden sm:inline">ดาวน์โหลด</span>
                  </button>

                  <button
                    onClick={() => setIsPdfViewerOpen(false)}
                    className="p-1.5 hover:bg-[#3e444b] rounded-full text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    title="ปิดหน้าต่าง"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Document display viewport */}
              <div className="flex-1 bg-[#1e2225] p-6 overflow-auto flex flex-col items-center">
                {isLoadingPdf ? (
                  <div className="w-full h-[72vh] flex flex-col items-center justify-center gap-3 text-gray-400">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-xs font-semibold animate-pulse">กำลังดึงข้อมูลและประกอบไฟล์สัญญาเช่าจากระบบฐานข้อมูล...</p>
                    <p className="text-[10px] text-gray-500">กรุณารอสักครู่ ระบบกำลังประมวลผลไฟล์ต้นฉบับดั้งเดิม</p>
                  </div>
                ) : isActualPdf ? (
                  <div className="w-full h-full flex flex-col gap-4 p-1" id="actual-pdf-viewport">
                    {/* แถบแจ้งเตือนการดาวน์โหลดและเปิดดูแบบเต็มจอ */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#252a30] border border-[#3e444b] rounded-xl px-5 py-3 text-xs shadow-md">
                      <div className="flex items-center gap-2.5 text-gray-300">
                        <span className="material-symbols-outlined text-[20px] text-primary">info</span>
                        <div className="text-left font-sans">
                          <p className="font-semibold text-gray-200">ระบบแสดงผลสัญญาออนไลน์แบบเรียลไทม์</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">หากหน้าจอไม่แสดงตัวอย่างเอกสารเนื่องจากข้อจำกัดความปลอดภัย สามารถเลือกเปิดดูแท็บใหม่หรือดาวน์โหลดลงเครื่องได้ทันที</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <a
                          href={loadedPdfUrl || currentPdfUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-initial bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-sans font-bold px-4 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                          id="btn-view-fullscreen"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          เปิดแบบเต็มจอ
                        </a>
                        
                        <button
                          onClick={() => {
                            if (loadedPdfUrl) {
                              downloadFile(loadedPdfUrl, selectedPdfName || 'สัญญาเช่า.pdf');
                            } else if (currentPdfUrl) {
                              downloadFile(currentPdfUrl, selectedPdfName || 'สัญญาเช่า.pdf');
                            }
                          }}
                          className="flex-1 md:flex-initial bg-[#2d3238] hover:bg-[#3e444b] text-gray-200 border border-[#4e545b] font-sans text-xs font-bold px-4 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                          id="btn-download-pdf-direct"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          ดาวน์โหลดสัญญา
                        </button>
                      </div>
                    </div>

                    {/* ตัวอย่างเอกสาร PDF */}
                    <div className="flex-1 min-h-[68vh] w-full rounded-xl bg-white border border-[#3e444b] shadow-2xl overflow-hidden relative">
                      {(() => {
                        const targetUrl = loadedPdfUrl || currentPdfUrl || '';
                        const driveIdMatch = targetUrl.match(/\/file\/d\/([^/]+)/);
                        if (driveIdMatch && driveIdMatch[1]) {
                          const embedUrl = `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
                          return (
                            <iframe
                              src={embedUrl}
                              title={selectedPdfName}
                              className="w-full h-full min-h-[68vh] border-0"
                              allow="autoplay"
                              id="actual-pdf-drive-iframe"
                            />
                          );
                        } else {
                          return (
                            <iframe
                              src={targetUrl}
                              title={selectedPdfName}
                              className="w-full h-full min-h-[68vh] border-0"
                              id="actual-pdf-base64-iframe"
                            />
                          );
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div
                    className="transition-all duration-200"
                    style={{
                      transform: `scale(${pdfZoom / 100})`,
                      transformOrigin: 'top center',
                      marginBottom: `${Math.max(0, (pdfZoom - 100) * 4)}px`,
                    }}
                  >
                    {pdfPage === 1 && (
                  <div className="bg-white p-12 text-black shadow-lg rounded-sm relative flex flex-col justify-between leading-relaxed text-left" style={{ width: '595px', minHeight: '842px' }}>
                    {/* Header watermark/seal */}
                    <div className="absolute right-12 top-12 opacity-10 pointer-events-none">
                      <div className="w-24 h-24 rounded-full border-4 border-red-600 flex items-center justify-center text-red-600 font-bold font-sans text-xs rotate-12">
                        SINGER CO., LTD.
                      </div>
                    </div>

                    <div>
                      <div className="text-center border-b border-gray-300 pb-4 mb-6">
                        <h1 className="text-base font-bold font-sans uppercase tracking-wide text-gray-900">หนังสือสัญญาเช่าพื้นที่เพื่อพาณิชย์</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-1">เลขที่เอกสารอ้างอิง: {branch.contractNumber || 'CONT-BKK-001'}</p>
                      </div>

                      <div className="text-[11px] space-y-4 font-sans text-gray-800">
                        <p className="text-right font-medium">ทำขึ้น ณ สำนักงานใหญ่ วันเริ่มสัญญา: {branch.startDate || '01 ม.ค. 2023'}</p>
                        
                        <p className="indent-8 text-justify">
                          สัญญาฉบับนี้ทำขึ้นระหว่าง <span className="font-bold">{branch.landlordName || 'ผู้ให้เช่าตัวแทนอาคาร'}</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้เช่า"</b> ฝ่ายหนึ่ง กับ <b>บริษัท ซิงเกอร์ ประเทศไทย จำกัด (มหาชน)</b> โดย <span className="font-bold">คุณ {branch.manager}</span> ผู้รับมอบอำนาจและผู้จัดการสาขา ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้เช่า"</b> อีกฝ่ายหนึ่ง
                        </p>

                        <p className="indent-8 text-justify">
                          ทั้งสองฝ่ายตกลงยินยอมและทำสัญญาตามข้อกำหนดต่อไปนี้:
                        </p>

                        <div className="space-y-2.5 pl-4">
                          <p>
                            <b>ข้อ 1. วัตถุประสงค์และสถานที่เช่า:</b> ผู้เช่าตกลงเช่า และผู้ให้เช่าตกลงให้เช่าพื้นที่ ณ สถานที่สาขา <span className="font-bold">{branch.name}</span> รหัสสาขา {branch.id} ตั้งอยู่ใน {branch.address || branch.province} เพื่อวัตถุประสงค์ในการทำธุรกิจและจำหน่ายอุปกรณ์เครื่องใช้ไฟฟ้าของแบรนด์ SINGER
                          </p>
                          <p>
                            <b>ข้อ 2. ระยะเวลาการเช่า:</b> สัญญาฉบับนี้มีกำหนดเวลาเช่าระยะยาว เริ่มต้นตั้งแต่วันที่ <span className="font-bold">{branch.startDate || '01 ม.ค. 2566'}</span> และสิ้นสุดลงในวันที่ <span className="font-bold">{branch.endDate || '31 ธ.ค. 2568'}</span>
                          </p>
                          <p>
                            <b>ข้อ 3. อัตราค่าเช่าและการชำระเงิน:</b> ผู้เช่าตกลงจ่ายเงินค่าเช่าในอัตราเดือนละ <span className="font-bold text-red-600">฿{branch.rent?.toLocaleString() || '125,000'} บาท</span> (รวมภาษีมูลค่าเพิ่มและค่าบริการส่วนกลางแล้ว) โดยจะชำระเป็นรายเดือนภายในวันที่ 5 ของทุกๆ เดือน
                          </p>
                          <p>
                            <b>ข้อ 4. เงินประกันความเสียหาย:</b> ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกันการเช่าเป็นจำนวนเงิน <span className="font-bold">฿{branch.deposit?.toLocaleString() || '250,000'} บาท</span> ให้แก่ผู้ให้เช่า ซึ่งผู้ให้เช่าจะคืนให้เมื่อสัญญาสิ้นสุดลงโดยไม่มีความเสียหายใดๆ เกิดขึ้น
                          </p>
                          <p>
                            <b>ข้อ 5. การแจ้งบอกเลิกสัญญาล่วงหน้า:</b> หากคู่สัญญาฝ่ายใดฝ่ายหนึ่งมีความประสงค์จะยกเลิกสัญญา หรือไม่ต่ออายุสัญญา จะต้องแจ้งให้อีกฝ่ายทราบล่วงหน้าไม่น้อยกว่า <span className="font-bold text-primary">{formatNoticePeriod(branch.noticePeriod)}</span> เป็นลายลักษณ์อักษร
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6 mt-6 animate-fade-in">
                      <p className="text-[9px] text-gray-400 text-center mb-4 font-sans">หน้า 1 / 3 - เพื่อใช้เป็นหลักฐานในการควบคุมของฝ่ายบริหารสาขาและระบบควบคุมคลังพัสดุ</p>
                      <div className="grid grid-cols-2 gap-8 text-center text-[10px] font-sans">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-gray-500 mb-8 text-center">ลงชื่อ ...................................................... ผู้ให้เช่า</p>
                          <p className="font-bold">({branch.landlordName || 'ผู้ให้เช่าอาคาร'})</p>
                          <p className="text-gray-400 text-[8px] mt-0.5">พยานฝั่งเจ้าของพื้นที่</p>
                        </div>
                        <div className="flex flex-col items-center justify-center relative">
                          <div className="absolute right-4 top-2 pointer-events-none opacity-40">
                            <div className="w-16 h-16 rounded-full border border-dashed border-blue-600 flex items-center justify-center text-blue-600 font-bold font-sans text-[8px] rotate-6 flex-col">
                              <span>SINGER GROUP</span>
                              <span>APPROVED</span>
                            </div>
                          </div>
                          <p className="text-gray-500 mb-8 text-center">ลงชื่อ ...................................................... ผู้เช่า</p>
                          <p className="font-bold">(คุณ {branch.manager})</p>
                          <p className="text-gray-400 text-[8px] mt-0.5">ผู้รับมอบอำนาจ บมจ. ซิงเกอร์ ประเทศไทย</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pdfPage === 2 && (
                  <div className="bg-white p-12 text-black shadow-lg rounded-sm relative flex flex-col justify-between leading-relaxed text-left" style={{ width: '595px', minHeight: '842px' }}>
                    <div>
                      <div className="text-center border-b border-gray-300 pb-4 mb-6">
                        <h1 className="text-base font-bold font-sans uppercase tracking-wide text-gray-900">เอกสารแนบท้าย: รายการทรัพย์สินและสิ่งอำนวยความสะดวก</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-1">รหัสสาขาอ้างอิง: {branch.id} • สาขา {branch.name}</p>
                      </div>

                      <div className="text-[11px] space-y-4 font-sans text-gray-800">
                        <p className="indent-8">
                          ผู้ให้เช่าและผู้เช่าตกลงร่วมกันนับและตรวจสอบรายการทรัพย์สิน อุปกรณ์เครือข่าย และความปลอดภัยที่ติดตั้งอยู่ ณ วันเริ่มต้นสัญญาเช่า และส่งมอบสิทธิ์ดูแลให้แก่ผู้จัดการสาขา ดังรายการรายละเอียดต่อไปนี้:
                        </p>

                        <div className="overflow-hidden border border-gray-300 rounded mt-4">
                          <table className="w-full text-left text-[10px] font-sans border-collapse">
                            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                              <tr>
                                <th className="p-2 border-r border-gray-300">ประเภทอุปกรณ์ (Asset Type)</th>
                                <th className="p-2 border-r border-gray-300">คุณสมบัติ / รายละเอียดเทคนิค</th>
                                <th className="p-2 text-right">จำนวน</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              <tr>
                                <td className="p-2 border-r border-gray-300 font-bold">1. ระบบเครือข่ายสื่อสาร (Network)</td>
                                <td className="p-2 border-r border-gray-300 text-gray-600">
                                  ประเภท: {branch.networkType || 'ไม่ระบุ'}<br />
                                  รายละเอียด: {branch.networkDetail || 'ไม่มีข้อมูลเพิ่มเติม'}
                                </td>
                                <td className="p-2 text-right">1 วงจร</td>
                              </tr>
                              <tr>
                                <td className="p-2 border-r border-gray-300 font-bold">2. กล้องวงจรปิดรักษาความปลอดภัย</td>
                                <td className="p-2 border-r border-gray-300 text-gray-600">
                                  ประเภทกล้อง: {branch.cctvType || 'Robot'}<br />
                                  รายละเอียดเพิ่มเติม: {branch.cctvDetail || 'ใช้งานครอบคลุมพื้นที่'}
                                </td>
                                <td className="p-2 text-right">{branch.cctvCount === 'NO' ? 'ไม่มี (NO)' : `${branch.cctvCount || '1'} ตัว`}</td>
                              </tr>
                              <tr>
                                <td className="p-2 border-r border-gray-300 font-bold">3. อุปกรณ์จัดพิมพ์เอกสาร (Printer)</td>
                                <td className="p-2 border-r border-gray-300 text-gray-600">
                                  สิทธิ์ครอบครอง: {branch.printerType || 'Asset'}<br />
                                  รายละเอียด: {branch.printerDetail || 'เครื่องพิมพ์เอกสารกลางประจำสาขา'}
                                </td>
                                <td className="p-2 text-right">1 เครื่อง</td>
                              </tr>
                              <tr>
                                <td className="p-2 border-r border-gray-300 font-bold">4. โทรศัพท์และแท็บเล็ตประจำสาขา</td>
                                <td className="p-2 border-r border-gray-300 text-gray-600 text-left">
                                  {branch.phoneTabletSelected ? (
                                    <>
                                      ประเภท: {branch.phoneTabletType || 'Phone'}<br />
                                      รุ่น / ซีเรียล: {branch.phoneTabletModel || 'ไม่ระบุรุ่น'}<br />
                                      เบอร์ติดต่อ: {branch.phoneTabletNumber || 'ไม่ระบุ'}<br />
                                      แพ็กเกจ: {branch.phoneTabletPackage || 'ไม่ระบุ'}
                                    </>
                                  ) : (
                                    'ไม่มีการจัดสรรโทรศัพท์ / แท็บเล็ตส่วนกลาง'
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  {branch.phoneTabletSelected ? '1 เครื่อง' : '0 เครื่อง'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <p className="indent-8 text-gray-600 mt-4 text-justify">
                          อุปกรณ์ทั้งหมดข้างต้นอยู่ในสภาพพร้อมใช้งานอย่างสมบูรณ์ และมีระบบสนับสนุนจากผู้รับเหมารายย่อยที่ระบุไว้ในรายละเอียด ในกรณีชำรุดจากการเสื่อมสภาพตามอายุการใช้งาน ฝ่ายผู้ให้เช่าตกลงร่วมประสานงานช่างบริการเข้าซ่อมแซมอย่างเร่งด่วนภายใน 48 ชั่วโมง
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <p className="text-[9px] text-gray-400 text-center font-sans">หน้า 2 / 3 - เพื่อใช้เป็นรายการสิทธิ์ครอบครองทรัพย์สินและการตรวจสอบครุภัณฑ์</p>
                    </div>
                  </div>
                )}

                {pdfPage === 3 && (
                  <div className="bg-white p-12 text-black shadow-lg rounded-sm relative flex flex-col justify-between leading-relaxed text-left" style={{ width: '595px', minHeight: '842px' }}>
                    <div>
                      <div className="text-center border-b border-gray-300 pb-4 mb-6">
                        <h1 className="text-base font-bold font-sans uppercase tracking-wide text-gray-900">เอกสารแนบท้าย: รายละเอียดภาษีและการบอกกล่าว</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-1">รหัสสาขาอ้างอิง: {branch.id} • สาขา {branch.name}</p>
                      </div>

                      <div className="text-[11px] space-y-4 font-sans text-gray-800">
                        <p className="indent-8">
                          เพื่อความเป็นระเบียบเรียบร้อยและถูกต้องตามหลักเกณฑ์ทางกฎหมายและสรรพากร คู่สัญญาทั้งสองฝ่ายได้ตกลงระบุเงื่อนไขการรับผิดชอบด้านภาษีและข้อมูลการบอกกล่าวร้องทุกข์ ดังรายละเอียดด้านล่าง:
                        </p>

                        <div className="space-y-3.5 pl-4 mt-4">
                          <p>
                            <b>1. ภาษีโรงเรือนและที่ดิน / ภาษีที่ดินและสิ่งปลูกสร้าง:</b> ผู้ให้เช่าตกลงที่จะเป็นผู้รับผิดชอบในการยื่นแบบแสดงรายการและชำระภาษีที่ดินและสิ่งปลูกสร้างตามกฎหมายกำหนด โดยไม่มีสิทธิ์เรียกร้องค่าใช้จ่ายนี้เพิ่มเติมจากผู้เช่า เว้นแต่จะได้ตกลงกันไว้เป็นอย่างอื่นเป็นลายลักษณ์อักษร
                          </p>
                          <p>
                            <b>2. ภาษีป้ายโฆษณาและเครื่องหมายการค้า:</b> ผู้เช่า (บมจ. ซิงเกอร์ ประเทศไทย) จะเป็นผู้รับผิดชอบในการดำเนินการและเสียภาษีป้ายทั้งหมดสำหรับป้ายชื่อร้าน ป้ายโฆษณาแบรนด์ และป้ายโปรโมชั่นต่างๆ ที่ผู้เช่านำมาติดตั้งในพื้นที่เช่าตามกรอบระเบียบทางเทศบาล/สำนักงานเขต
                          </p>
                          <p>
                            <b>3. ข้อมูลภาษีที่ระบุในระบบบริหารสัญญา:</b><br />
                            - ข้อมูลภาษีป้าย: <span className="font-medium text-gray-900">{branch.signTaxInfo || 'ไม่ระบุข้อมูล'}</span><br />
                            - ข้อมูลภาษีที่ดิน: <span className="font-medium text-gray-900">{branch.landTaxInfo || 'ไม่ระบุข้อมูล'}</span>
                          </p>
                          <p>
                            <b>4. เงื่อนไขระยะเวลาการบอกกล่าวล่วงหน้า (Notice Period):</b> ในกรณีที่คู่สัญญาฝ่ายใดมีความประสงค์จะบอกเลิกสัญญาก่อนครบกำหนดระยะเวลาเช่า คู่สัญญาฝ่ายนั้นตกลงที่จะส่งหนังสือแจ้งเตือนบอกเลิกสัญญาให้อีกฝ่ายทราบล่วงหน้าไม่น้อยกว่า <span className="font-bold text-red-600">{formatNoticePeriod(branch.noticePeriod)}</span> หากไม่ปฏิบัติตามจะต้องจ่ายค่าชดเชยหรือริบเงินประกันสัญญากึ่งหนึ่ง
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <p className="text-[9px] text-gray-400 text-center font-sans">หน้า 3 / 3 - เอกสารสำคัญลำดับท้าย สำหรับตรวจสอบการชำระบัญชีและการคืนเงินมัดจำความเสียหาย</p>
                    </div>
                  </div>
                )}
              </div>
                )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
