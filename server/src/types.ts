export interface AIResponseItem {
    brand?: string;
    productName?: string;
    model?: string;
    quantity?: string;
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

export interface ParsedInquiryItem extends AIResponseItem {
    inquiryType: string;
    hasDrawing: string;
}


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
