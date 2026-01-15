import { Router } from 'express';
import { extractDataFromContent as extractGemini } from '../services/geminiService';
import { extractDataFromContent as extractDeepSeek } from '../services/deepseekService';

const router = Router();

// POST /debug/parse  { content: string, model?: 'gemini'|'deepseek' }
router.post('/parse', async (req, res) => {
    const { content, model = 'deepseek' } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'content is required' });
    }
    try {
        const items = model === 'gemini' ? await extractGemini(content) : await extractDeepSeek(content);
        res.json({ items });
    } catch (e) {
        console.error('Debug parse error:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
