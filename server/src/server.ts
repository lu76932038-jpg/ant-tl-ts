import app from './app';
import { config } from './config/env';
import { UserModel } from './models/User';
import { AuditLogModel } from './models/AuditLog';
import { StockModel } from './models/Stock';
import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = config.server.port;
const httpServer = createServer(app);

// 初始化 Socket.io
initSocket(httpServer);

// 初始化数据库
async function initializeDatabase() {
    try {
        console.log('正在初始化数据库...');
        await UserModel.initializeTable();
        await AuditLogModel.initializeTable();
        const { INITIAL_STOCK_DATA } = require('./models/Stock');
        await StockModel.initializeTable(INITIAL_STOCK_DATA); // 传入初始数据

        // Initialize other necessary tables
        const { EntryListModel } = require('./models/EntryList');
        const { StrategyModel } = require('./models/Strategy');
        await EntryListModel.initializeTable();
        await StrategyModel.initializeTables();

        // Initialize Inquiry Task Table
        const { InquiryTaskModel } = require('./models/InquiryTask');
        await InquiryTaskModel.initializeTable();

        console.log('数据库初始化成功');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// 启动服务器
async function startServer() {
    await initializeDatabase();

    httpServer.listen(PORT as number, '0.0.0.0', () => {
        console.log(`Server is running with WebSocket support on port ${PORT}`);
        console.log(`Environment: ${config.server.env}`);
        if (!process.env.GEMINI_API_KEY) {
            console.warn("WARNING: GEMINI_API_KEY is not set!");
        }
        if (!process.env.JWT_SECRET) {
            console.warn("WARNING: JWT_SECRET is not set!");
        }
    });
}

startServer();
