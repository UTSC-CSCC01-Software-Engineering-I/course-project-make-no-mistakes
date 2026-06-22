const express = require("express"); 
const app = express();
const cors = require("cors");

// cross origin resource sharing (lets server accept requests from different port than itself)
const corsOptions = {
	origin: ["http://localhost:5173"],
}

// parse JSON into req.body
app.use(express.json());

// applies CORS option above
app.use(cors(corsOptions));

// auth router //////////////////////////////////////////////////
const authRouter = require('./routes/auth.js');
app.use("/auth", authRouter);

// page not found, page error ///////////////////////////////////
app.use((req, res, next) => {
  res.status(404).send("The page you are looking for does not exist");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// listen to incoming traffic to port 8080 //////////////////////
app.listen(8080, () => {
        console.log("Server has started listening on port 8080");
});
