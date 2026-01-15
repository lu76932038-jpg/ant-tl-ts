import { Request, Response } from 'express';
import { StockModel } from '../models/Stock';

export class StockController {
    static async getAllStocks(req: Request, res: Response) {
        try {
            const stocks = await StockModel.findAll();
            res.json(stocks);
        } catch (error) {
            console.error('Error fetching stocks:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async initialize(req: Request, res: Response) {
        try {
            const mockData = req.body.mockData;
            await StockModel.initializeTable(mockData || []);
            res.json({ message: 'Database initialized and data imported' });
        } catch (error) {
            console.error('Error initializing database:', error);
            res.status(500).json({ message: 'Initialization failed' });
        }
    }

    static async createStock(req: Request, res: Response) {
        try {
            const stockData = req.body;
            // Basic validation
            if (!stockData.sku || !stockData.name) {
                return res.status(400).json({ message: 'SKU and Name are required' });
            }

            const insertId = await StockModel.create(stockData);
            res.status(201).json({ id: insertId, ...stockData });
        } catch (error) {
            console.error('Error creating stock:', error);
            // Handle duplicate SKU error commonly from SQL
            if ((error as any).code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Product with this SKU already exists' });
            }
            res.status(500).json({ message: 'Failed to create product' });
        }
    }
}
