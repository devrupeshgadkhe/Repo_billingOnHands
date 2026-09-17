/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusinessProfile {
  name: string;
  gstin: string;
  address: string;
  state: string;
  phone: string;
  email: string;
  signatureText: string;
  businessType?: 'kirana' | 'garment' | 'mall' | 'electronics' | 'general';
  logoUrl?: string; // base64 or source url of local store logo
}

export interface Item {
  id: string;
  name: string;
  hsn: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  gstRate: number; // e.g., 0, 5, 12, 18, 28
  unit: string; // "PCS", "KGS", "BOX", "LIR", "MTR", etc.
  barcodes?: string[];
}

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  phone: string;
  email: string;
  address: string;
  state: string;
  gstin: string;
  initialBalance: number; // positive = we receive/pay, negative = other way
  currentBalance: number;
}

export interface InvoiceItem {
  itemId: string;
  itemName: string;
  hsn: string;
  quantity: number;
  price: number;
  discount?: number; // Flat discount amount for this line item
  gstRate: number;
  amountBeforeTax: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  partyId: string;
  partyName: string;
  partyGstin: string;
  type: 'sale' | 'purchase' | 'sale_return' | 'purchase_return';
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  extraCharges?: { title: string; amount: number }[]; // Custom multiple extra charges
  totalAmount: number;
  paymentType: 'cash' | 'bank' | 'unpaid';
  paidAmount: number;
  remainingAmount: number;
  notes: string;
  originalInvoiceNumber?: string;
  sourceChallanId?: string;
  sourceChallanNumber?: string;
}

export type ChallanPurpose =
  | 'dispatch'
  | 'approval'
  | 'job_work'
  | 'branch_transfer'
  | 'exhibition'
  | 'other';

export interface DeliveryChallanItem {
  itemId: string;
  itemName: string;
  hsn: string;
  quantity: number;
  unit: string;
  price: number;
  gstRate: number;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  date: string; // YYYY-MM-DD
  partyId: string;
  partyName: string;
  partyGstin: string;
  purpose: ChallanPurpose;
  items: DeliveryChallanItem[];

  // Weights & Packaging
  grossWeight?: number;
  netWeight?: number;
  weightUnit?: string; // "KGS", "TON", "QUINTAL", etc.
  weightSlipNo?: string;
  packageCount?: string; // e.g. "10 Bags", "4 Boxes"

  // Transport & Vehicle details
  vehicleNumber?: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string; // Lorry Receipt / Bilty No
  ewayBillNumber?: string;
  dispatchFrom?: string;
  shipTo?: string;

  // Hamali (Labour/Loading) & Freight Charges
  hamaliCharge?: number;
  hamaliStatus?: 'paid_by_us' | 'to_pay_by_party' | 'not_applicable';
  freightCharge?: number;
  freightStatus?: 'paid_by_us' | 'to_pay_by_party' | 'not_applicable';

  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'pending' | 'converted' | 'cancelled';
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  notes?: string;
}

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  dashboard: ModulePermissions;
  parties: ModulePermissions;
  items: ModulePermissions;
  sales: ModulePermissions;
  purchases: ModulePermissions;
  challans?: ModulePermissions;
  transactions: ModulePermissions;
  reports: ModulePermissions;
  access_control: ModulePermissions;
  settings: ModulePermissions;
}

export interface UserAccount {
  username: string;
  passwordHash: string;
  name: string;
  role: string;
  permissions?: UserPermissions;
}

export interface MiscTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income';
  category: string; // "Rent", "Salary", "Tea & Snacks", "Electricity", "Other Income", etc
  amount: number;
  paymentType: 'cash' | 'bank';
  notes: string;
}

export interface DatabaseState {
  business: BusinessProfile;
  items: Item[];
  parties: Party[];
  invoices: Invoice[];
  challans?: DeliveryChallan[];
  users?: UserAccount[];
  transactions: MiscTransaction[];
}

export interface BusinessTypeOption {
  id: 'kirana' | 'garment' | 'mall' | 'electronics' | 'general';
  label: string;
  desc: string;
}

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  { id: "kirana", label: "Kirana / Grocery Provisions", desc: "Suited for pantry bags, kilogram scales, loose foods, and basic VAT rates." },
  { id: "garment", label: "Garments & Textiles Shop", desc: "Suited for fashion apparel, meters of cloth, style accessories, and 5% GST." },
  { id: "mall", label: "Small Mall / Supermarket", desc: "Fast checkouts, barcode/HSN catalogs, section billing, and diverse units." },
  { id: "electronics", label: "Electrical & Tech Electronics", desc: "Warranty tracking, serial identifiers, tech components, and 18-28% GST." },
  { id: "general", label: "General & Retail Store", desc: "Flexible point-of-sale configuration and generic inventory tracking." }
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export const TAX_RATES = [0, 5, 12, 18, 28];

export const UNITS = ["PCS", "KGS", "BOX", "MTR", "LTR", "BAG", "NOS", "SET"];
