
import { Product, StockStatus } from '../../types';

export const MOCK_PRODUCTS: Product[] = [
    { id: '1', sku: 'SKU-102938', name: '无线人体工学鼠标', status: StockStatus.CRITICAL, inStock: 12, available: 8, inTransit: 0 },
    { id: '2', sku: 'SKU-554210', name: '机械键盘 Pro 2', status: StockStatus.WARNING, inStock: 45, available: 40, inTransit: 50 },
    { id: '3', sku: 'SKU-992100', name: '智能降噪耳机', status: StockStatus.HEALTHY, inStock: 320, available: 310, inTransit: 100 },
    { id: '4', sku: 'SKU-112233', name: 'USB-C 数据线套装', status: StockStatus.STAGNANT, inStock: 850, available: 850, inTransit: 0 },
    { id: '5', sku: 'SKU-445566', name: '4K 超高清显示器', status: StockStatus.CRITICAL, inStock: 3, available: 1, inTransit: 20 },
    { id: '6', sku: 'SKU-778899', name: '蓝牙便携音箱', status: StockStatus.HEALTHY, inStock: 150, available: 145, inTransit: 30 },
    { id: '7', sku: 'SKU-234567', name: '平板电脑支架', status: StockStatus.HEALTHY, inStock: 420, available: 410, inTransit: 0 },
    { id: '8', sku: 'SKU-890123', name: 'Type-C 扩展坞', status: StockStatus.WARNING, inStock: 18, available: 15, inTransit: 100 },
    { id: '9', sku: 'SKU-345678', name: '笔记本散热器', status: StockStatus.HEALTHY, inStock: 210, available: 205, inTransit: 0 },
    { id: '10', sku: 'SKU-901234', name: '高清网络摄像头', status: StockStatus.HEALTHY, inStock: 85, available: 80, inTransit: 20 },
    { id: '11', sku: 'SKU-567890', name: '游戏手柄 X版', status: StockStatus.STAGNANT, inStock: 350, available: 350, inTransit: 0 },
    { id: '12', sku: 'SKU-123789', name: '智能穿戴手环', status: StockStatus.HEALTHY, inStock: 560, available: 550, inTransit: 100 },
    { id: '13', sku: 'SKU-654321', name: '便携式SSD 1TB', status: StockStatus.WARNING, inStock: 25, available: 22, inTransit: 60 },
    { id: '14', sku: 'SKU-987654', name: '桌面收纳盒', status: StockStatus.HEALTHY, inStock: 1200, available: 1150, inTransit: 0 },
    { id: '15', sku: 'SKU-321654', name: '氮化镓充电器 65W', status: StockStatus.HEALTHY, inStock: 280, available: 275, inTransit: 50 },
    { id: '16', sku: 'SKU-774411', name: '工业级路由器', status: StockStatus.STAGNANT, inStock: 140, available: 140, inTransit: 0 },
];
