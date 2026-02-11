import { Request, Response } from 'express';
import { EntryListModel } from '../models/EntryList';

export class EntryListController {
    static async getAll(req: Request, res: Response) {
        try {
            const list = await EntryListModel.findAll();
            res.json(list);
        } catch (error) {
            console.error('Error fetching entry list:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const { sku, product_name, quantity, unit_price, arrival_date, supplier, warehouse } = req.body;

            if (!sku || !arrival_date) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const id = await EntryListModel.create({
                sku,
                product_name: product_name || sku,
                quantity: Number(quantity),
                unit_price: Number(unit_price || 0),
                arrival_date,
                supplier: supplier || 'Unknown',
                warehouse
            });

            res.status(201).json({ success: true, id });
        } catch (error) {
            console.error('Error creating entry:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async confirmReceipt(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const success = await EntryListModel.confirmReceipt(Number(id));
            if (success) {
                res.json({ success: true, message: '入库确认成功' });
            } else {
                res.status(404).json({ error: '未找到待确认的入库记录' });
            }
        } catch (error) {
            console.error('Error confirming receipt:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
