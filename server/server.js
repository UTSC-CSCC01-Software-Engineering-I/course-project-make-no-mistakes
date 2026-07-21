const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');

const { syncModels } = require('./models/index.js');
const { authenticateToken } = require('./middleware/auth.js');

const app = express();
const httpsKeyPath = process.env.HTTPS_KEY_PATH;
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const httpsEnabled = Boolean(httpsKeyPath && httpsCertPath);
const server = httpsEnabled
  ? https.createServer(
      {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath),
      },
      app
    )
  : http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin: allowedOrigins,
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

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = token ? await authenticateToken(token) : null;
    if (token && !socket.user) {
      return next(new Error('Unauthorized'));
    }
    return next();
  } catch (error) {
    console.error('[SOCKET AUTH ERROR]', error);
    return next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  if (socket.user) {
    socket.join(`user:${socket.user.authUserId}`);
  }

  socket.on('proposal:join', (proposalId) => {
    const id = String(proposalId || '');
    if (id && id.length <= 100) socket.join(`proposal:${id}`);
  });

  socket.on('proposal:leave', (proposalId) => {
    socket.leave(`proposal:${String(proposalId || '')}`);
  });

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).send('The page you are looking for does not exist');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_REDIRECT_PORT = process.env.HTTP_REDIRECT_PORT || 80;

function startHttpRedirectServer() {
  const redirectApp = express();
  redirectApp.use((req, res) => {
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    res.redirect(301, `https://${host || 'localhost'}${req.originalUrl}`);
  });

  return http.createServer(redirectApp).listen(HTTP_REDIRECT_PORT, () => {
    console.log(`HTTP redirect listening on port ${HTTP_REDIRECT_PORT}`);
  });
}

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

    if (httpsEnabled) {
      startHttpRedirectServer();
    }

    server.listen(httpsEnabled ? HTTPS_PORT : PORT, () => {
      const protocol = httpsEnabled ? 'HTTPS' : 'HTTP';
      const port = httpsEnabled ? HTTPS_PORT : PORT;
      console.log(`${protocol} server & WebSockets listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
