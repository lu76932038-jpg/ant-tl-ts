import { Request, Response } from 'express';
import { PurchasePlanModel } from '../models/PurchasePlan';
import { PurchaseOrderModel } from '../models/PurchaseOrder';
import { UserModel } from '../models/User';

export class PurchasePlanController {
    static async getAll(req: Request, res: Response) {
        try {
            const rows = await PurchasePlanModel.findAll();
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch Purchase Plans' });
        }
    }

    static async createPlan(req: Request, res: Response) {
        try {
            // req.body: { sku, product_name, quantity, order_date, supplier_info }
            const id = await PurchasePlanModel.create({
                ...req.body,
                status: 'PLAN'
            });

            // Fire notification
            (async () => {
                try {
                    const recipients = await UserModel.findStockNotificationRecipients();

                    // 1. Initial pending status
                    await PurchasePlanModel.updateEmailStatus(id, {
                        status: 'PENDING',
                        recipients,
                        sent_at: new Date().toISOString()
                    });

                    if (recipients.length > 0) {
                        const { sendPurchaseOrderNotification } = require('../services/emailService');
                        // Use plan data structure for notification
                        await sendPurchaseOrderNotification(recipients, {
                            ...req.body,
                            plan_id: id // Optional: pass ID if needed
                        });

                        // 2. Success status
                        await PurchasePlanModel.updateEmailStatus(id, {
                            status: 'SENT',
                            recipients,
                            sent_at: new Date().toISOString()
                        });
                    } else {
                        await PurchasePlanModel.updateEmailStatus(id, {
                            status: 'SKIPPED',
                            reason: 'No recipients configured',
                            sent_at: new Date().toISOString()
                        });
                    }
                } catch (err: any) {
                    console.error('Failed to send Plan notification:', err);
                    // 3. Error status
                    await PurchasePlanModel.updateEmailStatus(id, {
                        status: 'FAILED',
                        error: err.message || 'Unknown error',
                        sent_at: new Date().toISOString()
                    });
                }
            })();

            res.status(201).json({ id, message: 'Purchase Plan Created', success: true });
        } catch (error: any) {
            console.error('Create Plan Failed:', error);
            res.status(500).json({ error: `Failed to create Plan: ${error.message}` });
        }
    }

    static async convertToPO(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const plan = await PurchasePlanModel.findById(Number(id));

            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            // 1. Create Purchase Order (Draft)
            const poId = await PurchaseOrderModel.create({
                sku: plan.sku,
                product_name: plan.product_name,
                quantity: plan.quantity,
                supplier_info: plan.supplier_info,
                order_date: new Date().toISOString().split('T')[0],
            });

            // 2. Delete Plan (Consumed)
            await PurchasePlanModel.delete(Number(id));

            // Note: InTransit stock logic is handled by Frontend visuals or recalculation.
            // When converting Plan -> PO (Draft), the "InTransit" logic usually stays valid 
            // as PO Draft is also considered "On Order" in many systems, 
            // OR we rely on the PO confirmation for Entry.

            res.json({ message: 'Plan converted to PO', poId });
        } catch (error: any) {
            console.error('Convert Plan Error', error);
            res.status(500).json({ error: 'Failed to convert plan' });
        }
    }

    static async cancelPlan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const success = await PurchasePlanModel.delete(Number(id));
            if (!success) return res.status(404).json({ error: 'Plan not found' });
            res.json({ message: 'Plan cancelled' });
        } catch (error) {
            console.error('Cancel Plan Error', error);
            res.status(500).json({ error: 'Failed to cancel plan' });
        }
    }
}
