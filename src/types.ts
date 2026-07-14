export interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  depositRef?: string;
  advanceRent: number;
  advanceRentRef?: string;
  noticePeriod: number | string;
  status: 'Active' | 'Inactive' | 'Pending' | string;
  pdfUrl?: string;
  pdfName?: string;
}

export interface Branch {
  id: string;
  name: string;
  type: string;
  province: string;
  openingDate: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Inactive' | 'ปิดปรับปรุง' | 'เตรียมเปิดสาขา' | string;
  buildingStatus?: string;
  rent: number;
  deposit: number;
  depositRef?: string;
  advanceRent: number;
  advanceRentRef?: string;
  noticePeriod: number | string;
  address: string;
  manager: string;
  email: string;
  phone: string;
  operatingHours?: string;
  area?: string;
  spaceSize: string;
  boothCount?: string;
  floorCount?: string;
  contractNumber: string;
  pdfUrl?: string;
  pdfFile?: string;
  leases?: Lease[];
  networkType?: string;
  networkOtherDetail?: string;
  networkDetail?: string;
  cctvType?: string;
  cctvCount?: string;
  cctvDetail?: string;
  printerType?: string;
  printerDetail?: string;
  landlordName?: string;
  landlordPhone?: string;
  signTaxInfo?: string;
  landTaxInfo?: string;
  phoneTabletSelected?: boolean;
  phoneTabletNumber?: string;
  phoneTabletPackage?: string;
  phoneTabletType?: 'Phone' | 'Tablet' | string;
  phoneTabletModel?: string;
  documents?: Array<{ name: string; size: string; date: string }>;
  editHistory?: Array<{
    id: string;
    dateTime: string;
    user: string;
    description: string;
    changes: string;
  }>;
}

export interface AuditLog {
  id: string;
  dateTime: string;
  user: string;
  userInitial: string;
  action: 'Create' | 'Edit' | 'Delete' | string;
  target: string;
  description: string;
}

export interface NotificationItem {
  id: string;
  type: 'warning' | 'success' | 'error';
  title: string;
  description: string;
}

export interface RenewalConsiderationSession {
  id: string;
  name: string;
  createdDate: string;
  startDateFilter?: string;
  endDateFilter?: string;
  branches: Array<{
    branchId: string;
    branchName: string;
    endDate: string;
    rent: number;
    deposit: number;
    advanceRent: number;
    signTaxInfo: string;
    landTaxInfo: string;
    sales: number | '';
    resolution: string;
    previousResolution?: string;
  }>;
}

