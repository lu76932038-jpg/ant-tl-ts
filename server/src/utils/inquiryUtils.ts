import { ParsedInquiryItem } from "../types";

export const normalizeInquiryData = (rawData: any[]): ParsedInquiryItem[] => {
    return rawData.map(item => {
        // Normalize keys (handle Chinese keys if present)
        const normalizedItem: any = {};
        const keyMap: { [key: string]: string } = {
            '型号': 'model',
            '规格': 'model',
            '规格说明': 'model',
            '产品名称': 'productName',
            '物料名称': 'productName',
            '数量': 'quantity',
            '采购数量': 'quantity',
            '货期': 'referenceLeadTime',
            '交期': 'expectedDeliveryDate',
            '计划到货日期': 'expectedDeliveryDate',
            '价格': 'targetPrice',
            'goalPrice': 'targetPrice',
            '目标价格': 'targetPrice',
            '单价': 'targetPrice',
            '未税单价': 'targetPrice',
            '含税价': 'targetPrice',
            '含税单价': 'targetPrice',
            '单位': 'unit',
            '主计量': 'unit',
            '物料单位': 'unit',
            '品牌': 'brand',
            '备注': 'remarks',
            '客户物料编码': 'customerMaterialCode',
            '物料编码': 'customerMaterialCode',
            '预计年用量': 'estimatedAnnualUsage',
            '客户订单号': 'customerOrderNumber',
            '源头单据号': 'customerOrderNumber',
            '客户项目号': 'customerProjectNumber'
        };

        // Merge English keys and Chinese keys
        const rawItem = item as any;
        Object.keys(rawItem).forEach(key => {
            const targetKey = keyMap[key] || key;
            normalizedItem[targetKey] = rawItem[key];
        });

        return {
            inquiryType: "",
            brand: normalizedItem.brand || "",
            productName: normalizedItem.productName || "",
            model: normalizedItem.model || "",
            quantity: normalizedItem.quantity !== undefined ? String(normalizedItem.quantity) : "",
            unit: normalizedItem.unit || "",
            remarks: normalizedItem.remarks || "",
            hasDrawing: "",
            customerMaterialCode: normalizedItem.customerMaterialCode || "",
            targetPrice: normalizedItem.targetPrice !== undefined ? String(normalizedItem.targetPrice) : "",
            referenceLeadTime: normalizedItem.referenceLeadTime || "",
            expectedDeliveryDate: normalizedItem.expectedDeliveryDate || "",
            estimatedAnnualUsage: normalizedItem.estimatedAnnualUsage !== undefined ? String(normalizedItem.estimatedAnnualUsage) : "",
            customerOrderNumber: normalizedItem.customerOrderNumber || "",
            customerProjectNumber: normalizedItem.customerProjectNumber || ""
        };
    });
};
