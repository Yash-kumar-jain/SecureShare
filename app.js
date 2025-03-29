const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const flash = require("connect-flash")
const expressSession = require('express-session');
// Add these at the top with your other requires
const bodyParser = require('body-parser');

// Add these middleware before your routes
app.use(bodyParser.urlencoded({ extended: true })); // for form data
app.use(bodyParser.json()); // for JSON data


require('dotenv').config();
// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Static files
app.use(express.static('public'));

app.use(flash());
app.use(expressSession({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
}))


// Routes
app.get('/', (req, res) => {
  const msg = req.flash("msg");
  // console.log(msg);
  
  res.render('index',{msg: msg});
});

app.get('/create-room', (req, res) => {
  res.render('create-room');
});



let codes = [];

app.post('/check-code',(req, res) => {
let {roomCode} = req.body;
// console.log(roomCode);

if ( codes.indexOf(roomCode) === -1) {
    req.flash("msg" , "Invalid room code")
    res.redirect("/")
    return;
  }
else{
  res.redirect(`/${roomCode}`);
  return;
}


})
app.post('/create-room-code',(req, res) => {
let {room_id} = req.body;
// console.log(room_id);

  codes.push(room_id);
  res.redirect(`/${room_id}`);
  return;



})

app.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if ( codes.indexOf(roomId) === -1) {
    req.flash("msg" , "Invalid room code")
    res.redirect("/")
    return;
  }

  // console.log(codes);
  
  res.render('share', { roomId: req.params.roomId });
});

// Socket.io connection
io.on('connection', (socket) => {

  

  const activeRooms = new Set();

  socket.on('join-room', (roomId) => {
    // console.log(roomId);
    
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
        codes.delete(roomId);
        activeRooms.delete(roomId);
      }
    }, 5000);
  });

  socket.on('disconnect', () => {
    // Clean up any rooms this socket was in
    activeRooms.forEach(roomId => {
        io.in(roomId).socketsLeave(roomId);
        activeRooms.delete(roomId);
        
        // Find the index of the roomId in codes array
        const index = codes.indexOf(roomId);
        if (index !== -1) {
            codes.splice(index, 1); // Remove 1 element at the found index
        }
        // console.log(codes);
    });
});
});

// console.log(codes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 