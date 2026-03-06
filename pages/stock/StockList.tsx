
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StockStatus, Product } from '../../types';
import { MOCK_PRODUCTS } from './mockData';
import { Download, Eye, ChevronLeft, ChevronRight, ChevronDown, ShieldCheck, AlertTriangle, History, Sparkles, Heart } from 'lucide-react';
import DownloadOptionsModal from '../../components/DownloadOptionsModal';
import ShipProductModal from '../../components/ShipProductModal';
import { api } from '../../services/api';

const StockList: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<StockStatus>(StockStatus.ALL);
    const [pageSize, setPageSize] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [selectedProductForShip, setSelectedProductForShip] = useState<Product | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [favoritedSkus, setFavoritedSkus] = useState<Set<string>>(new Set());
    // 是否只显示收藏
    const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
    // 全局各状态统计（服务端返回，跨页准确）
    const [globalStats, setGlobalStats] = useState<Record<string, number>>({});

    // 初始化时从后端拉取收藏
    const fetchFavorites = async () => {
        try {
            const response: any = await api.get('/stocks/favorites');
            setFavoritedSkus(new Set(response.favorites || []));
        } catch (error) {
            console.error('Failed to fetch favorites:', error);
        }
    };

    const fetchStocks = async () => {
        try {
            setIsLoading(true);

            const queryParams: any = {
                page: currentPage,
                pageSize: pageSize,
                status: activeFilter,
                search: searchTerm
            };

            // 收藏跨页筛选
            if (showFavoriteOnly) {
                if (favoritedSkus.size > 0) {
                    // 传递收藏的 SKU 给后端
                    queryParams.favoriteSkus = Array.from(favoritedSkus).map(s => s.trim()).join(',');
                } else {
                    setProducts([]);
                    setTotalItems(0);
                    setTotalPages(0);
                    setIsLoading(false);
                    return;
                }
            }

            // 使用 axios 的 params 传参，自动处理序列化
            const response: any = await api.get('/stocks', { params: queryParams });

            setProducts(response.items || []);
            setTotalItems(response.total || 0);
            setTotalPages(response.totalPages || 1);
            if (response.statusStats) {
                setGlobalStats(response.statusStats);
            }

        } catch (error) {
            console.error('Failed to fetch stocks:', error);
        } finally {
            setIsLoading(false);
        }
    };


    // 初始化加载
    React.useEffect(() => {
        fetchFavorites();
    }, []);

    // 依赖变化时触发重新获取
    React.useEffect(() => {
        fetchStocks();
    }, [currentPage, pageSize, activeFilter, showFavoriteOnly, favoritedSkus]);

    // 搜索 debounce
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchStocks();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleUpdateInStock = async (product: Product, value: string) => {
        const newValue = parseInt(value, 10);
        if (isNaN(newValue) || newValue < 0) {
            setEditingId(null);
            return;
        }

        if (newValue === product.inStock) {
            setEditingId(null);
            return;
        }

        try {
            await api.put(`/stocks/${product.id}`, { inStock: newValue });
            setProducts(prev => prev.map(p =>
                p.id === product.id ? { ...p, inStock: newValue } : p
            ));
            setEditingId(null);
        } catch (error) {
            console.error('Failed to update stock:', error);
        }
    };

    const openShipModal = (product: Product) => {
        setSelectedProductForShip(product);
        setIsShipModalOpen(true);
    };

    const handleShipProduct = async (data: any) => {
        try {
            await api.post('/shiplist', data);
            fetchStocks();
            setIsShipModalOpen(false);
            setSelectedProductForShip(null);
        } catch (error) {
            console.error('Failed to ship product:', error);
            throw error;
        }
    };

    // 切换收藏状态 (调用后端)
    const handleToggleFavorite = async (sku: string) => {
        const trimmedSku = sku.trim();
        try {
            const response: any = await api.post('/stocks/toggle-favorite', { sku: trimmedSku });
            const { isFavorited } = response;

            setFavoritedSkus(prev => {
                const next = new Set(prev);
                if (isFavorited) {
                    next.add(trimmedSku);
                } else {
                    next.delete(trimmedSku);
                }
                return next;
            });
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };



    const stats = useMemo(() => {
        return {
            // 优先使用服务端全局统计，key 与数据库 status 字段（中文）对应
            all: globalStats.total ?? totalItems,
            critical: globalStats['急需补货'] ?? 0,
            warning: globalStats['库存预警'] ?? 0,
            healthy: globalStats['健康'] ?? 0,
            stagnant: globalStats['呆滞'] ?? 0,
            favorites: favoritedSkus.size,
        };
    }, [globalStats, favoritedSkus, totalItems]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7]">
            {/* Header */}
            <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-gray-100 z-20">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">备货清单</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1440px] mx-auto h-full flex flex-col">

                    {/* Controls & Filter Bar */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
                        <div className="flex flex-1 items-center gap-4 w-full lg:w-auto">
                            <div className="relative flex-shrink-0">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:ring-4 focus:ring-black/5 focus:border-gray-300 outline-none w-64 transition-all"
                                    placeholder="搜索型号或名称..."
                                />
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <FilterButton
                                    label="全部"
                                    count={stats.all}
                                    active={activeFilter === StockStatus.ALL}
                                    onClick={() => setActiveFilter(StockStatus.ALL)}
                                    variant="all"
                                />
                                <FilterButton
                                    label="急需补货"
                                    count={stats.critical}
                                    active={activeFilter === StockStatus.CRITICAL}
                                    onClick={() => setActiveFilter(StockStatus.CRITICAL)}
                                    variant="critical"
                                />
                                <FilterButton
                                    label="库存预警"
                                    count={stats.warning}
                                    active={activeFilter === StockStatus.WARNING}
                                    onClick={() => setActiveFilter(StockStatus.WARNING)}
                                    variant="warning"
                                />
                                <FilterButton
                                    label="健康"
                                    count={stats.healthy}
                                    active={activeFilter === StockStatus.HEALTHY}
                                    onClick={() => setActiveFilter(StockStatus.HEALTHY)}
                                    variant="healthy"
                                />
                                <FilterButton
                                    label="呆滞"
                                    count={stats.stagnant}
                                    active={activeFilter === StockStatus.STAGNANT}
                                    onClick={() => setActiveFilter(StockStatus.STAGNANT)}
                                    variant="stagnant"
                                />
                                <button
                                    onClick={() => {
                                        setShowFavoriteOnly(v => !v);
                                        setCurrentPage(1);
                                    }}
                                    className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 active:scale-95 border ${showFavoriteOnly
                                        ? 'bg-rose-500 text-white border-rose-500 shadow-lg ring-4 ring-rose-500/15'
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-rose-300 hover:text-rose-500 hover:shadow-sm'
                                        }`}
                                    title="只看收藏"
                                >

                                    <Heart size={14} className={showFavoriteOnly ? 'fill-white' : ''} />
                                    <span>收藏</span>
                                    <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${showFavoriteOnly ? 'bg-white/20' : 'bg-gray-100 text-gray-400'
                                        }`}>{stats.favorites}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsDownloadModalOpen(true)}
                                className="flex items-center justify-center size-10 bg-white border border-gray-200 rounded-lg text-gray-500 shadow-sm hover:bg-gray-50 hover:text-black transition-all"
                                title="导出清单"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 w-24 text-center whitespace-nowrap">操作</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">仓库</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">产品类型</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">产品型号</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">产品名称</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">备货建议</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">是否备货</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">呆滞状态</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 whitespace-nowrap">库存状态</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 text-right w-24 whitespace-nowrap">在库</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 text-right w-24 whitespace-nowrap">可用</th>
                                        <th className="py-3 px-6 text-[13px] font-medium text-gray-400 text-right w-24 whitespace-nowrap">在途</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={12} className="py-20 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="size-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                                                    <p className="text-sm font-medium">同步云端数据中...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="py-20 text-center text-gray-400">
                                                <p className="text-sm font-medium">暂无匹配的备货数据</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-6 text-center text-gray-500 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* 收藏按钮 */}
                                                        <button
                                                            onClick={() => handleToggleFavorite(product.sku)}
                                                            className={`flex items-center justify-center size-9 rounded-lg border shadow-sm transition-all ${favoritedSkus.has(product.sku)
                                                                ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:border-rose-300'
                                                                : 'border-gray-200 bg-white text-gray-300 hover:text-rose-400 hover:bg-rose-50 hover:border-rose-200'
                                                                }`}
                                                            title={favoritedSkus.has(product.sku) ? '取消收藏' : '收藏'}
                                                        >
                                                            <Heart size={16} className={favoritedSkus.has(product.sku) ? 'fill-rose-500' : ''} />
                                                        </button>

                                                        <button
                                                            onClick={() => navigate(`/stock/product/${product.sku}`)}
                                                            className="flex items-center justify-center size-9 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-black transition-all"
                                                            title="查看详情"
                                                        >
                                                            <Eye size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => navigate(`/stock/backtesting/${product.sku}`)}
                                                            className="flex items-center justify-center size-9 rounded-lg border border-purple-100 bg-purple-50/50 text-purple-600 shadow-sm hover:bg-purple-100 hover:border-purple-300 transition-all"
                                                            title="预测模拟分析"
                                                        >
                                                            <History size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => navigate(`/stock/ai-advice/${product.sku}`)}
                                                            className="flex items-center justify-center size-9 rounded-lg border border-indigo-100 bg-indigo-50/50 text-indigo-600 shadow-sm hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                                                            title="AI专家备货解读"
                                                        >
                                                            <Sparkles size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 text-[15px] text-gray-900 font-medium whitespace-nowrap">
                                                    {product.warehouse || '-'}
                                                </td>
                                                <td className="py-3 px-6 text-[15px] text-gray-600 whitespace-nowrap">
                                                    {product.product_type || '-'}
                                                </td>
                                                <td className="py-3 px-6 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap">
                                                    <Link to={`/stock/product/${product.sku}`} className="hover:underline">
                                                        {product.sku}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-6 text-[15px] font-semibold text-gray-900 whitespace-nowrap">
                                                    {product.name}
                                                </td>
                                                <td className="py-3 px-6 whitespace-nowrap">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${product.stockingRecommendation ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {product.stockingRecommendation ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                                                        {product.stockingRecommendation ? '建议' : '不建议'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`size-2 rounded-full ${product.isStockingEnabled ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-300'}`}></div>
                                                        <span className={`text-[11px] font-bold ${product.isStockingEnabled ? 'text-blue-600' : 'text-gray-400'}`}>
                                                            {product.isStockingEnabled ? '已开启' : '未开启'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`size-2 rounded-full ${product.isDeadStock ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                        <span className={`text-[11px] font-bold ${product.isDeadStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {product.isDeadStock ? '是 (YES)' : '否 (NO)'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 whitespace-nowrap">
                                                    <StatusBadge status={product.status as StockStatus} />
                                                </td>
                                                <td className="py-3 px-6 text-right text-base font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                                    {editingId === product.id ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleUpdateInStock(product, editValue)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateInStock(product, editValue);
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                            className="w-20 px-2 py-1 text-right border border-blue-500 rounded focus:outline-none bg-blue-50"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="cursor-pointer hover:text-blue-600 transition-colors"
                                                            onDoubleClick={() => {
                                                                setEditingId(product.id);
                                                                setEditValue(product.inStock.toString());
                                                            }}
                                                            title="双击修改"
                                                        >
                                                            {product.inStock}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-6 text-right text-[15px] text-gray-400 tabular-nums whitespace-nowrap">
                                                    {product.available}
                                                </td>
                                                <td className="py-3 px-6 text-right text-[15px] text-gray-400 tabular-nums whitespace-nowrap">
                                                    {product.inTransit}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-auto flex items-center justify-end gap-6 px-8 py-3 border-t border-gray-50 bg-gray-50/30">
                            <div className="text-[13px] text-gray-400">
                                显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} / 共 {totalItems} 条数据
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] text-gray-400">每页:</span>
                                    <div className="relative">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="appearance-none bg-transparent border-none text-[13px] font-semibold text-gray-900 focus:ring-0 cursor-pointer pl-0 pr-6 py-0 relative z-10"
                                        >
                                            <option value={15}>15</option>
                                            <option value={30}>30</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 px-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-gray-200 rounded disabled:opacity-20 flex items-center shadow-sm bg-white"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="text-sm font-bold text-gray-900 min-w-8 text-center bg-gray-100 py-1 px-2 rounded">
                                        {currentPage} / {totalPages || 1}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1 px-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-gray-200 rounded disabled:opacity-20 flex items-center shadow-sm bg-white"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>


            <DownloadOptionsModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                products={products}
            />

            <ShipProductModal
                isOpen={isShipModalOpen}
                onClose={() => setIsShipModalOpen(false)}
                product={selectedProductForShip}
                onShip={handleShipProduct}
            />
        </div>
    );
};

// --- Helper Components ---

interface FilterButtonProps {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    variant: 'all' | 'critical' | 'warning' | 'healthy' | 'stagnant';
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, count, active, onClick, variant }) => {
    const baseStyles = "whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2.5 active:scale-95 border";

    if (active) {
        return (
            <button onClick={onClick} className={`${baseStyles} bg-black text-white border-black shadow-lg ring-4 ring-black/5`}>
                <span>{label}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[12px] font-bold">{count}</span>
            </button>
        );
    }

    const dotColors = {
        all: null,
        critical: "bg-red-500",
        warning: "bg-amber-500",
        healthy: "bg-green-500",
        stagnant: "bg-gray-400",
    };

    return (
        <button onClick={onClick} className={`${baseStyles} bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:shadow-sm`}>
            {variant !== 'all' ? (
                <span className={`size-2 rounded-full ${dotColors[variant as keyof typeof dotColors]}`}></span>
            ) : null}
            <span>{label}</span>
            <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded text-[12px] font-bold">{count}</span>
        </button>
    );
};

const StatusBadge: React.FC<{ status: StockStatus }> = ({ status }) => {
    switch (status) {
        case StockStatus.CRITICAL:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#fff2f2] text-red-600 border border-red-50">
                    <span className="size-1.5 rounded-full bg-red-500"></span>急需补货
                </span>
            );
        case StockStatus.WARNING:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#fff8e6] text-amber-600 border border-amber-50">
                    <span className="size-1.5 rounded-full bg-amber-500"></span>库存预警
                </span>
            );
        case StockStatus.HEALTHY:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#f0fff4] text-green-600 border border-green-50">
                    <span className="size-1.5 rounded-full bg-green-500"></span>健康
                </span>
            );
        case StockStatus.STAGNANT:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#f7f7f8] text-gray-500 border border-gray-100">
                    <span className="size-1.5 rounded-full bg-gray-400"></span>呆滞
                </span>
            );
        default:
            return null;
    }
};

export default StockList;
