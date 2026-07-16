const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { syncModels } = require('./models/index.js');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));

// Dynamic API responses must not be cached aggressively
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const io = new Server(server, { cors: corsOptions });
global.io = io;
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Auth
const authRouter = require('./routes/auth.js');
app.use('/auth', authRouter);

// Comments (legacy + vote/delete)
const commentsRouter = require('./routes/comments.js');
app.use('/api/comments', commentsRouter);

// Proposals + nested comments
const proposalsRouter = require('./routes/proposals.js');
app.use('/api/proposals', proposalsRouter);

// Current-user submissions
const submissionsRouter = require('./routes/submissions.js');
app.use('/api/users', submissionsRouter);

// Static assets (map thumbnails, built client, public files) — long cache
const staticOptions = {
  maxAge: '7d',
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
};

app.use('/static', express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.static(path.join(__dirname, '../client/dist'), staticOptions));
app.use(express.static(path.join(__dirname, '../client/public'), staticOptions));

app.use((req, res) => {
  res.status(404).send('The page you are looking for does not exist');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await syncModels();
    const dialect = process.env.DATABASE_URL
      ? 'postgres via DATABASE_URL (data Supabase — separate from auth)'
      : 'sqlite (local fallback)';
    console.log(`Database ready (${dialect})`);
    console.log(
      `Auth project: ${process.env.AUTH_SUPABASE_URL || process.env.SUPABASE_URL || '(missing)'}`
    );

    server.listen(PORT, () => {
      console.log(`Server & WebSockets listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
