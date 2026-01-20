import { Response } from 'express';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';

// 获取所有用户 (管理员)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await UserModel.findAll();
        res.json(users);
    } catch (error: any) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
};

// 更新用户 (管理员)
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, email, password, role, permissions } = req.body; // Add permissions from body

        const updates: any = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (password) updates.password = password;
        if (role) updates.role = role;
        if (permissions !== undefined) updates.permissions = permissions; // Add permissions to updates

        await UserModel.update(userId, updates);
        const updatedUser = await UserModel.findById(userId);

        if (!updatedUser) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }

        res.json({
            message: '用户更新成功',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                permissions: updatedUser.permissions // Return permissions
            }
        });
    } catch (error: any) {
        console.error('更新用户错误:', error);
        res.status(500).json({ error: '更新用户失败' });
    }
};

// 删除用户 (管理员)
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        // 防止删除自己
        if (req.user && req.user.id === userId) {
            res.status(400).json({ error: '不能删除自己的账户' });
            return;
        }

        await UserModel.delete(userId);
        // 如果 delete 抛错则进入 catch；如果不抛错则认为成功（或静默失败，基于当前 Model 实现）
        // 建议 Model 实现如果找不到用户也仅是返回，或者 check exist before delete
        // 这里简单假设执行成功

        res.json({ message: '用户删除成功' });
    } catch (error: any) {
        console.error('删除用户错误:', error);
        res.status(500).json({ error: '删除用户失败' });
    }
};
// 修改密码 (用户自己)
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;

        if (!userId) {
            res.status(401).json({ error: '请先登录' });
            return;
        }

        // 验证旧密码
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }

        // 假设 UserModel 有验证密码的方法，如果没有，我们需要引入 bcrypt
        // 鉴于这是一个快速迭代，我们直接在 UserModel 中增加验证逻辑或在此处理
        // 之前的代码显示 UserModel.update 对 password 字段做了加密处理

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            res.status(400).json({ error: '旧密码错误' });
            return;
        }

        await UserModel.updatePassword(userId, newPassword);
        res.json({ message: '密码修改成功' });
    } catch (error: any) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
};
