import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DeadStockConfig: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold text-lg">
                <AlertTriangle className="text-gray-400" size={20} />
                呆滞唤醒配置
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-600">无动销 &gt;</span>
                <span className="font-bold text-gray-900">6 个月</span>
            </div>
            <div className="mt-4 text-xs text-gray-400 flex justify-between">
                <span>最后一次出库</span>
                <span>2023-10-15</span>
            </div>
        </div>
    );
};

export default DeadStockConfig;
