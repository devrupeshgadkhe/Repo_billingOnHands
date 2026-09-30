/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digital Munimji Client Service
 * Frontend bridge for Munimji Assistant Drawer, Voice Audio Streaming, and Action Execution.
 */

export interface MunimjiDisplayCard {
  type: "mini_bill" | "price_guide" | "supplier_comparison" | "stock_alert" | "leakage_report" | "test_report";
  title: string;
  data: any;
}

export interface MunimjiResponse {
  intent: "SALES_BILL" | "PURCHASE_BILL" | "PRICE_QUERY" | "SUPPLIER_COMPARISON" | "STOCK_UPDATE" | "BUSINESS_AUDIT" | "SYSTEM_SELF_TEST" | "GENERAL_CHAT";
  userTranscript?: string;
  replyText: string;
  displayCards?: MunimjiDisplayCard[];
  actionPayload?: any;
  keyUsed?: string;
  modelUsed?: string;
  error?: string;
}

export interface PoolStatusResponse {
  totalKeys: number;
  activeKeys: number;
  modelsInRotation: string[];
  currentKeyIndex: number;
  keys: Array<{
    id: string;
    email: string;
    label: string;
    maskedKey: string;
    status: "active" | "cooling_down" | "disabled";
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    lastUsedAt?: string;
    lastError?: string;
  }>;
}

export async function getMunimjiPoolStatus(): Promise<PoolStatusResponse> {
  const res = await fetch("/api/munimji/status");
  if (!res.ok) {
    throw new Error(`Failed to fetch pool status: ${res.statusText}`);
  }
  return await res.json();
}

export async function testMunimjiKeys(): Promise<any> {
  const res = await fetch("/api/munimji/test-keys", {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(`Failed to test keys: ${res.statusText}`);
  }
  return await res.json();
}

export async function sendMunimjiCommand(params: {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  currentScreen?: string;
  language?: "mr" | "hi" | "en";
}): Promise<MunimjiResponse> {
  const res = await fetch("/api/munimji/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "मुनीमजीशी संपर्क करताना त्रुटी आली.");
  }
  return data;
}

export async function executeMunimjiAction(actionType: string, payload: any): Promise<any> {
  const res = await fetch("/api/munimji/execute-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actionType, payload })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "ॲक्शन पूर्ण करताना अडचण आली.");
  }
  return data;
}
