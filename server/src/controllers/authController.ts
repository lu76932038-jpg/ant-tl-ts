import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { config } from '../config/env';

// 生成 JWT Token 辅助函数
const generateToken = (userId: number) => {
    return jwt.sign(
        { userId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
    );
};

// 发送验证码
import { sendVerificationEmail, verifyEmailCode } from '../services/emailService';

// ... imports ...

export const sendVerificationCode = async (req: Request, res: Response) => {
    console.log('DEBUG: Received send-code request:', req.body);
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: '邮箱不能为空' });
            return;
        }

        await sendVerificationEmail(email);

        res.json({ message: '验证码已发送至您的邮箱' });
    } catch (error: any) {
        console.error('发送验证码错误:', error);
        res.status(500).json({ error: error.message || '发送验证码失败' });
    }
};

// 邮箱验证码登录
export const loginEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            res.status(400).json({ error: '邮箱和验证码为必填项' });
            return;
        }

        if (!verifyEmailCode(email, code)) {
            res.status(400).json({ error: '验证码无效或已过期' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ error: '该邮箱未注册' });
            return;
        }

        if (!user.is_active) {
            res.status(403).json({ error: '账户已被禁用' });
            return;
        }

        await UserModel.updateLastLogin(user.id);
        const token = generateToken(user.id);

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });

    } catch (error: any) {
        console.error('邮箱登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
};

// 邮箱验证码注册
export const registerEmail = async (req: Request, res: Response) => {
    console.log('DEBUG: Received register-email request:', req.body);
    try {
        const { username, email, password, code } = req.body;

        if (!username || !email || !password || !code) {
            res.status(400).json({ error: '所有字段均为必填项' });
            return;
        }

        if (!verifyEmailCode(email, code)) {
            res.status(400).json({ error: '验证码无效或已过期' });
            return;
        }

        const existingUser = await UserModel.findByUsername(username);
        if (existingUser) {
            res.status(400).json({ error: '用户名已存在' });
            return;
        }

        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            res.status(400).json({ error: '邮箱已被注册' });
            return;
        }

        const defaultPermissions = ['inquiry_parsing', 'profile', 'change_password'];
        const user = await UserModel.create({
            username,
            email,
            password,
            permissions: defaultPermissions
        });

        const token = generateToken(user.id);

        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });

    } catch (error: any) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败' });
    }
};

// 忘记密码重置
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            res.status(400).json({ error: '邮箱、验证码和新密码为必填项' });
            return;
        }

        if (!verifyEmailCode(email, code)) {
            res.status(400).json({ error: '验证码无效或已过期' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePassword(user.id, hashedPassword);

        res.json({ message: '密码重置成功' });

    } catch (error: any) {
        console.error('重置密码错误:', error);
        res.status(500).json({ error: '重置密码失败' });
    }
};

// 原有的普通注册 (保留但基本不推荐使用直接注册接口，前端会走带手机号的)
export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
            return;
        }

        const existingUser = await UserModel.findByUsername(username);
        if (existingUser) {
            res.status(400).json({ error: '用户名已存在' });
            return;
        }

        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            res.status(400).json({ error: '邮箱已被注册' });
            return;
        }

        const defaultPermissions = ['inquiry_parsing', 'profile', 'change_password'];
        const user = await UserModel.create({
            username,
            email,
            password,
            permissions: defaultPermissions
        });

        const token = generateToken(user.id);

        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error: any) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败' });
    }
};

// 原有的普通登录
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: '用户名和密码为必填项' });
            return;
        }

        const user = await UserModel.findByUsername(username);
        if (!user) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }

        const isValidPassword = await UserModel.validatePassword(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }

        if (!user.is_active) {
            res.status(403).json({ error: '账户已被禁用' });
            return;
        }

        await UserModel.updateLastLogin(user.id);
        const token = generateToken(user.id);

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error: any) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
};

// 获取当前用户信息
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: '未认证' });
            return;
        }

        const user = await UserModel.findById(req.user.id);
        if (!user) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            last_login: user.last_login,
            permissions: user.permissions
        });
    } catch (error: any) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
};
