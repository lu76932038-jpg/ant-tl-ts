import app from './app';
import { config } from './config/env';
import { UserModel } from './models/User';
import { ShipListModel } from './models/ShipList';
import { AiChatLogModel } from './models/AiChatLog';
import { AiChatSessionModel } from './models/AiChatSession';
import { AiPromptModel } from './models/AiPrompt';
import { AiSchemaDocModel } from './models/AiSchemaDoc';
import { AiChatEvaluationModel } from './models/AiChatEvaluation';
import { EntryListModel } from './models/EntryList';
import { StrategyModel } from './models/Strategy';
import { InquiryTaskModel } from './models/InquiryTask';
import { CustomerModel } from './models/Customer';
import { OutboundPlanModel } from './models/OutboundPlan';
import { AuditLogModel } from './models/AuditLog';
import { StockModel } from './models/Stock';
import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = config.server.port;
const httpServer = createServer(app);

// 初始化 Socket.io
initSocket(httpServer);

// 初始化数据库
const initializeDatabase = async () => {
    try {
        console.log('正在初始化数据库...');
        const { INITIAL_STOCK_DATA } = require('./models/Stock'); // Keep this require for initial data

        await Promise.all([
            UserModel.initializeTable(),
            AuditLogModel.initializeTable(),
            StockModel.initializeTable(INITIAL_STOCK_DATA), // Pass initial data
            EntryListModel.initializeTable(),
            ShipListModel.initializeTable(),
            AiChatLogModel.initializeTable(),
            AiChatSessionModel.initializeTable(),
            InquiryTaskModel.initializeTable(),
            CustomerModel.initializeTable(),
            OutboundPlanModel.initializeTable(),
            AiPromptModel.initializeTable(),
            AiSchemaDocModel.initializeTable(),
            AiChatEvaluationModel.initializeTable()
        ]);

        // Initialize other necessary tables that might have different initialization methods
        await StrategyModel.initializeTables();
        await InquiryTaskModel.initializeTable();

        // Initialize Community Tables
        const { CommunityModel } = require('./models/CommunityModel');
        await CommunityModel.initializeTables();

        console.log('数据库初始化成功');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// 启动服务器
async function startServer() {
    await initializeDatabase();

    // Start Scheduler
    const { SchedulerService } = require('./services/SchedulerService');
    SchedulerService.init();

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
