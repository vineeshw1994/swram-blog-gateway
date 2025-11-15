require("dotenv").config();
const express = require("express");
const cors = require("cors");
const httpProxy = require("express-http-proxy");
const jwt = require("jsonwebtoken");

const app = express();

// ADD CORS HERE (ONLY IN GATEWAY!)
app.use(
  cors({
    origin: "http://apibgway.genzcodershub.com", // Your React app
    credentials: true, // Allow cookies (refreshToken)
  })
);

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
app.use(
  "/api/user",
  (req, res, next) => {
    console.log("this api for user service"), next();
  },
  httpProxy("http://localhost:4001", {
    proxyReqPathResolver: (req) => req.url, // ← JUST req.url
  })
);

app.use(
  "/api/admin",
  authMiddleware,
  httpProxy("http://localhost:4002", {
    proxyReqPathResolver: (req) => req.url, // ← JUST req.url

    // ADD THIS: Forward user info via header
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
        proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
      }
      return proxyReqOpts;
    },
  })
);

// app.use('/api/user',(req,res,next)=>{console.log('this api for user service'), next()}, httpProxy('http://localhost:4001', {
//   proxyReqPathResolver: req => `/api/user${req.url}` // Maps /api/user/signup to /api/user/signup
// }));
// app.use('/api/admin', authMiddleware, httpProxy('http://localhost:4002', {
//   proxyReqPathResolver: req => `/api/admin${req.url}`
// }));
// app.use('/api/order', authMiddleware, httpProxy('http://localhost:3003', {
//   proxyReqPathResolver: req => `/api/order${req.url}`
// }));

const PORT = 4000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
