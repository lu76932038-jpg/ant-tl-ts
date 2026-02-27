import { Request, Response } from 'express';
import { AiChatLogModel } from '../models/AiChatLog';
import { AiPromptModel } from '../models/AiPrompt';
import { AiSchemaDocModel } from '../models/AiSchemaDoc';
import { AiChatSessionModel } from '../models/AiChatSession';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get chat logs
 */
export const getChatLogs = async (req: Request, res: Response) => {
    try {
        const logs = await AiChatLogModel.findAll();
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Failed to fetch chat logs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get log detail
 */
export const getChatLogById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const log = await AiChatLogModel.findById(id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Log not found' });
        }
        res.json({ success: true, data: log });
    } catch (error) {
        console.error('Failed to fetch chat log detail:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get all prompts
 */
export const getPrompts = async (req: Request, res: Response) => {
    try {
        const prompts = await AiPromptModel.findAll();
        res.json({ success: true, data: prompts });
    } catch (error) {
        console.error('Failed to fetch prompts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Create/Update prompt
 */
export const savePrompt = async (req: Request, res: Response) => {
    try {
        const { prompt_key, content, version, is_active, description } = req.body;
        if (!prompt_key || !content) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const id = await AiPromptModel.create({
            prompt_key,
            content,
            version: version || 1,
            is_active: is_active ?? true,
            description
        });

        res.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Failed to save prompt:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get Schema Docs
 */
export const getSchemaDocs = async (req: Request, res: Response) => {
    try {
        const docs = await AiSchemaDocModel.findAll();
        res.json({ success: true, data: docs });
    } catch (error) {
        console.error('Failed to fetch schema docs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Save Schema Doc
 */
export const saveSchemaDoc = async (req: Request, res: Response) => {
    try {
        const { table_name, description, column_info } = req.body;
        if (!table_name) {
            return res.status(400).json({ success: false, message: 'Missing table_name' });
        }

        await AiSchemaDocModel.upsert({
            table_name,
            description,
            column_info: typeof column_info === 'string' ? column_info : JSON.stringify(column_info)
        });

        res.json({ success: true, message: 'Saved successfully' });
    } catch (error) {
        console.error('Failed to save schema doc:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- Session Management ---

/**
 * Get all sessions
 */
export const getSessions = async (req: Request, res: Response) => {
    try {
        const sessions = await AiChatSessionModel.findAll(50);
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Create a new session
 */
export const createSession = async (req: Request, res: Response) => {
    try {
        const { title } = req.body;
        const id = uuidv4();
        await AiChatSessionModel.create(id, title);

        // Return full session object
        const session = await AiChatSessionModel.findById(id);

        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get history messages for a session
 */
export const getSessionMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const logs = await AiChatLogModel.findBySessionId(id);

        // Transform logs to chat message format
        const messages = logs.flatMap(log => [
            { role: 'user', content: log.user_query },
            {
                role: 'ai',
                content: log.final_answer,
                sql: log.sql_generated,
                debug: log.prompt_used ? JSON.parse(log.prompt_used) : undefined
            }
        ]);

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Failed to fetch session messages:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Update session title
 */
export const updateSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        await AiChatSessionModel.updateTitle(id, title);
        res.json({ success: true, message: 'Session updated' });
    } catch (error) {
        console.error('Failed to update session:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Delete session
 */
export const deleteSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await AiChatSessionModel.delete(id);
        res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
        console.error('Failed to delete session:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


import { EvaluationService } from '../services/EvaluationService';

/**
 * Submit feedback
 */
export const submitFeedback = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { score, text, corrected_answer } = req.body;
        await AiChatLogModel.updateFeedback(id, { score, text, corrected_answer });

        // Trigger Evaluation if negative feedback
        if (score < 0) {
            // Async trigger, don't wait
            EvaluationService.evaluateLog(id).catch(err => console.error("Async evaluation failed", err));
        }

        res.json({ success: true, message: 'Feedback submitted' });
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
