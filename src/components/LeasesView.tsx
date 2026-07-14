import React, { useState } from 'react';
import { Branch } from '../types';

interface LeasesViewProps {
  branches: Branch[];
  onSelectBranch: (id: string) => void;
  userRole?: 'admin' | 'visitor' | 'super_admin';
}

export default function LeasesView({ branches, onSelectBranch, userRole }: LeasesViewProps) {
  const [search, setSearch] = useState('');

  // Extract all leases from branches
  const allLeases = branches.flatMap((b) => {
    const parentLeases = b.leases || [
      {
        id: b.contractNumber || 'CONT-001',
        startDate: b.startDate,
        endDate: b.endDate,
        rent: b.rent,
        deposit: b.deposit,
        depositRef: b.depositRef,
        advanceRent: b.advanceRent,
        advanceRentRef: b.advanceRentRef,
        noticePeriod: b.noticePeriod,
        status: 'Active'
      }
    ];
    return parentLeases.map((l) => ({
      ...l,
      branchId: b.id,
      branchName: b.name,
      province: b.province,
      manager: b.manager
    }));
  });

  const filteredLeases = allLeases.filter((l) =>
    l.id.toLowerCase().includes(search.toLowerCase()) ||
    l.branchName.toLowerCase().includes(search.toLowerCase()) ||
    l.branchId.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportExcel = () => {
    const worksheetName = 'ประวัติข้อมูลสัญญาเช่า';
    const headers = [
      'เลขที่สัญญา',
      'รหัสสาขา',
      'ชื่อสาขา',
      'ผู้ติดต่อสาขา',
      'จังหวัด',
      'วันเริ่มสัญญา',
      'วันสิ้นสุดสัญญา',
      'ค่าเช่ารายเดือน (บาท)',
      'สถานะ'
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

    filteredLeases.forEach((l) => {
      tableHtml += `
        <tr>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@'; font-weight:bold; color:#1e3a8a;">${l.id}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${l.branchId}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${l.branchName}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${l.manager}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${l.province}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${l.startDate}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${l.endDate}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; mso-number-format:'#\\,##0';">${l.rent || 0}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">${l.status === 'Active' ? 'ใช้งานอยู่' : 'หมดอายุ'}</td>
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
          <h2 style="margin:0; color:#1e3a8a;">ประวัติและข้อมูลสัญญาเช่าทั้งหมด (SINGER)</h2>
          <p style="margin:5px 0; color:#475569; font-size:12px;">
            จำนวนรายการสัญญา: ${filteredLeases.length} สัญญา | วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}
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
    link.setAttribute('download', `รายงานสัญญาเช่า_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="leases-view-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-on-surface">ประวัติและข้อมูลสัญญาเช่า</h2>
          <p className="text-sm font-sans text-secondary mt-1">
            รวมศูนย์ข้อมูลสัญญาเช่าพื้นที่ทั้งหมดของ SINGER เพื่อติดตามการต่ออายุ ค่าใช้จ่าย และเงินประกัน
          </p>
        </div>
        {userRole !== 'visitor' && (
          <button
            onClick={handleExportExcel}
            className="bg-[#166534] hover:bg-[#14532d] text-white border border-[#15803d] text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-sm">table_view</span>
            ส่งออก Excel
          </button>
        )}
      </div>

      {/* Searching bar */}
      <div className="bg-white border border-outline-variant p-4 rounded-lg flex gap-4 items-center shadow-sm">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาตามรหัสสัญญา หรือชื่อสาขา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded text-xs font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Leases Table Card */}
      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#F1F3F5] text-xs text-secondary font-semibold border-b border-outline-variant font-sans">
            <tr>
              <th className="p-4">เลขที่สัญญา</th>
              <th className="p-4">สาขา</th>
              <th className="p-4">ผู้ติดต่อสาขา</th>
              <th className="p-4">จังหวัด</th>
              <th className="p-4">วันเริ่มสัญญา</th>
              <th className="p-4">วันสิ้นสุดสัญญา</th>
              <th className="p-4 text-right">ค่าเช่า / เดือน</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-center">ดูรายละเอียด</th>
            </tr>
          </thead>
          <tbody className="text-xs text-on-surface font-sans">
            {filteredLeases.length > 0 ? (
              filteredLeases.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => onSelectBranch(l.branchId)}
                  className="border-b border-outline-variant/30 hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                >
                  <td className="p-4 font-bold text-primary">{l.id}</td>
                  <td className="p-4 font-semibold">{l.branchName} ({l.branchId})</td>
                  <td className="p-4 text-secondary">{l.manager}</td>
                  <td className="p-4">{l.province}</td>
                  <td className="p-4 text-secondary">{l.startDate}</td>
                  <td className="p-4 text-secondary">{l.endDate}</td>
                  <td className="p-4 text-right font-bold text-on-surface">฿{l.rent.toLocaleString()}</td>
                  <td className="p-4">
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
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectBranch(l.branchId)}
                      className="text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-secondary font-medium">
                  ไม่พบข้อมูลสัญญากับพาร์ทเนอร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
