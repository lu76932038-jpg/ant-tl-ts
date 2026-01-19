
export interface ParsedInquiryItem {
  inquiryType: string; // 询价类型 (Default Empty)
  brand: string; // 品牌
  productName: string; // 产品名称
  model: string; // 询价型号
  quantity: string; // 数量 (Changed to string)
  unit: string; // 物料单位
  remarks: string; // 询价备注
  hasDrawing: string; // 是否带图纸 (Default Empty)
  customerMaterialCode: string; // 客户物料编码
  targetPrice: string; // 目标价格
  referenceLeadTime: string; // 参考货期
  expectedDeliveryDate: string; // 期望交期 (yyyy-mm-dd)
  estimatedAnnualUsage: string; // 预计年用量
  customerOrderNumber: string; // 客户订单号
  customerProjectNumber: string; // 客户项目号
}

// Minimal structure expected from AI before we enforce defaults
export interface AIResponseItem {
  brand?: string;
  productName?: string;
  model?: string;
  quantity?: string; // 数量 (Changed to string)
  unit?: string;
  remarks?: string;
  customerMaterialCode?: string;
  targetPrice?: string;
  referenceLeadTime?: string;
  expectedDeliveryDate?: string;
  estimatedAnnualUsage?: string;
  customerOrderNumber?: string;
  customerProjectNumber?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  details?: {
    rawContent: string;
    maskedContent: string;
    aiRawResponse: string;
  };
}

export type FileType = 'excel' | 'word' | 'image' | 'pdf' | 'unknown';

export type AIModel = 'gemini' | 'deepseek';


export interface ExtractedTicket {
  id: string;
  name: string;
  data: Uint8Array;
  zipName: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export enum StockStatus {
  ALL = '全部',
  CRITICAL = '急需补货',
  WARNING = '库存预警',
  HEALTHY = '健康',
  STAGNANT = '呆滞'
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  status: StockStatus;
  inStock: number;
  available: number;
  inTransit: number;
}

export interface FilterStats {
  all: number;
  critical: number;
  warning: number;
  healthy: number;
  stagnant: number;
}

export interface InquiryTask {
  id: string;
  user_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'completed' | 'failed' | 'terminated';
  parsed_result: any;
  raw_content?: any;
  process_logs?: any;
  shared_with: number[];
  error_message?: string;
  completed_at?: string;
  rating?: number;
  comment?: string;
  user_name?: string;
  created_at: string;
  updated_at: string;
}