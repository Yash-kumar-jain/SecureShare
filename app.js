const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/create-room', (req, res) => {
  res.render('create-room');
});

app.get('/:roomId', (req, res) => {
  res.render('share', { roomId: req.params.roomId });
});

// Socket.io connection
io.on('connection', (socket) => {
  const activeRooms = new Set();

  socket.on('join-room', (roomId) => {
    const roomClients = io.sockets.adapter.rooms.get(roomId) || new Set();
    const numClients = roomClients.size;
    
    if (numClients >= 2) {
      socket.emit('room-full');
      return;
    }
    
    socket.join(roomId);
    activeRooms.add(roomId);
    socket.emit('room-joined', { numUsers: numClients + 1 });
    
    if (numClients === 1) {
      io.to(roomId).emit('user-connected', socket.id);
    }
  });

  socket.on('signal', ({ offer, answer, candidate, roomId }) => {
    socket.to(roomId).emit('signal', { offer, answer, candidate });
  });

  socket.on('transfer-complete', ({ roomId }) => {
    // Notify both clients to redirect
    io.to(roomId).emit('transfer-complete');
    
    // Clean up the room after a delay
    setTimeout(() => {
      if (activeRooms.has(roomId)) {
        io.in(roomId).socketsLeave(roomId);
        activeRooms.delete(roomId);
      }
    }, 5000);
  });

  socket.on('disconnect', () => {
    // Clean up any rooms this socket was in
    activeRooms.forEach(roomId => {
      io.in(roomId).socketsLeave(roomId);
      activeRooms.delete(roomId);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});