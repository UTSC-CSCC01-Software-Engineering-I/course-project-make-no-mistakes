const express = require("express"); 
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
// We must wrap Express in an HTTP server to attach WebSockets
const server = http.createServer(app);

const corsOptions = {
  origin: ["http://localhost:5173"],
}

app.use(express.json());
app.use(cors(corsOptions));

// Initialize Socket.io on this server
const io = new Server(server, { cors: corsOptions });
global.io = io; // Makes it globally available for your AI Queue!

// Mount the Routers
const authRouter = require('./routes/auth.js');
app.use("/auth", authRouter);

const commentsRouter = require('./routes/comments.js');
app.use("/api/comments", commentsRouter);

app.use((req, res, next) => {
  res.status(404).send("The page you are looking for does not exist");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server on Port 8080
server.listen(8080, () => {
    console.log("Server & WebSockets listening on port 8080");
});