import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
    // 强制统一监听 /socket.io 路径，确保与前端一致
    const socketPath = process.env.SOCKET_PATH || '/socket.io';
    console.log(`[Socket] 初始化成功，监听路径: ${socketPath}`);

    io = new SocketIOServer(server, {
        path: socketPath,
        cors: {
            origin: "*", // 在生产环境中应更严格
            methods: ["GET", "POST"]
        }
    });

    // 关键加固：Socket.io 鉴权中间件
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            console.warn('[Socket Auth] 拒绝连接: 缺少 Token');
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error('[Socket Auth] 关键错误: JWT_SECRET 环境变量未配置！');
                return next(new Error('Authentication error: Server internal error'));
            }
            const decoded = jwt.verify(token, secret) as { userId: number };
            (socket as any).userId = decoded.userId;
            next();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[Socket Auth] 拒绝无效连接:', msg);
            next(new Error(`Authentication error: ${msg}`));
        }
    });

    io.on('connection', (socket) => {
        console.log('用户已连接 WebSocket:', socket.id);

        socket.on('join', (userId: string | number) => {
            const room = `user_${userId}`;
            socket.join(room);
            console.log(`用户 ${userId} 加入了房间 ${room}`);
        });

        socket.on('join_admin', () => {
            const room = 'admin_room';
            socket.join(room);
            console.log(`管理员加入房间 ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('用户已断开 WebSocket');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io 未初始化');
    }
    return io;
};

// 通知特定用户任务状态变更
export const notifyTaskUpdate = (userId: number, task: any) => {
    if (io) {
        io.to(`user_${userId}`).emit('task_updated', task);
        // 同时通知管理员
        io.to('admin_room').emit('task_updated', task);
    }
};
