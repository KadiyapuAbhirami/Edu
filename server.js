require("dotenv").config();

console.log("Server file loaded...");

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse/lib/pdf-parse");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./uploads/db.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many login attempts, try again later'
});
app.use('/api/login', loginLimiter);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const PORT = process.env.PORT || 5000;

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// File Upload Setup
const upload = multer({ dest: "uploads/" });

/* ---------------- API ROUTE ---------------- */

app.post("/api/generate", upload.single("pdf"), async (req, res) => {

    console.log("API /api/generate called");

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "PDF file not uploaded"
            });
        }

        const subject = req.body.subject || "Unknown Subject";
        const type = req.body.type || "study-guide";
        const questions = req.body.questions || 10;

        console.log("Uploaded file:", req.file.originalname);

        /* -------- Read PDF -------- */

        const pdfBuffer = fs.readFileSync(req.file.path);

        console.log("Reading PDF...");

        const pdfData = await pdfParse(pdfBuffer);

        const syllabusText = pdfData.text;

        console.log("PDF text extracted");

        /* -------- AI Prompt -------- */

        const prompt = `
You are an expert university professor.

Read the syllabus and generate study material.

Subject: ${subject}

Instructions:
1. Identify all UNITS
2. Under each unit list topics
3. Explain each topic clearly
4. Use simple language for students

SYLLABUS:
${syllabusText}

If generation type is question-bank then generate ${questions} questions.
`;

        console.log("Calling Gemini AI...");

        /* -------- Gemini Model -------- */

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(prompt);

        const response = await result.response;

        const notes = response.text();

        console.log("Material generated");

        /* -------- Delete uploaded file -------- */

        fs.unlinkSync(req.file.path);

        /* -------- Send Response -------- */

        res.json({
            success: true,
            notes: notes
        });

    } catch (error) {

        console.error("ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* -------- Auth Routes -------- */

// Register
app.post("/register", async (req, res) => {

    try {

        const { username, email, password, role } = req.body;

        const existingUser = await db.findUserByUsername(username);

        if (existingUser) {
            return res.send("Username already exists");
        }

        await db.saveUser({ username, email, password, role });

        res.send("Registration successful");

    } catch (error) {

        console.error("Register error:", error);
        res.send("Registration failed");

    }

});
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const existingUser = await db.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const userData = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student'
    };

    const user = await db.saveUser(userData);
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, userType } = req.body;
    
    const user = await db.findUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: { username: user.username, role: user.role },
      redirect: user.role === 'admin' ? 'admin_dashboard.html' : 
                user.role === 'student' ? 'student_selection.html' :
                'faculty_final.html'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin APIs
app.get('/api/admin/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const students = await db.getAllStudentSelections();
    res.json({ success: true, students });
  } catch (error) {
    console.error('Admin students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/admin/faculty', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const uploads = await db.getAllFacultyUploads();
    const generations = await db.getAllFacultyGenerations();
    const profiles = await db.getAllFacultyProfiles();
    res.json({ success: true, uploads, generations, profiles });
  } catch (error) {
    console.error('Admin faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* -------- Root Test -------- */

app.get("/", (req, res) => {
    res.send("Server working");
});

// Connect to DB
db.connectDB();

/* -------- Start Server -------- */

app.listen(PORT, () => {
    console.log("Server started...");
    console.log(`Server running on http://localhost:${PORT}`);
});

/* -------- Crash Protection -------- */

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});
/* -------- Root Test -------- */

app.get("/", (req, res) => {
    res.send("Server working");
});

// Connect to DB
db.connectDB();

/* -------- Start Server -------- */

app.listen(PORT, () => {
    console.log("Server started...");
    console.log(`Server running on http://localhost:${PORT}`);
});

/* -------- Crash Protection -------- */

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});