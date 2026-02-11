import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';
import debugPageRoutes from './routes/debugPage';
import debugRoutes from './routes/debug';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import auditRoutes from './routes/auditRoutes';
import orderRoutes from './routes/orderRoutes';
import trainTicketRoutes from './routes/trainTicket';
import stockRoutes from './routes/stockRoutes';
import { ShipListModel } from './models/ShipList'; // Import ShipListModel
import shipListRoutes from './routes/shipListRoutes'; // Import ShipList routes
import productRoutes from './routes/productRoutes'; // Import Product routes
import { StrategyModel } from './models/Strategy';
import strategyRoutes from './routes/strategyRoutes';
import { EntryListModel } from './models/EntryList';
import entryListRoutes from './routes/entryListRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';
import purchasePlanRoutes from './routes/purchasePlanRoutes';
import inquiryRoutes from './routes/inquiryRoutes';
import { InquiryTaskModel } from './models/InquiryTask';
import { PurchasePlanModel } from './models/PurchasePlan';
import { UserModel } from './models/User';
import { LoginLogModel } from './models/LoginLog';
import { CustomerModel } from './models/Customer';
import { SchedulerService } from './services/SchedulerService';
import { authenticate, requireAdmin, requirePermission } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();

app.use(cors({
    origin: true, // Reflect the request origin
    credentials: true
}));
app.use(express.json({ limit: `${config.upload.maxSizeMB}mb` })); // Support large images or file content

// 路径重写中间件：处理前端可能带有的 /ant-tool 前缀
app.use((req, res, next) => {
    if (req.url.startsWith('/ant-tool/')) {
        req.url = req.url.replace('/ant-tool/', '/');
    } else if (req.url === '/ant-tool') {
        req.url = '/';
    }
    next();
});

app.use(express.static(path.join(__dirname, '../public'))); // Serve static UI pages

// 基础限流：每分钟 100 次请求
const standardLimiter = rateLimiter(60 * 1000, 100);
// 严格限流（针对 AI/文件处理）：每分钟 20 次请求
const strictLimiter = rateLimiter(60 * 1000, 20);
// 询价上传限流：每分钟 50 次请求（适应批量上传场景）
const inquiryLimiter = rateLimiter(60 * 1000, 50);

// 公开接口 (无需认证)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 处理 favicon.ico 避免 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/api/auth', standardLimiter, authRoutes); // 登录注册使用基础限流

// 调试接口 (如有需要)
app.use('/debug', debugRoutes);
app.use('/debug-page', debugPageRoutes);

// 需要认证的接口
app.use('/api', authenticate, standardLimiter, apiRoutes);
app.use('/admin', authenticate, requireAdmin, adminRoutes);
app.use('/api/users', authenticate, standardLimiter, userRoutes);
app.use('/api/audit', authenticate, standardLimiter, requirePermission('admin'), auditRoutes);
app.use('/api/orders', authenticate, strictLimiter, requirePermission('at_orders'), orderRoutes);
app.use('/api/train-ticket', authenticate, strictLimiter, requirePermission('train_invoice'), trainTicketRoutes);
app.use('/api/stocks', authenticate, standardLimiter, requirePermission('stock_list'), stockRoutes);
app.use('/api/shiplist', authenticate, standardLimiter, requirePermission('stock_list'), shipListRoutes);
app.use('/api/products', authenticate, standardLimiter, requirePermission('stock_list'), productRoutes);
app.use('/api/purchase-orders', authenticate, standardLimiter, requirePermission('stock_list'), purchaseOrderRoutes);
app.use('/api/purchase-plans', authenticate, standardLimiter, requirePermission('stock_list'), purchasePlanRoutes);
app.use('/api/strategies', authenticate, standardLimiter, requirePermission('stock_list'), strategyRoutes);
app.use('/api/inquiry', authenticate, inquiryLimiter, requirePermission('inquiry_parsing'), inquiryRoutes);
app.use('/api/entry-list', authenticate, standardLimiter, requirePermission('stock_list'), entryListRoutes);

// Community Routes - Authenticated
import communityRoutes from './routes/communityRoutes';
app.use('/api/community', authenticate, standardLimiter, communityRoutes);

// Upload Routes
import uploadRoutes from './routes/uploadRoutes';
app.use('/api/upload', authenticate, standardLimiter, uploadRoutes);

// Data Sync Routes
import dataSyncRoutes from './routes/dataSyncRoutes';
app.use('/api/datasync', authenticate, requireAdmin, dataSyncRoutes);

// Customer Routes
import customerRoutes from './routes/customerRoutes';
app.use('/api/customers', authenticate, standardLimiter, customerRoutes);

// Database Initialization (assuming initAdminUser and StockModel.initializeTable exist elsewhere or will be added)
const initDB = async () => {
    try {
        console.log('Database initialization checks...');

        await UserModel.initializeTable();
        await LoginLogModel.initializeTable();
        await StrategyModel.initializeTables(); // Initialize Strategy tables
        await ShipListModel.initializeTable(); // Initialize ShipList table
        await InquiryTaskModel.initializeTable(); // Initialize InquiryTask table
        await PurchasePlanModel.initializeTable(); // Initialize PurchasePlan table
        await CustomerModel.initializeTable(); // Initialize Customer table

        console.log('Database initialized.');

        // Initialize Scheduler -> MOVED TO server.ts to avoid double init
        // SchedulerService.init(); 
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
};

initDB();

export default app;
