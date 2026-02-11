import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';

export class CustomerController {
    static async getList(req: Request, res: Response) {
        try {
            const customers = await CustomerModel.findAll();
            res.json(customers);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            res.status(500).json({ error: 'Failed to fetch customers' });
        }
    }
}
