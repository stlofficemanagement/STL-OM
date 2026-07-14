import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Branch, Lease } from '../types';
import { initAuth, googleSignIn, uploadFileToDrive } from '../lib/drive';

export const DEFAULT_BRANCH_TYPES = [
  'AIS BUDDY',
  'Direct Sale',
  'Partner Store (Tuenjai )',
  'Retail Outlet',
  'Retail Store',
  'Sewing Studio',
  'Retail Shoping Mall'
];

export function generateNextContractNumber(branches: Branch[]): string {
  const currentYear = new Date().getFullYear();
  let maxSeq = 890; // Default base sequence matching initialData

  branches.forEach(b => {
    const contractNumbers: string[] = [];
    if (b.contractNumber) contractNumbers.push(b.contractNumber);
    if (b.leases) {
      b.leases.forEach(l => {
        if (l.id) contractNumbers.push(l.id);
      });
    }

    contractNumbers.forEach(cNum => {
      // Look for patterns like STL-YYYY-NNNN
      const match = cNum.match(/STL-\d{4}-(\d+)/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      } else {
        // Look for patterns like STL202607001
        const altMatch = cNum.match(/STL\d{6}(\d+)/);
        if (altMatch) {
          const seq = parseInt(altMatch[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
  });

  const nextSeq = maxSeq + 1;
  return `STL-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
}

function generateNextBranchId(branches: Branch[]): string {
  let maxNum = 0;
  branches.forEach((b) => {
    const match = b.id.match(/^BR-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });
  return `BR-${String(maxNum + 1).padStart(3, '0')}`;
}

interface BranchFormViewProps {
  branchToEdit?: Branch;
  onSave: (branchData: Branch) => void;
  onCancel: () => void;
  branches: Branch[];
}

export default function BranchFormView({
  branchToEdit,
  onSave,
  onCancel,
  branches,
}: BranchFormViewProps) {
  const isEdit = !!branchToEdit;

  // General info states
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Retail Store');
  const [province, setProvince] = useState('กรุงเทพมหานคร');
  const [openingDate, setOpeningDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [buildingStatus, setBuildingStatus] = useState('สัญญาเช่า');
  const [area, setArea] = useState('');
  const [spaceSize, setSpaceSize] = useState('');
  const [boothCount, setBoothCount] = useState('');
  const [floorCount, setFloorCount] = useState('');
  const [address, setAddress] = useState('');

  // Manager & Contact states
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Lease / Financial states
  const [contractNumber, setContractNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rent, setRent] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [depositRef, setDepositRef] = useState('');
  const [advanceRent, setAdvanceRent] = useState(0);
  const [advanceRentRef, setAdvanceRentRef] = useState('');
  const [noticePeriod, setNoticePeriod] = useState<string | number>(90);

  // Landlord & Tax states
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [signTaxInfo, setSignTaxInfo] = useState('');
  const [landTaxInfo, setLandTaxInfo] = useState('');

  // Devices & Network states
  const [networkType, setNetworkType] = useState('AIS');
  const [networkOtherDetail, setNetworkOtherDetail] = useState('');
  const [networkDetail, setNetworkDetail] = useState('');
  const [cctvType, setCctvType] = useState('Robot');
  const [cctvCount, setCctvCount] = useState('1');
  const [cctvDetail, setCctvDetail] = useState('');
  const [printerType, setPrinterType] = useState('Asset');
  const [printerDetail, setPrinterDetail] = useState('');

  // Phone/Tablet states
  const [phoneTabletSelected, setPhoneTabletSelected] = useState(false);
  const [phoneTabletType, setPhoneTabletType] = useState('Phone');
  const [phoneTabletNumber, setPhoneTabletNumber] = useState('');
  const [phoneTabletPackage, setPhoneTabletPackage] = useState('');
  const [phoneTabletModel, setPhoneTabletModel] = useState('');

  // Attached PDF File states (For linking actual PDF)
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [simulatedFileName, setSimulatedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Google Drive integration states
  const [isUploading, setIsUploading] = useState(false);
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

  // Load initial form values
  useEffect(() => {
    if (branchToEdit) {
      setId(branchToEdit.id);
      setName(branchToEdit.name || '');
      setType(branchToEdit.type || 'Retail Store');
      setProvince(branchToEdit.province || 'กรุงเทพมหานคร');
      setOpeningDate(branchToEdit.openingDate || '');
      setStatus(branchToEdit.status || 'Active');
      setBuildingStatus(branchToEdit.buildingStatus || 'สัญญาเช่า');
      setArea(branchToEdit.area || '');
      setSpaceSize(branchToEdit.spaceSize || '');
      setBoothCount(branchToEdit.boothCount || '');
      setFloorCount(branchToEdit.floorCount || '');
      setAddress(branchToEdit.address || '');

      setManager(branchToEdit.manager || '');
      setPhone(branchToEdit.phone || '');
      setEmail(branchToEdit.email || '');

      setContractNumber(branchToEdit.contractNumber || '');
      setStartDate(branchToEdit.startDate || '');
      setEndDate(branchToEdit.endDate || '');
      setRent(branchToEdit.rent || 0);
      setDeposit(branchToEdit.deposit || 0);
      setDepositRef(branchToEdit.depositRef || '');
      setAdvanceRent(branchToEdit.advanceRent || 0);
      setAdvanceRentRef(branchToEdit.advanceRentRef || '');
      setNoticePeriod(branchToEdit.noticePeriod || 90);

      setLandlordName(branchToEdit.landlordName || '');
      setLandlordPhone(branchToEdit.landlordPhone || '');
      setSignTaxInfo(branchToEdit.signTaxInfo || '');
      setLandTaxInfo(branchToEdit.landTaxInfo || '');

      setNetworkType(branchToEdit.networkType || 'AIS');
      setNetworkOtherDetail(branchToEdit.networkOtherDetail || '');
      setNetworkDetail(branchToEdit.networkDetail || '');
      setCctvType(branchToEdit.cctvType || 'Robot');
      setCctvCount(branchToEdit.cctvCount || '1');
      setCctvDetail(branchToEdit.cctvDetail || '');
      setPrinterType(branchToEdit.printerType || 'Asset');
      setPrinterDetail(branchToEdit.printerDetail || '');

      setPhoneTabletSelected(!!branchToEdit.phoneTabletSelected);
      setPhoneTabletType(branchToEdit.phoneTabletType || 'Phone');
      setPhoneTabletNumber(branchToEdit.phoneTabletNumber || '');
      setPhoneTabletPackage(branchToEdit.phoneTabletPackage || '');
      setPhoneTabletModel(branchToEdit.phoneTabletModel || '');

      // Existing PDF if any
      if (branchToEdit.pdfUrl) {
        setPdfUrl(branchToEdit.pdfUrl);
        setSimulatedFileName(branchToEdit.pdfFile || 'เอกสารสัญญาเช่าเดิม.pdf');
      }
    } else {
      // Suggest next sequence IDs for creation
      const nextId = generateNextBranchId(branches);
      const nextContract = generateNextContractNumber(branches);
      setId(nextId);
      setContractNumber(nextContract);

      const todayStr = new Date().toISOString().split('T')[0];
      setOpeningDate(todayStr);
      setStartDate(todayStr);

      const threeYearsLater = new Date();
      threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
      threeYearsLater.setDate(threeYearsLater.getDate() - 1);
      setEndDate(threeYearsLater.toISOString().split('T')[0]);
    }
  }, [branchToEdit, branches]);

  // Handle Drag over
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

    if (!id.trim()) {
      alert('กรุณากรอกรหัสสาขา');
      return;
    }
    if (!name.trim()) {
      alert('กรุณากรอกชื่อสาขา');
      return;
    }
    if (!contractNumber.trim()) {
      alert('กรุณากรอกเลขที่สัญญา');
      return;
    }

    let finalPdfUrl = pdfUrl;
    let finalPdfName = simulatedFileName;

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
          const uploadName = simulatedFileName || `สัญญาเช่าจริง_${name.trim()}_${contractNumber.trim()}.pdf`;
          const result = await uploadFileToDrive(attachedFile, uploadName);
          finalPdfUrl = result.webViewLink;
          finalPdfName = uploadName;
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

    // Active Lease object
    const mainLease: Lease = {
      id: contractNumber.trim(),
      startDate,
      endDate,
      rent: Number(rent) || 0,
      deposit: Number(deposit) || 0,
      depositRef: depositRef.trim(),
      advanceRent: Number(advanceRent) || 0,
      advanceRentRef: advanceRentRef.trim(),
      noticePeriod: noticePeriod || 90,
      status: 'Active',
      // Attach the real PDF name and url
      pdfUrl: finalPdfUrl || undefined,
      pdfName: finalPdfName || undefined
    };

    // Document object list
    const mainDocList = branchToEdit?.documents ? [...branchToEdit.documents] : [];
    if (finalPdfName) {
      // Check if already in documents list, if not, add it
      const hasDoc = mainDocList.some(d => d.name === finalPdfName);
      if (!hasDoc) {
        mainDocList.unshift({
          name: finalPdfName,
          size: attachedFile ? `${(attachedFile.size / (1024 * 1024)).toFixed(1)} MB` : '3.5 MB',
          date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        });
      }
    }

    // Put everything inside the Branch structure
    const updatedBranch: Branch = {
      id: id.trim(),
      name: name.trim(),
      type,
      province,
      openingDate,
      startDate,
      endDate,
      status,
      buildingStatus,
      rent: Number(rent) || 0,
      deposit: Number(deposit) || 0,
      depositRef: depositRef.trim(),
      advanceRent: Number(advanceRent) || 0,
      advanceRentRef: advanceRentRef.trim(),
      noticePeriod: noticePeriod || 90,
      address: address.trim(),
      manager: manager.trim(),
      email: email.trim(),
      phone: phone.trim(),
      area: area.trim(),
      spaceSize: spaceSize.trim() || 'ไม่ระบุ',
      boothCount: boothCount.trim(),
      floorCount: floorCount.trim(),
      contractNumber: contractNumber.trim(),
      
      // Save PDF values
      pdfFile: finalPdfName || undefined,
      pdfUrl: finalPdfUrl || undefined,

      leases: branchToEdit?.leases 
        ? [mainLease, ...branchToEdit.leases.filter(l => l.id !== contractNumber.trim())]
        : [mainLease],
      documents: mainDocList,

      // Save other devices & specs
      networkType,
      networkOtherDetail: networkType === 'อื่นๆ' ? networkOtherDetail.trim() : '',
      networkDetail: networkDetail.trim(),
      cctvType,
      cctvCount,
      cctvDetail: cctvDetail.trim(),
      printerType,
      printerDetail: printerDetail.trim(),

      // Phone Tablet specs
      phoneTabletSelected,
      phoneTabletType: phoneTabletSelected ? phoneTabletType : undefined,
      phoneTabletNumber: phoneTabletSelected ? phoneTabletNumber.trim() : '',
      phoneTabletPackage: phoneTabletSelected ? phoneTabletPackage.trim() : '',
      phoneTabletModel: phoneTabletSelected ? phoneTabletModel.trim() : '',

      // Landlord & Tax info
      landlordName: landlordName.trim(),
      landlordPhone: landlordPhone.trim(),
      signTaxInfo: signTaxInfo.trim(),
      landTaxInfo: landTaxInfo.trim(),

      editHistory: branchToEdit?.editHistory || []
    };

    onSave(updatedBranch);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="branch-form-view-container">
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-white/25 border-t-white rounded-full animate-spin"></div>
          <p className="text-white font-sans text-sm font-bold animate-pulse">กำลังอัปโหลดไฟล์สัญญาเช่าต้นฉบับจริงไปยัง Google Drive...</p>
          <p className="text-white/70 font-sans text-xs">ระบบกำลังประมวลผลความปลอดภัยและสิทธิ์การเข้าถึงไฟล์สาธารณะ กรุณาอย่าปิดหน้านี้</p>
        </div>
      )}
      {/* Top Section Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">
            {isEdit ? `แก้ไขข้อมูลสาขา: ${branchToEdit?.name}` : 'เพิ่มสาขาและสัญญาเช่าใหม่'}
          </h2>
          <p className="text-sm font-sans text-secondary mt-1">
            กรอกรายละเอียด ข้อมูลสาขา พารามิเตอร์ของสัญญาเช่า ตลอดจนรายละเอียด Asset และแนบไฟล์จริงในขั้นตอนเดียว
          </p>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          ยกเลิก
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Main Form Container (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Section 1: ข้อมูลทั่วไปสาขา */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">store</span>
                ข้อมูลทั่วไปสาขา
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                    รหัสสาขา <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEdit}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="เช่น BR-001"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                    ชื่อสาขา <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น สาขาพระราม 9"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">ประเภทสาขา</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary"
                  >
                    {DEFAULT_BRANCH_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">สถานะสาขา</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="ปิดปรับปรุง">ปิดปรับปรุง</option>
                    <option value="ปิดไม่มีพนักงานขาย">ปิดไม่มีพนักงานขาย</option>
                    <option value="เตรียมเปิดสาขา">เตรียมเปิดสาขา</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">สถานะอาคาร</label>
                  <select
                    value={buildingStatus}
                    onChange={(e) => setBuildingStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary"
                  >
                    <option value="สัญญาเช่า">สัญญาเช่า</option>
                    <option value="Asset Singer">Asset Singer</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1 font-sans">วันเปิดสาขา</label>
                  <input
                    type="date"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">เขต (Area / โซน)</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="เช่น เขตพระราม 9"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">จังหวัด</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">ขนาดพื้นที่</label>
                  <input
                    type="text"
                    value={spaceSize}
                    onChange={(e) => setSpaceSize(e.target.value)}
                    placeholder="เช่น 150 ตร.ม."
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">จำนวนคูหา</label>
                  <input
                    type="text"
                    value={boothCount}
                    onChange={(e) => setBoothCount(e.target.value)}
                    placeholder="เช่น 2 คูหา"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">จำนวนชั้น</label>
                  <input
                    type="text"
                    value={floorCount}
                    onChange={(e) => setFloorCount(e.target.value)}
                    placeholder="เช่น 2 ชั้น"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">ที่อยู่ร้านอย่างละเอียด</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="กรอกที่อยู่อย่างละเอียดสำหรับการจัดส่งเอกสารและบอกเลิกสัญญา..."
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ข้อมูลผู้จัดการและติดต่อ */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">contact_mail</span>
                ข้อมูลผู้จัดการสาขาและช่องทางติดต่อ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">ชื่อผู้จัดการ / ผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    placeholder="เช่น คุณสมบัติ ยินดี"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase block mb-1">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น contact@stl.com"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold font-sans outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: อุปกรณ์และ Network ข้อมูล Asset */}
            <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">devices_other</span>
                รายละเอียดอุปกรณ์ Asset และ Network ในร้าน
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Network */}
                <div className="p-4 rounded border border-outline-variant/60 bg-surface flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[18px]">router</span> Network SPEC
                  </h4>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ผู้ให้บริการ</label>
                      <select
                        value={networkType}
                        onChange={(e) => setNetworkType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs outline-none focus:border-primary"
                      >
                        <option value="AIS">AIS</option>
                        <option value="True">True</option>
                        <option value="3BB">3BB</option>
                        <option value="NT">NT</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>

                    {networkType === 'อื่นๆ' && (
                      <div>
                        <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ระบุผู้ให้บริการเพิ่มเติม</label>
                        <input
                          type="text"
                          value={networkOtherDetail}
                          onChange={(e) => setNetworkOtherDetail(e.target.value)}
                          placeholder="กรอกชื่อผู้ให้บริการ..."
                          className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">รายละเอียด Network</label>
                      <textarea
                        rows={1}
                        value={networkDetail}
                        onChange={(e) => setNetworkDetail(e.target.value)}
                        placeholder="เช่น ความเร็ว 1000/500 Mbps, หมายเลขอ้างอิงเราเตอร์..."
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CCTV */}
                <div className="p-4 rounded border border-outline-variant/60 bg-surface flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[18px]">videocam</span> กล้องวงจรปิด (CCTV)
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ประเภท CCTV</label>
                      <select
                        value={cctvType}
                        onChange={(e) => setCctvType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs outline-none focus:border-primary"
                      >
                        <option value="Robot">Robot</option>
                        <option value="IP Camera">IP Camera</option>
                        <option value="Analog">Analog</option>
                        <option value="ไม่มี">ไม่มี</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">จำนวนกล้อง (ตัว)</label>
                      <select
                        value={(() => {
                          const standardCctvCounts = ['NO', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
                          const isCustom = cctvCount && !standardCctvCounts.includes(cctvCount);
                          return isCustom ? 'อื่นๆ' : (cctvCount || '1');
                        })()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'อื่นๆ') {
                            setCctvCount('');
                          } else {
                            setCctvCount(val);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-bold outline-none focus:border-primary"
                      >
                        <option value="NO">NO (ไม่มี)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="13">13</option>
                        <option value="14">14</option>
                        <option value="15">15</option>
                        <option value="16">16</option>
                        <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                      </select>
                    </div>

                    {(() => {
                      const standardCctvCounts = ['NO', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
                      const isCustom = cctvCount && !standardCctvCounts.includes(cctvCount);
                      const isCustomMode = isCustom || cctvCount === '';
                      return isCustomMode && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ระบุจำนวนกล้องเพิ่มเติม</label>
                          <input
                            type="text"
                            value={cctvCount}
                            onChange={(e) => setCctvCount(e.target.value)}
                            placeholder="ระบุจำนวนกล้อง (เช่น 24 หรือ 32)..."
                            className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                          />
                        </div>
                      );
                    })()}

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">รายละเอียดเพิ่มเติม CCTV</label>
                      <input
                        type="text"
                        value={cctvDetail}
                        onChange={(e) => setCctvDetail(e.target.value)}
                        placeholder="เช่น ยี่ห้อ Hikvision, บันทึกย้อนหลังได้ 30 วัน..."
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Printer */}
                <div className="p-4 rounded border border-outline-variant/60 bg-surface flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[18px]">print</span> เครื่องพิมพ์เอกสาร (Printer)
                  </h4>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ประเภท Printer</label>
                      <select
                        value={printerType}
                        onChange={(e) => setPrinterType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs outline-none focus:border-primary"
                      >
                        <option value="Asset">Asset</option>
                        <option value="สัญญาเช่า">สัญญาเช่า</option>
                        <option value="ไม่มี">ไม่มี</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">รายละเอียด Printer</label>
                      <input
                        type="text"
                        value={printerDetail}
                        onChange={(e) => setPrinterDetail(e.target.value)}
                        placeholder="เช่น ยี่ห้อ Brother HL-L2320D, รหัสสินค้า..."
                        className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone & Tablet */}
                <div className="p-4 rounded border border-outline-variant/60 bg-surface flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5 text-primary">
                      <span className="material-symbols-outlined text-[18px]">smartphone</span> อุปกรณ์แท็บเล็ต / มือถือสาขา
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={phoneTabletSelected}
                        onChange={(e) => setPhoneTabletSelected(e.target.checked)}
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      มีใช้งาน
                    </label>
                  </div>

                  {phoneTabletSelected ? (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">ประเภทอุปกรณ์</label>
                        <select
                          value={phoneTabletType}
                          onChange={(e) => setPhoneTabletType(e.target.value)}
                          className="w-full px-2.5 py-1 bg-white border border-outline-variant rounded text-xs outline-none focus:border-primary"
                        >
                          <option value="Phone">Phone (มือถือ)</option>
                          <option value="Tablet">Tablet (แท็บเล็ต)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">เบอร์โทรศัพท์อุปกรณ์</label>
                        <input
                          type="text"
                          value={phoneTabletNumber}
                          onChange={(e) => setPhoneTabletNumber(e.target.value)}
                          placeholder="08X-XXX-XXXX"
                          className="w-full px-2.5 py-1 bg-white border border-outline-variant rounded text-xs font-bold outline-none focus:border-primary"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">รุ่น / Serial Number</label>
                        <input
                          type="text"
                          value={phoneTabletModel}
                          onChange={(e) => setPhoneTabletModel(e.target.value)}
                          placeholder="เช่น Samsung Galaxy Tab A9+ S/N..."
                          className="w-full px-2.5 py-1 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">โปรโมชัน / แพ็กเกจที่ใช้</label>
                        <input
                          type="text"
                          value={phoneTabletPackage}
                          onChange={(e) => setPhoneTabletPackage(e.target.value)}
                          placeholder="เช่น เน็ตความเร็วคงที่ 20Mbps ค่าบริการ 399 บาท..."
                          className="w-full px-2.5 py-1 bg-white border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-4 text-xs font-medium text-secondary/60">
                      ปิดการบันทึกแท็บเล็ต / โทรศัพท์สาขา
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Form Container: Lease params & attachments (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Section 4: พารามิเตอร์เงื่อนไขสัญญาเช่า */}
            <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
                สัญญาเช่า (Active Contract)
              </h3>

              <div className="flex flex-col gap-4 text-xs font-sans">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">
                    เลขที่สัญญาเช่า <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="เช่น STL-2023-0891"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-bold uppercase outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">วันเริ่มสัญญา</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">วันสิ้นสุดสัญญา</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">
                    ค่าเช่ารายเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    value={rent || ''}
                    onChange={(e) => setRent(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-extrabold outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">เงินประกันสัญญา (บาท)</label>
                    <input
                      type="number"
                      value={deposit || ''}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">รหัสอ้างอิงเงินประกัน</label>
                    <input
                      type="text"
                      value={depositRef}
                      onChange={(e) => setDepositRef(e.target.value)}
                      placeholder="เช่น GL-DEP-001"
                      className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">ค่าเช่าล่วงหน้า (บาท)</label>
                    <input
                      type="number"
                      value={advanceRent || ''}
                      onChange={(e) => setAdvanceRent(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">รหัสอ้างอิงค่าเช่าล่วงหน้า</label>
                    <input
                      type="text"
                      value={advanceRentRef}
                      onChange={(e) => setAdvanceRentRef(e.target.value)}
                      placeholder="เช่น GL-ADV-001"
                      className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">
                    ระยะเวลาแจ้งบอกเลิกสัญญาล่วงหน้า
                  </label>
                  <input
                    type="text"
                    value={noticePeriod || ''}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    placeholder="เช่น 90 วัน หรือ 3 เดือน"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: แนบเอกสารสัญญาจริง (Fulfilling PDF requirements) */}
            <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">upload_file</span>
                แนบไฟล์สำเนาสัญญาจริง
              </h3>

              <div className="flex flex-col gap-4 text-xs">
                {/* Google Drive Connection Info */}
                <div className="p-3.5 bg-surface rounded-lg border border-outline-variant/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.43 12.98L14.7 4.76C14.41 4.25 13.86 3.94 13.27 3.94H10.73C10.14 3.94 9.59 4.25 9.3 4.76L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L6.93 18.72C7.22 19.23 7.77 19.54 8.36 19.54H15.64C16.23 19.54 16.78 19.23 17.07 18.72L19.43 14.62C19.72 14.11 19.72 13.49 19.43 12.98Z" fill="#1A73E8"/>
                        <path d="M13.27 3.94H10.73C10.14 3.94 9.59 4.25 9.3 4.76L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L5.87 12.37L10.05 5.12C10.34 4.61 10.89 4.3 11.48 4.3H13.27C13.86 4.3 14.41 4.61 14.7 5.12L15.64 6.75L13.27 3.94Z" fill="#0F9D58"/>
                        <path d="M19.43 12.98L17.07 8.9L14.7 12.98C14.41 13.49 13.86 13.8 13.27 13.8H8.36C7.77 13.8 7.22 13.49 6.93 12.98L4.57 12.98C4.28 13.49 4.28 14.11 4.57 14.62L6.93 18.72C7.22 19.23 7.77 19.54 8.36 19.54H15.64C16.23 19.54 16.78 19.23 17.07 18.72L19.43 14.62C19.72 14.11 19.72 13.49 19.43 12.98Z" fill="#FFC107"/>
                      </svg>
                      <div>
                        <p className="text-[11px] font-bold text-on-surface leading-tight">ระบบจัดเก็บคลาวด์ Google Drive</p>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {googleUser ? `เชื่อมต่อสำเร็จ: ${googleUser.email}` : 'แนบไฟล์จริงขนาดไม่จำกัด (Public Link) ไปยัง Google Drive'}
                        </p>
                      </div>
                    </div>
                    {googleUser ? (
                      <span className="flex items-center gap-1.5 text-[10px] bg-[#2b8a3e]/10 text-[#2b8a3e] px-2.5 py-0.5 rounded-full font-bold">
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
                      className="w-full mt-2 py-2 px-3 bg-white hover:bg-surface border border-outline rounded font-semibold text-xs text-on-surface flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="scale(0.5)"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" transform="scale(0.5)"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" transform="scale(0.5)"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" transform="scale(0.5)"></path>
                      </svg>
                      เชื่อมต่อกับ Google Drive เพื่ออัปโหลดไฟล์จริง
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="flex-1 py-1.5 px-3 bg-white hover:bg-surface border border-outline rounded font-semibold text-[10px] text-secondary text-center cursor-pointer transition-colors"
                      >
                        สลับบัญชี Google (Google Drive)
                      </button>
                    </div>
                  )}
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('branch-form-pdf-file')?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline hover:border-primary hover:bg-surface-container-low'
                  }`}
                >
                  <input
                    id="branch-form-pdf-file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-3xl text-secondary mb-2">
                    picture_as_pdf
                  </span>
                  {simulatedFileName ? (
                    <div className="flex flex-col items-center gap-1 overflow-hidden w-full">
                      <p className="text-xs font-bold text-primary truncate max-w-full px-2" title={simulatedFileName}>
                        {simulatedFileName}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {attachedFile ? `${(attachedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'พร้อมสำหรับการลิงก์จริง'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-on-surface">ลากไฟล์ PDF สัญญาเช่ามาวาง หรือคลิกที่นี่</p>
                      <p className="text-[10px] text-secondary mt-1">ไฟล์แนบจะถูกอัปโหลดขึ้นบัญชี Google Drive อัตโนมัติ โดยมีขนาดจริงและเป็น Public</p>
                    </div>
                  )}
                </div>

                {!simulatedFileName && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-secondary font-medium leading-relaxed">
                      💡 เมื่อทำการอัปโหลดไฟล์ PDF ระบบจะอัปโหลดขึ้น Google Drive เป็นไฟล์สาธารณะ (Public) และแสดงผลเป็นลิงก์เปิดเอกสารโดยตรงในรายละเอียดสาขาโดยไม่ถูกบีบอัดใดๆ
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 6: ข้อมูลผู้ให้เช่าและภาษี */}
            <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary text-xl">gavel</span>
                ข้อมูลผู้ให้เช่าและภาษี
              </h3>

              <div className="flex flex-col gap-3 text-xs font-sans">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">ชื่อเจ้าของพื้นที่ / ผู้ให้เช่า</label>
                  <input
                    type="text"
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="ระบุบริษัท หรือ บุคคลผู้ให้เช่า..."
                    className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">เบอร์ติดต่อ ผู้ให้เช่า</label>
                  <input
                    type="text"
                    value={landlordPhone}
                    onChange={(e) => setLandlordPhone(e.target.value)}
                    placeholder="เช่น 02-XXX-XXXX"
                    className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">ข้อมูลภาษีป้าย</label>
                  <input
                    type="text"
                    value={signTaxInfo}
                    onChange={(e) => setSignTaxInfo(e.target.value)}
                    placeholder="เช่น ผู้ให้เช่าเป็นผู้รับผิดชอบ, ชำระแล้ว..."
                    className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-0.5">ข้อมูลภาษีที่ดิน</label>
                  <input
                    type="text"
                    value={landTaxInfo}
                    onChange={(e) => setLandTaxInfo(e.target.value)}
                    placeholder="เช่น ผู้ให้เช่าเป็นผู้ชำระหลัก..."
                    className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Controls Footer */}
        <div className="flex justify-end gap-3 border-t border-outline-variant pt-4 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-bold rounded transition-colors shadow-sm cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-extrabold rounded transition-colors flex items-center gap-2 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            บันทึกข้อมูลสาขาและสัญญา
          </button>
        </div>
      </form>
    </div>
  );
}
