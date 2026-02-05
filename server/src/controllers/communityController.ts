import { Request, Response } from 'express';
import { CommunityModel, Question, Answer } from '../models/CommunityModel';
import { sendQuestionNotification } from '../services/emailService';

export class CommunityController {

    // --- Questions ---

    static async getQuestions(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
            const sort = (req.query.sort as 'new' | 'hot') || 'new';
            const keyword = req.query.keyword as string;

            const questions = await CommunityModel.getQuestions(limit, offset, sort, keyword);
            res.json(questions);
        } catch (error) {
            console.error('Error getting questions:', error);
            res.status(500).json({ message: 'Failed to fetch questions' });
        }
    }

    static async getQuestionDetail(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const question = await CommunityModel.getQuestionById(id);
            if (!question) {
                return res.status(404).json({ message: 'Question not found' });
            }

            const answers = await CommunityModel.getAnswersByQuestionId(id);

            res.json({ question, answers });
        } catch (error) {
            console.error('Error getting question detail:', error);
            res.status(500).json({ message: 'Failed to fetch question detail' });
        }
    }

    static async createQuestion(req: Request, res: Response) {
        try {
            /* 
               IMPORTANT: In a real app, author_id comes from req.user.id (Auth Middleware).
               For this demo/mvp, we might rely on the client sending it OR (better) use the auth token.
               Assuming `authenticate` middleware populates `req.user`.
            */
            // @ts-ignore - assuming auth middleware adds user
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { title, content, tags } = req.body;
            if (!title) {
                return res.status(400).json({ message: 'Title is required' });
            }

            const question: Question = {
                title,
                content,
                tags: tags || [],
                author_id: userId
            };

            const insertId = await CommunityModel.createQuestion(question);

            // Send email notification asynchronously
            // @ts-ignore
            const username = req.user?.username || `User ${userId}`;
            sendQuestionNotification({ ...question, id: insertId }, username);

            res.status(201).json({ message: 'Question created', id: insertId });
        } catch (error: any) {
            console.error('Error creating question:', error);
            res.status(500).json({
                message: 'Failed to create question',
                error: error.message || 'Unknown error',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // --- Answers ---

    static async createAnswer(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const questionId = parseInt(req.params.questionId);
            const { content } = req.body;

            if (!content) return res.status(400).json({ message: 'Content is required' });

            const answer: Answer = {
                question_id: questionId,
                content,
                author_id: userId,
                is_accepted: false
            };

            const insertId = await CommunityModel.createAnswer(answer);
            res.status(201).json({ message: 'Answer posted', id: insertId });
        } catch (error) {
            console.error('Error creating answer:', error);
            res.status(500).json({ message: 'Failed to create answer' });
        }
    }

    // --- Interactions ---

    static async vote(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const { targetType, targetId } = req.body; // targetType: 'question' | 'answer'

            if (!['question', 'answer'].includes(targetType) || !targetId) {
                return res.status(400).json({ message: 'Invalid parameters' });
            }

            await CommunityModel.toggleVote(targetType, targetId, userId);
            res.json({ message: 'Vote toggled' });
        } catch (error) {
            console.error('Error voting:', error);
            res.status(500).json({ message: 'Failed to vote' });
        }
    }
}
