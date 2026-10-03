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
  businessType?: 'kirana' | 'krishi_seva' | 'garment' | 'medical' | 'wine_shop' | 'restaurant' | 'electronics' | 'mall' | 'general';
  operationMode?: 'retail' | 'wholesale' | 'both';
  drugLicenseNo?: string;
  fertilizerLicenseNo?: string;
  seedLicenseNo?: string;
  pesticideLicenseNo?: string;
  fssaiNo?: string;
  exciseLicenseNo?: string;
  logoUrl?: string; // base64 or source url of local store logo
}

export interface ItemBatch {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM or YYYY-MM-DD
  mfgDate?: string; // YYYY-MM or YYYY-MM-DD
  purchasePrice?: number;
  salePrice?: number;
  mrp?: number;
  quantity: number;
}

export interface Item {
  id: string;
  name: string;
  hsn: string;
  purchasePrice: number;
  salePrice: number; // Retail Sale Price
  mrp?: number; // Maximum Retail Price
  wholesalePrice?: number; // Wholesale / Trade Price
  minWholesaleQty?: number; // Minimum Quantity for Wholesale (MOQ)
  boxPackingRatio?: number; // e.g. 1 Box/Bag = X PCS/KGS/LTR
  boxUnit?: string; // "BOX", "BAG", "CASE", "CARTON"
  category?: string;
  brand?: string;
  stockQuantity: number;
  minStockAlert: number;
  gstRate: number; // e.g., 0, 5, 12, 18, 28
  unit: string; // "PCS", "KGS", "BOX", "LIR", "MTR", etc.
  barcodes?: string[];
  batchNumber?: string; // Active/Default batch number (e.g. "B-2026/09")
  expiryDate?: string; // Active/Default expiry date (YYYY-MM-DD or YYYY-MM)
  mfgDate?: string; // Manufacturing date
  batches?: ItemBatch[]; // Multi-batch inventory tracking
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
  creditLimit?: number; // Maximum Credit Limit in ₹
  creditDays?: number; // Payment terms in days (e.g. 15, 30 days)
}

export interface OfferScheme {
  id: string;
  title: string;
  type: 'buy_x_get_y' | 'percentage_discount' | 'flat_discount' | 'bill_slab_discount';
  targetType: 'all' | 'category' | 'brand' | 'item';
  targetValue?: string; // Brand name, Category name, or Item Name/ID
  buyQuantity?: number;
  freeQuantity?: number;
  freeItemId?: string;
  freeItemName?: string;
  discountPercent?: number;
  discountAmount?: number;
  minBillAmount?: number;
  minItemQty?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
}

export interface InvoiceItem {
  itemId: string;
  itemName: string;
  hsn: string;
  quantity: number;
  price: number;
  discount?: number; // Flat discount amount for this line item
  batchNumber?: string; // Batch number for pharmaceutical/FMCG compliance
  expiryDate?: string; // Expiry date (YYYY-MM-DD or YYYY-MM)
  mfgDate?: string;
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
  sourceQuotationId?: string;
  sourceQuotationNumber?: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'converted' | 'rejected' | 'expired';

export interface QuotationItem {
  itemId: string;
  itemName: string;
  hsn: string;
  quantity: number;
  unit: string;
  price: number;
  discount?: number;
  gstRate: number;
  amountBeforeTax: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  partyId: string;
  partyName: string;
  partyGstin: string;
  partyPhone?: string;
  partyEmail?: string;
  partyAddress?: string;
  partyState?: string;
  items: QuotationItem[];
  subtotal: number;
  taxAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  extraCharges?: { title: string; amount: number }[];
  discountAmount?: number;
  totalAmount: number;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  termsAndConditions?: string;
  notes?: string;
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
  quotations?: ModulePermissions;
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
  offers?: OfferScheme[];
  challans?: DeliveryChallan[];
  quotations?: Quotation[];
  users?: UserAccount[];
  transactions: MiscTransaction[];
}

export interface BusinessTypeOption {
  id: 'kirana' | 'krishi_seva' | 'garment' | 'medical' | 'wine_shop' | 'restaurant' | 'electronics' | 'mall' | 'general';
  label: string;
  desc: string;
}

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  { id: "kirana", label: "Kirana & Grocery Provisions (किराणा व सुपरमार्केट)", desc: "Pantry bags, loose & packed grocery foods, weighing scales, and multi-tier rates." },
  { id: "krishi_seva", label: "Krishi Seva Kendra (कृषी सेवा केंद्र - खत/बियाणे/औषधे)", desc: "Fertilizer, seed & pesticide licenses, farmer names, batch/lot tracking, brand schemes." },
  { id: "medical", label: "Medical Store & Pharmacy (औषध दुकान / फार्मसी)", desc: "Drug License (D.L.), batch number, expiry alerts, strip-to-tablet loose dispensing, Schedule H1." },
  { id: "wine_shop", label: "Wine Shop & Liquor Store (वाईन शॉप व लिकर)", desc: "180ml, 375ml, 750ml, Beer bottle sizing, case-to-bottle conversion, excise daily register." },
  { id: "restaurant", label: "Restaurant, Cafe & F&B (रेस्टॉरंट, कॅफे व फूड)", desc: "Table layouts, dine-in vs takeaway, Kitchen Order Tickets (KOT), veg/non-veg modifiers." },
  { id: "garment", label: "Garments, Textiles & Footwear (कपडे व पादत्राणे)", desc: "Size, color, brand, article design codes, fashion matrix barcodes." },
  { id: "electronics", label: "Electronics & Hardware (इलेक्ट्रॉनिक्स व हार्डवेअर)", desc: "Serial & IMEI numbers, warranty tracking, tech components, high-value invoicing." },
  { id: "mall", label: "Supermarket & Departmental Store (सुपरमार्केट / मॉल)", desc: "High-speed multi-counter barcode scanning, section billing, loose & packed catalogs." },
  { id: "general", label: "General Retail & Wholesale Trade (सर्वसाधारण व्यापार)", desc: "Flexible point-of-sale, wholesale & retail dual pricing, custom stock units." }
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
