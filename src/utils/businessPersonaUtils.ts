/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessProfile, Item, RestaurantTable } from "../types";

export interface BusinessPersonaPreset {
  id: 'restaurant' | 'medical' | 'garment' | 'kirana' | 'electronics' | 'krishi_seva' | 'general';
  name: string;
  badge: string;
  iconName: string;
  themeColor: string;
  tagline: string;
  profileOverrides: Partial<BusinessProfile>;
  sampleItems: Partial<Item>[];
  sampleTables?: RestaurantTable[];
  suggestedTab: string;
}

export const RESTAURANT_TABLES_PRESET: RestaurantTable[] = [
  {
    id: "tbl_1",
    tableNumber: "T-1",
    section: "AC Dining",
    capacity: 4,
    status: "available",
    currentOrderTotal: 0
  },
  {
    id: "tbl_2",
    tableNumber: "T-2",
    section: "AC Dining",
    capacity: 6,
    status: "available",
    currentOrderTotal: 0
  },
  {
    id: "tbl_3",
    tableNumber: "T-3",
    section: "Main Hall",
    capacity: 4,
    status: "occupied",
    currentOrderId: "kot_running_3",
    currentOrderTotal: 380,
    runningItemsSummary: "2x Paneer Chilli, 1x Veg Biryani"
  },
  {
    id: "tbl_4",
    tableNumber: "T-4",
    section: "Main Hall",
    capacity: 2,
    status: "available",
    currentOrderTotal: 0
  },
  {
    id: "tbl_5",
    tableNumber: "T-5",
    section: "Family Section",
    capacity: 8,
    status: "reserved",
    currentOrderTotal: 0
  },
  {
    id: "tbl_6",
    tableNumber: "T-6",
    section: "Garden / Terrace",
    capacity: 4,
    status: "available",
    currentOrderTotal: 0
  }
];

