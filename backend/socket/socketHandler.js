
const socketIo = require('socket.io');
const Message = require('../models/Message');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                'http://localhost:3000',
                'https://myclass-vfgw.onrender.com',
                'https://ums-k0th.onrender.com'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room} `);
        });

        socket.on('join_user_room', (userId) => {
            socket.join(`user_${userId} `);
            console.log(`User ${socket.id} joined user room: user_${userId} `);
        });

        socket.on('send_message', async (data) => {
            // data: { room, author, message, file, time }
            try {
                // Save to DB
                await Message.create(data);
                // Broadcast to room
                io.to(data.room).emit('receive_message', data);
            } catch (error) {
                console.error('Error saving message:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const sendNotification = (userId, notification) => {
    if (io) {
        io.to(`user_${userId} `).emit('receive_notification', notification);
    }
};

module.exports = { initSocket, getIo, sendNotification };
