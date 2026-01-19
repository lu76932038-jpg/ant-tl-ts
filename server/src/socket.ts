import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*", // 在生产环境中应更严格
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('用户已连接 WebSocket:', socket.id);

        socket.on('join', (userId: string | number) => {
            const room = `user_${userId}`;
            socket.join(room);
            console.log(`用户 ${userId} 加入了房间 ${room}`);
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
    }
};
