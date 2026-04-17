const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory room state
const rooms = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('[Socket] connected:', socket.id);

    // Join a watch-party room
    socket.on('join-room', ({ roomId, username, movieId }) => {
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          movieId,
          currentTime: 0,
          isPlaying: false,
          users: [],
        };
      }

      // Remove duplicates (reconnect case)
      rooms[roomId].users = rooms[roomId].users.filter((u) => u.id !== socket.id);
      rooms[roomId].users.push({ id: socket.id, username });

      // Send current playback state to newcomer only
      socket.emit('sync-state', {
        currentTime: rooms[roomId].currentTime,
        isPlaying: rooms[roomId].isPlaying,
        movieId: rooms[roomId].movieId,
      });

      // Notify everyone of updated user list
      io.to(roomId).emit('users-update', rooms[roomId].users);

      // System chat message
      socket.to(roomId).emit('chat-message', {
        id: Date.now().toString(),
        username: 'System',
        message: `${username} joined the watch party`,
        timestamp: Date.now(),
        isSystem: true,
      });
    });

    // Play event
    socket.on('play', ({ roomId, currentTime }) => {
      if (rooms[roomId]) {
        rooms[roomId].isPlaying = true;
        rooms[roomId].currentTime = currentTime;
      }
      // Broadcast to everyone else in room
      socket.to(roomId).emit('play', { currentTime });
    });

    // Pause event
    socket.on('pause', ({ roomId, currentTime }) => {
      if (rooms[roomId]) {
        rooms[roomId].isPlaying = false;
        rooms[roomId].currentTime = currentTime;
      }
      socket.to(roomId).emit('pause', { currentTime });
    });

    // Seek event
    socket.on('seek', ({ roomId, currentTime }) => {
      if (rooms[roomId]) {
        rooms[roomId].currentTime = currentTime;
      }
      socket.to(roomId).emit('seek', { currentTime });
    });

    // Chat message
    socket.on('chat-message', ({ roomId, username, message }) => {
      const msg = {
        id: Date.now().toString() + Math.random(),
        username,
        message,
        timestamp: Date.now(),
        isSystem: false,
      };
      io.to(roomId).emit('chat-message', msg);
    });

    // Disconnect cleanup
    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id || !rooms[roomId]) continue;
        const user = rooms[roomId].users.find((u) => u.id === socket.id);
        rooms[roomId].users = rooms[roomId].users.filter((u) => u.id !== socket.id);
        io.to(roomId).emit('users-update', rooms[roomId].users);
        if (user) {
          io.to(roomId).emit('chat-message', {
            id: Date.now().toString(),
            username: 'System',
            message: `${user.username} left the watch party`,
            timestamp: Date.now(),
            isSystem: true,
          });
        }
        // Clean up empty rooms
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId];
        }
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> StreamSync ready on http://localhost:${PORT}`);
  });
});
