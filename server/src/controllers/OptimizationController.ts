
import { Request, Response } from 'express';
import { AiChatEvaluationModel } from '../models/AiChatEvaluation';
import { AiPromptModel } from '../models/AiPrompt';
import { AiSchemaDocModel } from '../models/AiSchemaDoc';
import pool from '../config/database';

export const getEvaluationStats = async (req: Request, res: Response) => {
    try {
        // Simple aggregate stats
        const [rows] = await pool.query('SELECT AVG(score) as avgScore, COUNT(*) as total FROM ai_chat_evaluations') as any[];
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Failed to get stats', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getSuggestions = async (req: Request, res: Response) => {
    try {
        // Get recent evaluations with suggestions
        const evaluations = await AiChatEvaluationModel.findAll();
        const withSuggestions = evaluations.filter(e => e.suggestion && e.suggestion.length > 5);

        // In a real system, we would group these by similarity. 
        // For MVP, just return the raw suggestions.
        res.json({ success: true, data: withSuggestions });
    } catch (error) {
        console.error('Failed to get suggestions', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const applySuggestion = async (req: Request, res: Response) => {
    // This would be complex: parsing the suggestion and applying it to Prompt or Schema.
    // For MVP, we might just mark it as "Applied" manually or have a simple text append.
    // Let's just return a placeholder for now.
    res.json({ success: true, message: 'Auto-apply not yet implemented, please edit manually.' });
};
