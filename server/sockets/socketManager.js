import { Server } from 'socket.io';

let io;

export const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' } // Update in production to client's URL
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Clients can join specific "rooms" if needed, or listen to global broadcasts
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

export const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
