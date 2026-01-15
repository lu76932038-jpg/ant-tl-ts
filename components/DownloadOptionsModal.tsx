import React, { useState } from 'react';
import { X, Download, CheckSquare, Square } from 'lucide-react';
import { Product } from '../types';

interface DownloadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

const AVAILABLE_FIELDS = [
    { key: 'sku', label: '产品型号' },
    { key: 'name', label: '产品名称' },
    { key: 'status', label: '库存状态' },
    { key: 'inStock', label: '在库数量' },
    { key: 'available', label: '可用数量' },
    { key: 'inTransit', label: '在途数量' },
];

const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({ isOpen, onClose, products }) => {
    const [selectedFields, setSelectedFields] = useState<string[]>(AVAILABLE_FIELDS.map(f => f.key));

    if (!isOpen) return null;

    const toggleField = (key: string) => {
        if (selectedFields.includes(key)) {
            setSelectedFields(selectedFields.filter(f => f !== key));
        } else {
            setSelectedFields([...selectedFields, key]);
        }
    };

    const toggleAll = () => {
        if (selectedFields.length === AVAILABLE_FIELDS.length) {
            setSelectedFields([]);
        } else {
            setSelectedFields(AVAILABLE_FIELDS.map(f => f.key));
        }
    };

    const handleDownload = () => {
        if (selectedFields.length === 0) return;

        // Generate CSV Header
        const header = selectedFields.map(key => AVAILABLE_FIELDS.find(f => f.key === key)?.label).join(',');

        // Generate CSV Rows
        const rows = products.map(product => {
            return selectedFields.map(key => {
                const value = product[key as keyof Product];
                // Handle potential commas in data by quoting
                return `"${value}"`;
            }).join(',');
        });

        const csvContent = [header, ...rows].join('\n');

        // Create Blob and Download
        // Add BOM for Excel compatibility with UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `备货清单_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">导出选项</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">选择要导出的字段</span>
                        <button
                            onClick={toggleAll}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            {selectedFields.length === AVAILABLE_FIELDS.length ? '取消全选' : '全选'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {AVAILABLE_FIELDS.map((field) => {
                            const isSelected = selectedFields.includes(field.key);
                            return (
                                <button
                                    key={field.key}
                                    onClick={() => toggleField(field.key)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-sm font-medium">{field.label}</span>
                                    {isSelected ? (
                                        <CheckSquare size={18} className="text-blue-600" />
                                    ) : (
                                        <Square size={18} className="text-gray-300" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={selectedFields.length === 0}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            导出 CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadOptionsModal;
