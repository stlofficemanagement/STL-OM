import React, { useState } from 'react';
import { Branch } from '../types';

interface ReportsViewProps {
  branches: Branch[];
  userRole?: 'admin' | 'visitor' | 'super_admin';
}

export default function ReportsView({ branches, userRole }: ReportsViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Filter branches based on selected status
  const filteredBranches = selectedStatus
    ? branches.filter((b) => {
        if (selectedStatus === 'Active') {
          return b.status === 'Active' || b.status === 'ใช้งานอยู่';
        }
        return b.status === selectedStatus;
      })
    : branches;

  // Aggregate data for reports
  const totalBranches = filteredBranches.length;
  const activeCount = filteredBranches.filter((b) => b.status === 'Active' || b.status === 'ใช้งานอยู่').length;
  const totalRent = filteredBranches.reduce((sum, b) => sum + (b.rent || 0), 0);
  const uniqueProvincesCount = Array.from(new Set(filteredBranches.map((b) => b.province).filter(Boolean))).length;

  // Province-wise distribution summary
  const provinceCounts = filteredBranches.reduce((acc: { [key: string]: number }, b) => {
    acc[b.province] = (acc[b.province] || 0) + 1;
    return acc;
  }, {});

  // Building status distribution summary
  const buildingStatusCounts = filteredBranches.reduce((acc: { [key: string]: number }, b) => {
    const bStatus = b.buildingStatus || 'สัญญาเช่า';
    acc[bStatus] = (acc[bStatus] || 0) + 1;
    return acc;
  }, {});

  const handleExportExcel = () => {
    const worksheetName = 'รายงานสาขาและสัญญาเช่า';
    
    // Columns headers
    const headers = [
      'รหัสสาขา',
      'ชื่อสาขา',
      'ประเภทสาขา',
      'จังหวัด',
      'พื้นที่เขต/อำเภอ',
      'ขนาดพื้นที่',
      'ที่อยู่สาขา',
      'วันเปิดดำเนินการ',
      'วันเริ่มสัญญา',
      'วันสิ้นสุดสัญญา',
      'เลขที่สัญญา',
      'สถานะสาขา',
      'สถานะอาคาร',
      'ค่าเช่ารายเดือน (บาท)',
      'เงินประกันสัญญา (บาท)',
      'ค่าเช่าล่วงหน้า (บาท)',
      'ระยะเวลาแจ้งล่วงหน้า (เดือน)',
      'ชื่อผู้จัดการสาขา',
      'อีเมลติดต่อ',
      'เบอร์โทรศัพท์',
      'เจ้าของพื้นที่เช่า',
      'เบอร์ติดต่อเจ้าของพื้นที่เช่า',
      'เวลาเปิด-ปิดทำการ',
      'ประเภทเครือข่าย',
      'รายละเอียดเครือข่ายอื่นๆ',
      'รายละเอียดเพิ่มเติม Network',
      'ประเภทกล้อง CCTV',
      'จำนวนกล้อง CCTV (ตัว)',
      'รายละเอียดเพิ่มเติม CCTV',
      'ประเภทเครื่องพิมพ์',
      'รายละเอียดเครื่องพิมพ์',
      'มี Phone/Tablet',
      'ประเภทอุปกรณ์ (Phone/Tablet)',
      'รุ่น / ซีเรียลนัมเบอร์ (Phone/Tablet)',
      'เบอร์โทรสาขา (Phone/Tablet)',
      'แพ็กเกจ (Phone/Tablet)',
      'จำนวนสัญญาย่อยทั้งหมด'
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

    filteredBranches.forEach((b) => {
      tableHtml += `
        <tr>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${b.id}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${b.name}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.type}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.province}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.area || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.spaceSize}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.address}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.openingDate}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.startDate}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.endDate}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${b.contractNumber}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.status}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.buildingStatus || 'สัญญาเช่า'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${b.rent || 0}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${b.deposit || 0}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${b.advanceRent || 0}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'0';">${b.noticePeriod || 0}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.manager}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; mso-number-format:'\\@';">${b.email}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; mso-number-format:'\\@';">${b.phone}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.landlordName || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; mso-number-format:'\\@';">${b.landlordPhone || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.operatingHours || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.networkType || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.networkOtherDetail || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.networkDetail || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.cctvType || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'0';">${b.cctvCount || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.cctvDetail || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.printerType || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.printerDetail || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.phoneTabletSelected ? 'มี' : 'ไม่มี'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${b.phoneTabletSelected ? (b.phoneTabletType || 'Phone') : '-'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; mso-number-format:'\\@';">${b.phoneTabletSelected ? (b.phoneTabletModel || '') : '-'}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; mso-number-format:'\\@';">${b.phoneTabletNumber || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${b.phoneTabletPackage || ''}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'0';">${b.leases?.length || 0}</td>
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
          <h2 style="margin:0; color:#1e3a8a;">รายงานสาขาและสัญญาเช่า (SINGER)</h2>
          <p style="margin:5px 0; color:#475569; font-size:12px;">
            ตัวกรองสถานะ: ${selectedStatus || 'ทั้งหมด'} | จำนวนรายการทั้งหมด: ${filteredBranches.length} สาขา | วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}
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
    link.setAttribute('download', `รายงานสาขาและสัญญาเช่า_กรอง_${selectedStatus || 'ทั้งหมด'}_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="reports-view-panel">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">รายงานเชิงลึกและสถิติ</h2>
          <p className="text-sm font-sans text-secondary mt-1">
            รายงานวิเคราะห์ข้อมูลสัญญากับห้างสรรพสินค้า พาร์ทเนอร์ และค่าใช้จ่ายรวมสิงเกอร์ไทยแลนด์
          </p>
        </div>
        {userRole !== 'visitor' && (
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-primary hover:bg-opacity-90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 border border-transparent font-sans"
            title="ส่งออกรายงานและข้อมูลสัญญาเช่าทั้งหมดเป็นไฟล์ Excel"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            ส่งออกข้อมูล Excel
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-outline-variant p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">filter_alt</span>
          <span className="text-sm font-semibold text-on-surface">กรองรายงานตามสถานะการดำเนินงาน:</span>
        </div>
        <div className="w-full sm:w-72 relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded px-3 py-2 pr-10 text-xs font-sans outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="">สถานะทั้งหมด ({branches.length} สาขา)</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="ปิดปรับปรุง">ปิดปรับปรุง</option>
            <option value="ปิดไม่มีพนักงานขาย">ปิดไม่มีพนักงานขาย</option>
            <option value="เตรียมเปิดสาขา">เตรียมเปิดสาขา</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
            expand_more
          </span>
        </div>
      </div>

      {/* Grid summarizing core metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col gap-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider font-sans">จำนวนสาขาในการประเมิน</p>
          <p className="text-4xl font-display font-bold text-primary">{totalBranches} สาขา</p>
          <p className="text-[11px] text-secondary font-sans">จากทั้งหมด {uniqueProvincesCount} จังหวัดที่อยู่ระหว่างดำเนินการ</p>
        </div>

        <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col gap-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider font-sans">อัตราความพร้อมใช้งาน</p>
          <p className="text-4xl font-display font-bold text-green-700">
            {((activeCount / (totalBranches || 1)) * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-secondary font-sans">จำนวน {activeCount} สาขา ใช้งานปกติสมบูรณ์</p>
        </div>

        <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col gap-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider font-sans">ค่าเช่ารวม</p>
          <p className="text-4xl font-display font-bold text-on-surface">
            ฿{totalRent.toLocaleString()}
          </p>
          <p className="text-[11px] text-secondary font-sans">เฉลี่ย ฿{(totalRent / (totalBranches || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })} / สาขา</p>
        </div>
      </div>

      {/* Analysis Section */}
      {totalBranches > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left Block: Province summary */}
          <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">สัดส่วนพื้นที่เช่าแยกรายจังหวัด</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(provinceCounts).map(([prov, count]) => {
                const pct = (count / (totalBranches || 1)) * 100;
                return (
                  <div key={prov} className="flex flex-col gap-1 font-sans">
                    <div className="flex justify-between text-xs font-semibold text-on-surface">
                      <span>{prov}</span>
                      <span>{count} สาขา ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Block: Dynamic visual analysis of branch types */}
          <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">สัดส่วนประเภทสัญญาเช่า</h3>
              <p className="text-xs text-secondary leading-relaxed mb-4 font-sans">
                การกระจายตัวจริงของสัญญาเช่าแยกตามประเภทสาขาในปัจจุบัน (AIS BUDDY, Direct Sale, Store และอื่นๆ)
              </p>
            </div>

            <div className="flex flex-col gap-3 font-sans">
              {Object.entries(
                filteredBranches.reduce((acc: Record<string, number>, b) => {
                  const bType = b.type || 'ไม่ระบุ';
                  acc[bType] = (acc[bType] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([t, count], idx) => {
                  const pct = (count / (totalBranches || 1)) * 100;
                  const colors = [
                    'bg-primary',
                    'bg-emerald-500',
                    'bg-blue-500',
                    'bg-purple-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-slate-500'
                  ];
                  const activeColor = colors[idx % colors.length];
                  return (
                    <div key={t} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 ${activeColor} rounded-full shrink-0`}></span>
                          <span className="truncate max-w-[150px]">{t}</span>
                        </div>
                        <span>{count} สาขา ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div className={`${activeColor} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Block: Building Status analysis */}
          <div className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">สัดส่วนตามสถานะอาคาร</h3>
              <p className="text-xs text-secondary leading-relaxed mb-4 font-sans">
                การแบ่งสัดส่วนการครอบครองพื้นที่ ระหว่างพื้นที่สัญญาเช่า (Lease) และอสังหาริมทรัพย์ของบริษัท (Asset Singer)
              </p>
            </div>

            <div className="flex flex-col gap-4 font-sans">
              {Object.entries(buildingStatusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([statusName, count]) => {
                  const pct = (count / (totalBranches || 1)) * 100;
                  const isAsset = statusName === 'Asset Singer';
                  const colorClass = isAsset ? 'bg-amber-500' : 'bg-blue-500';
                  return (
                    <div key={statusName} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 ${colorClass} rounded-full shrink-0`}></span>
                          <span>{statusName}</span>
                        </div>
                        <span>{count} สาขา ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div className={`${colorClass} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant p-12 rounded-lg shadow-sm flex flex-col items-center justify-center text-center gap-3">
          <span className="material-symbols-outlined text-secondary text-[48px]">info</span>
          <p className="text-base font-bold text-on-surface">ไม่พบข้อมูลสาขาในสถานะนี้</p>
          <p className="text-xs text-secondary max-w-sm">
            กรุณาเลือกสถานะการดำเนินงานอื่นเพื่อเข้าดูรายงานและสถิติ
          </p>
        </div>
      )}
    </div>
  );
}
