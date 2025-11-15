require("dotenv").config();
const express = require("express");
const cors = require("cors");
const httpProxy = require("express-http-proxy");
const jwt = require("jsonwebtoken");

const app = express();

// ADD CORS HERE (ONLY IN GATEWAY!)
// CORS middleware
app.use(cors({
  origin: [
    "http://blog.genzcodershub.com",
    "https://blog.genzcodershub.com",
    "http://localhost:3001"
  ],
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});


app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(token, "this is token");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    console.log("valid token");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // ATTACH USER TO req
    req.user = {
      id: payload.sub,
      role: payload.role || "user",
    };

    console.log("req.user attached:", req.user);
    next();
  } catch (err) {
    console.log("Invalid Token");
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};


// Proxy Routes

// Proxy /api/user to user service
app.use(
  "/api/user",
  httpProxy("http://user:4001", {  // <-- use service name 'user'
    proxyReqPathResolver: (req) => req.url,
  })
);

app.use(
  "/api/admin",
  authMiddleware,
  httpProxy("http://admin:4002", {  // <-- use service name 'admin'
    proxyReqPathResolver: (req) => req.url,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
        proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
      }
      return proxyReqOpts;
    },
  })
);



const PORT = 4000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
