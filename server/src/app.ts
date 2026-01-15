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

const app = express();

app.use(cors({
    origin: true, // Reflect the request origin
    credentials: true
}));
app.use(express.json({ limit: `${config.upload.maxSizeMB}mb` })); // Support large images or file content
app.use(express.static(path.join(__dirname, '../public'))); // Serve static UI pages

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/debug', debugRoutes);
app.use('/debug-page', debugPageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/train-ticket', trainTicketRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/shiplist', shipListRoutes);
app.use('/api/products', productRoutes); // Register Product routes
app.use('/api/products', strategyRoutes); // Register Strategy routes

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Database Initialization (assuming initAdminUser and StockModel.initializeTable exist elsewhere or will be added)
const initDB = async () => {
    try {
        console.log('Database initialization checks...');

        await StrategyModel.initializeTables(); // Initialize Strategy tables
        await ShipListModel.initializeTable(); // Initialize ShipList table

        console.log('Database initialized.');
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
};

initDB();

export default app;
