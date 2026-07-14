import { Branch, AuditLog, NotificationItem } from './types';

export const initialBranches: Branch[] = [
  {
    id: "BKK-001",
    name: "สาขาเซ็นทรัลเวิลด์",
    type: "Retail Shoping Mall",
    province: "กรุงเทพมหานคร",
    openingDate: "2020-01-01",
    startDate: "2023-01-01",
    endDate: "2025-12-31",
    status: "Active",
    buildingStatus: "สัญญาเช่า",
    rent: 125000,
    deposit: 250000,
    advanceRent: 125000,
    noticePeriod: 90,
    address: "ศูนย์การค้าเซ็นทรัลเวิลด์ ชั้น 4 โซน Beacon 999/9 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330",
    manager: "คุณสมชาย ใจดี",
    email: "somchai.j@stl.com",
    phone: "02-123-4567",
    area: "เขตปทุมวัน",
    spaceSize: "150 ตร.ม.",
    contractNumber: "CONT-BKK-001-2023",
    landlordName: "บริษัท เซ็นทรัลพัฒนา จำกัด (มหาชน)",
    landlordPhone: "02-667-5555",
    leases: [
      { id: "CONT-BKK-001-2023", startDate: "2023-01-01", endDate: "2025-12-31", rent: 125000, deposit: 250000, advanceRent: 125000, noticePeriod: 90, status: "Active" },
      { id: "CONT-BKK-001-2020", startDate: "2020-01-01", endDate: "2022-12-31", rent: 115000, deposit: 230000, advanceRent: 115000, noticePeriod: 90, status: "Inactive" },
      { id: "CONT-BKK-001-2017", startDate: "2017-01-01", endDate: "2019-12-31", rent: 100000, deposit: 200000, advanceRent: 100000, noticePeriod: 90, status: "Inactive" }
    ]
  },
  {
    id: "BR-001",
    name: "สาขาพระราม 9 (HQ)",
    type: "Retail Store",
    province: "กรุงเทพมหานคร",
    openingDate: "2024-01-01",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "Active",
    buildingStatus: "Asset Singer",
    rent: 45000,
    deposit: 135000,
    advanceRent: 45000,
    noticePeriod: 90,
    address: "เลขที่ 111 อาคารสิงเกอร์ ชั้น 1 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310",
    manager: "คุณวิภาดา รักษา",
    email: "wipada.r@stl.com",
    phone: "02-456-7890",
    area: "เขตห้วยขวาง",
    spaceSize: "80 ตร.ม.",
    contractNumber: "STL-2023-0891",
    landlordName: "บมจ. สิงเกอร์ ประเทศไทย (สำนักงานใหญ่)",
    landlordPhone: "02-350-2000",
    phoneTabletSelected: true,
    phoneTabletNumber: "081-234-5678",
    phoneTabletPackage: "AIS 5G Smart Share 399 บาท/เดือน",
    phoneTabletType: "Tablet",
    phoneTabletModel: "Samsung Galaxy Tab S9 FE (S/N: R52X123456)"
  },
  {
    id: "BR-002",
    name: "สาขาเชียงใหม่ เซ็นเตอร์",
    type: "Retail Shoping Mall",
    province: "เชียงใหม่",
    openingDate: "2024-02-15",
    startDate: "2024-02-15",
    endDate: "2025-02-14",
    status: "ปิดปรับปรุง",
    buildingStatus: "สัญญาเช่า",
    rent: 32500,
    deposit: 97500,
    advanceRent: 32500,
    noticePeriod: 60,
    address: "เซ็นทรัล เชียงใหม่ แอร์พอร์ต ชั้น 2 ถนนมหิดล ตำบลหายยา อำเภอเมือง เชียงใหม่ 50100",
    manager: "คุณสมหญิง รักการงาน",
    email: "somying.r@stl.com",
    phone: "053-123-456",
    area: "อำเภอเมือง",
    spaceSize: "120 ตร.ม.",
    contractNumber: "STL-2023-0892"
  },
  {
    id: "BR-003",
    name: "สาขาพัทยาใต้",
    type: "Direct Sale",
    province: "ชลบุรี",
    openingDate: "2024-03-01",
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    status: "Active",
    buildingStatus: "สัญญาเช่า",
    rent: 28000,
    deposit: 84000,
    advanceRent: 28000,
    noticePeriod: 90,
    address: "เลขที่ 45/9 หมู่ 10 ถนนสุขุมวิท พัทยาใต้ อำเภอบางละมุง ชลบุรี 20150",
    manager: "คุณณัฐพล ศรีคำ",
    email: "nattapol.s@stl.com",
    phone: "038-789-012",
    area: "อำเภอบางละมุง",
    spaceSize: "60 ตร.ม.",
    contractNumber: "STL-2023-0895",
    phoneTabletSelected: true,
    phoneTabletNumber: "089-987-6543",
    phoneTabletPackage: "True Move-H Business 299 บาท/เดือน",
    phoneTabletType: "Phone",
    phoneTabletModel: "Oppo A58 (S/N: OP78129)"
  },
  {
    id: "BR-004",
    name: "สาขาขอนแก่น (เก่า)",
    type: "AIS BUDDY",
    province: "ขอนแก่น",
    openingDate: "2023-01-01",
    startDate: "2023-01-01",
    endDate: "2023-12-31",
    status: "Inactive",
    buildingStatus: "Asset Singer",
    rent: 0,
    deposit: 0,
    advanceRent: 0,
    noticePeriod: 30,
    address: "เลขที่ 98 ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมือง ขอนแก่น 40000",
    manager: "ระบบอัตโนมัติ",
    email: "system@stl.com",
    phone: "043-456-789",
    area: "อำเภอเมือง",
    spaceSize: "50 ตร.ม.",
    contractNumber: "STL-2022-0415"
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: "LOG-001",
    dateTime: "24 ต.ค. 2566 14:30",
    user: "สมชาย ใจดี",
    userInitial: "ส",
    action: "Edit",
    target: "Lease ID: L-2023-045",
    description: "อัปเดตค่าเช่ารายเดือนจาก 15,000 เป็น 15,500 บาท"
  },
  {
    id: "LOG-002",
    dateTime: "24 ต.ค. 2566 11:15",
    user: "สมหญิง รักการงาน",
    userInitial: "ญ",
    action: "Create",
    target: "Branch: สาขาเชียงใหม่",
    description: "เพิ่มข้อมูลสาขาใหม่ในระบบ"
  },
  {
    id: "LOG-003",
    dateTime: "23 ต.ค. 2566 16:45",
    user: "สมชาย ใจดี",
    userInitial: "ส",
    action: "Delete",
    target: "Document: Doc-998",
    description: "ลบเอกสารแนบสัญญาเช่า L-2023-012"
  },
  {
    id: "LOG-004",
    dateTime: "23 ต.ค. 2566 09:20",
    user: "Admin System",
    userInitial: "A",
    action: "Edit",
    target: "System Setting",
    description: "ปรับปรุงอัตราภาษีมูลค่าเพิ่มเป็น 7% (Batch Update)"
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: "NOT-001",
    type: "warning",
    title: "สัญญาเช่าสาขาบางนาหมดอายุใน 30 วัน",
    description: "กรุณาตรวจสอบเงื่อนไขการต่อสัญญา"
  },
  {
    id: "NOT-002",
    type: "success",
    title: "อนุมัติสัญญาเช่าสาขาเชียงใหม่แล้ว",
    description: "อัปเดตระบบเมื่อ 2 ชั่วโมงที่แล้ว"
  },
  {
    id: "NOT-003",
    type: "error",
    title: "เอกสารไม่ครบถ้วน: สาขาภูเก็ต",
    description: "ขาดสำเนาโฉนดที่ดิน"
  }
];