export const BUSINESS_PERSONA_PRESETS: Record<string, BusinessPersonaPreset> = {
  restaurant: {
    id: "restaurant",
    name: "Royal Spice Restaurant & Cafe",
    badge: "Restaurant & Cafe",
    iconName: "UtensilsCrossed",
    themeColor: "amber",
    tagline: "Table management, Kitchen Order Tickets (KOT), and dining billing",
    profileOverrides: {
      businessType: "restaurant",
      name: "Royal Spice Restaurant & Cafe",
      fssaiNo: "11524001000982",
      signatureText: "For Royal Spice Restaurant & Cafe",
      defaultBillingMode: "gst",
      defaultGstSlab: 5
    },
    sampleTables: RESTAURANT_TABLES_PRESET,
    sampleItems: [
      {
        id: "food_1",
        name: "Paneer Butter Masala",
        category: "Main Course",
        hsn: "2106",
        purchasePrice: 110,
        salePrice: 220,
        stockQuantity: 50,
        minStockAlert: 10,
        gstRate: 5,
        unit: "PLATE"
      },
      {
        id: "food_2",
        name: "Veg Dum Biryani",
        category: "Rice & Biryani",
        hsn: "2106",
        purchasePrice: 90,
        salePrice: 180,
        stockQuantity: 45,
        minStockAlert: 10,
        gstRate: 5,
        unit: "PLATE"
      },
      {
        id: "food_3",
        name: "Butter Garlic Naan",
        category: "Breads",
        hsn: "1905",
        purchasePrice: 15,
        salePrice: 45,
        stockQuantity: 100,
        minStockAlert: 20,
        gstRate: 5,
        unit: "PCS"
      },
      {
        id: "food_4",
        name: "Masala Dosa with Sambar",
        category: "South Indian / Breakfast",
        hsn: "2106",
        purchasePrice: 35,
        salePrice: 90,
        stockQuantity: 60,
        minStockAlert: 15,
        gstRate: 5,
        unit: "PLATE"
      },
      {
        id: "food_5",
        name: "Cold Coffee with Ice Cream",
        category: "Beverages",
        hsn: "2202",
        purchasePrice: 30,
        salePrice: 85,
        stockQuantity: 80,
        minStockAlert: 15,
        gstRate: 5,
        unit: "CUP"
      },
      {
        id: "food_6",
        name: "Packaged Drinking Water 1L",
        category: "Beverages",
        hsn: "2201",
        purchasePrice: 12,
        salePrice: 20,
        stockQuantity: 120,
        minStockAlert: 24,
        gstRate: 18,
        unit: "BTL",
        barcodes: ["8901234005011", "WATER-1L-01"]
      }
    ],
    suggestedTab: "tables"
  },
  medical: {
    id: "medical",
    name: "Sanjivani Medico & Healthcare",
    badge: "Pharmacy & Medical",
    iconName: "Cross",
    themeColor: "emerald",
    tagline: "Drug License, batch & expiry management, and prescription POS",
    profileOverrides: {
      businessType: "medical",
      name: "Sanjivani Medico & Healthcare",
      drugLicenseNo: "MH-TZ2-20B-99812 / 21B-99813",
      signatureText: "For Sanjivani Medico & Healthcare (Reg. Pharmacist)",
      defaultBillingMode: "gst",
      defaultGstSlab: 12
    },
    sampleItems: [
      {
        id: "med_1",
        name: "Dolo 650mg Paracetamol Tablets",
        category: "Antipyretics / Pain Relief",
        brand: "Micro Labs",
        hsn: "3004",
        purchasePrice: 24.5,
        salePrice: 34.0,
        mrp: 35.0,
        stockQuantity: 150,
        minStockAlert: 20,
        gstRate: 12,
        unit: "STRIP",
        batchNumber: "DL-2026-X4",
        expiryDate: "2027-11-30",
        barcodes: ["8901148210015", "MED-DOLO-650"]
      },
      {
        id: "med_2",
        name: "Azithromycin 500mg Tablets",
        category: "Antibiotics",
        brand: "Cipla",
        hsn: "3004",
        purchasePrice: 62.0,
        salePrice: 89.0,
        mrp: 95.0,
        stockQuantity: 60,
        minStockAlert: 10,
        gstRate: 12,
        unit: "STRIP",
        batchNumber: "AZ-9921-A",
        expiryDate: "2028-05-31",
        barcodes: ["8901117102004", "MED-AZI-500"]
      },
      {
        id: "med_3",
        name: "Ascoril-D Cough Syrup 100ml",
        category: "Syrup & Suspensions",
        brand: "Glenmark",
        hsn: "3004",
        purchasePrice: 85.0,
        salePrice: 120.0,
        mrp: 128.0,
        stockQuantity: 40,
        minStockAlert: 10,
        gstRate: 12,
        unit: "BTL",
        batchNumber: "AS-332",
        expiryDate: "2026-11-15",
        barcodes: ["8901023004018"]
      }
    ],
    suggestedTab: "items"
  },
  garment: {
    id: "garment",
    name: "Vogue Trends Apparel & Footwear",
    badge: "Garments & Textiles",
    iconName: "Shirt",
    themeColor: "indigo",
    tagline: "Size, color, brand, and clothing barcode matrix",
    profileOverrides: {
      businessType: "garment",
      name: "Vogue Trends Apparel & Footwear",
      signatureText: "For Vogue Trends Apparel & Footwear",
      defaultBillingMode: "gst",
      defaultGstSlab: 5
    },
    sampleItems: [
      {
        id: "gar_1",
        name: "Men's Slim Fit Cotton Shirt - Navy (Size 40/L)",
        category: "Men's Formal",
        brand: "Louis Philippe",
        hsn: "6205",
        purchasePrice: 750,
        salePrice: 1499,
        mrp: 1799,
        stockQuantity: 30,
        minStockAlert: 5,
        gstRate: 5,
        unit: "PCS",
        barcodes: ["GAR-SHIRT-NAVY-40", "890700100201"]
      },
      {
        id: "gar_2",
        name: "Men's Stretch Denim Jeans - Dark Indigo (Size 32)",
        category: "Men's Casual",
        brand: "Levi's 511",
        hsn: "6203",
        purchasePrice: 1200,
        salePrice: 2299,
        mrp: 2699,
        stockQuantity: 25,
        minStockAlert: 5,
        gstRate: 12,
        unit: "PCS",
        barcodes: ["GAR-JEANS-32-IND"]
      }
    ],
    suggestedTab: "items"
  },
  electronics: {
    id: "electronics",
    name: "Apex Electro-Tech Systems",
    badge: "Electronics & Tech",
    iconName: "Zap",
    themeColor: "blue",
    tagline: "Serial numbers, IMEI tracking, and warranty billing",
    profileOverrides: {
      businessType: "electronics",
      name: "Apex Electro-Tech Systems",
      signatureText: "For Apex Electro-Tech Systems",
      defaultBillingMode: "gst",
      defaultGstSlab: 18
    },
    sampleItems: [
      {
        id: "elec_1",
        name: "43\" 4K Ultra HD Smart LED TV",
        category: "Consumer Electronics",
        brand: "Sony Bravia",
        hsn: "8528",
        purchasePrice: 28000,
        salePrice: 38990,
        mrp: 44990,
        stockQuantity: 8,
        minStockAlert: 2,
        gstRate: 18,
        unit: "UNIT",
        barcodes: ["SONY-TV-43-4K", "8903332001192"]
      },
      {
        id: "elec_2",
        name: "Wireless Ergonomic Mouse",
        category: "Computer Accessories",
        brand: "Logitech",
        hsn: "8471",
        purchasePrice: 650,
        salePrice: 1099,
        mrp: 1295,
        stockQuantity: 35,
        minStockAlert: 5,
        gstRate: 18,
        unit: "PCS",
        barcodes: ["LOGI-MOUSE-M331"]
      }
    ],
    suggestedTab: "sales"
  },
  kirana: {
    id: "kirana",
    name: "Shree Krishna Kirana & Provisions",
    badge: "Kirana & Grocery",
    iconName: "ShoppingBag",
    themeColor: "emerald",
    tagline: "Loose weighing scale items, multi-tier wholesale/retail pricing, and multi-barcode scanning",
    profileOverrides: {
      businessType: "kirana",
      name: "Shree Krishna Kirana & Provisions",
      fssaiNo: "11522002000341",
      signatureText: "For Shree Krishna Kirana & Provisions",
      defaultBillingMode: "gst",
      defaultGstSlab: 5
    },
    sampleItems: [
      {
        id: "kir_1",
        name: "Premium Kolam Steamed Rice (Loose)",
        category: "Grains & Rice",
        hsn: "1006",
        purchasePrice: 48,
        salePrice: 65,
        wholesalePrice: 58,
        minWholesaleQty: 25,
        stockQuantity: 450,
        minStockAlert: 50,
        gstRate: 5,
        unit: "KGS",
        barcodes: ["KIR-KOLAM-RICE"]
      },
      {
        id: "kir_2",
        name: "Fortune Refined Sunflower Oil 1L Pouch",
        category: "Edible Oil",
        brand: "Fortune",
        hsn: "1512",
        purchasePrice: 118,
        salePrice: 145,
        wholesalePrice: 135,
        minWholesaleQty: 10,
        stockQuantity: 80,
        minStockAlert: 15,
        gstRate: 5,
        unit: "LTR",
        barcodes: ["8906007281010", "KIR-OIL-1L"]
      }
    ],
    suggestedTab: "sales"
  }
};
