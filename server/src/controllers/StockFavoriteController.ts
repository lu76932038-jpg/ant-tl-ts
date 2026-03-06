import { Request, Response } from 'express';
import { FavoriteModel } from '../models/Stock';

export class StockFavoriteController {
    static async getFavorites(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ error: '未授权' });
            }

            const favorites = await FavoriteModel.getFavoritedSkus(userId);
            res.json({ favorites });
        } catch (error) {
            console.error('获取收藏失败:', error);
            res.status(500).json({ error: '获取收藏失败' });
        }
    }

    static async toggleFavorite(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { sku } = req.body;

            if (!userId) {
                return res.status(401).json({ error: '未授权' });
            }
            if (!sku) {
                return res.status(400).json({ error: '缺少 SKU' });
            }

            const isFavorited = await FavoriteModel.toggleFavorite(userId, sku);
            res.json({ isFavorited, sku });
        } catch (error) {
            console.error('切换收藏失败:', error);
            res.status(500).json({ error: '切换收藏失败' });
        }
    }
}
