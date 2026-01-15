import { Type } from "@google/genai";

export const INQUIRY_PROPERTIES = {
    brand: { type: Type.STRING, description: "Brand name / 品牌" },
    productName: { type: Type.STRING, description: "Product name / 产品名称 / 物料名称" },
    model: { type: Type.STRING, description: "Model number or specific type / 询价型号 / 规格说明" },
    quantity: { type: Type.STRING, description: "Quantity / 数量 / 采购数量" },
    unit: { type: Type.STRING, description: "Unit of measurement / 物料单位 / 主计量" },
    remarks: { type: Type.STRING, description: "Any remarks or notes / 询价备注" },
    customerMaterialCode: { type: Type.STRING, description: "Customer material code / 客户物料编码 / 物料编码" },
    targetPrice: { type: Type.STRING, description: "Target price or Unit Price / 目标价格 / 单价 / 含税单价" },
    referenceLeadTime: { type: Type.STRING, description: "Reference lead time / 参考货期" },
    expectedDeliveryDate: { type: Type.STRING, description: "Expected delivery date formatted as YYYY-MM-DD / 期望交期 / 计划到货日期" },
    estimatedAnnualUsage: { type: Type.STRING, description: "Estimated annual usage / 预计年用量" },
    customerOrderNumber: { type: Type.STRING, description: "Customer order number / 客户订单号 / 源头单据号" },
    customerProjectNumber: { type: Type.STRING, description: "Customer project number / 客户项目号" },
};

export const GEMINI_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: INQUIRY_PROPERTIES
    }
};
