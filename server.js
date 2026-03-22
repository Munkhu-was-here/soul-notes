const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const AUDIOS_DIR = path.join(UPLOADS_DIR, "audios");
const COVERS_DIR = path.join(UPLOADS_DIR, "covers");

const PODCASTS_FILE = path.join(DATA_DIR, "podcasts.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, defaultContent) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, "utf8");
  }
}

ensureDir(PUBLIC_DIR);
ensureDir(DATA_DIR);
ensureDir(UPLOADS_DIR);
ensureDir(VIDEOS_DIR);
ensureDir(AUDIOS_DIR);
ensureDir(COVERS_DIR);

ensureFile(PODCASTS_FILE, "[]");
ensureFile(
  ADMIN_FILE,
  JSON.stringify(
    {
      username: "admin",
      passwordHash:
        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    },
    null,
    2
  )
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "video") return cb(null, VIDEOS_DIR);
    if (file.fieldname === "audio") return cb(null, AUDIOS_DIR);
    if (file.fieldname === "cover") return cb(null, COVERS_DIR);
    return cb(new Error("Unknown upload field"));
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, safeName);
  }
});

const upload = multer({ storage });

const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      })
    : null;

app.get("/api/podcasts", (req, res) => {
  const podcasts = readJson(PODCASTS_FILE, []);
  res.json(podcasts);
});

app.get("/api/podcasts/:id", (req, res) => {
  const podcasts = readJson(PODCASTS_FILE, []);
  const id = Number(req.params.id);
  const item = podcasts.find((p) => p.id === id);

  if (!item) {
    return res.status(404).json({ message: "Podcast not found" });
  }

  res.json(item);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const admin = readJson(ADMIN_FILE, null);

  if (!admin || !username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const usernameMatch = username === admin.username;
  const passwordMatch = bcrypt.compareSync(password, admin.passwordHash);

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  req.session.isAdmin = true;
  req.session.username = admin.username;

  res.json({
    message: "Login successful",
    username: admin.username
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({
      isAdmin: true,
      username: req.session.username
    });
  }

  res.json({
    isAdmin: false
  });
});

app.post(
  "/api/upload",
  requireAdmin,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const { title, description } = req.body;
      const videoFile = req.files?.video?.[0];
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];

      if (!title || !description || !videoFile || !audioFile) {
        return res.status(400).json({
          message: "Title, description, video, and audio are required"
        });
      }

      const podcasts = readJson(PODCASTS_FILE, []);
      const newItem = {
        id: podcasts.length ? podcasts[podcasts.length - 1].id + 1 : 1,
        title: title.trim(),
        description: description.trim(),
        videoUrl: `/uploads/videos/${videoFile.filename}`,
        audioUrl: `/uploads/audios/${audioFile.filename}`,
        coverUrl: coverFile ? `/uploads/covers/${coverFile.filename}` : "",
        createdAt: new Date().toISOString()
      };

      podcasts.push(newItem);
      writeJson(PODCASTS_FILE, podcasts);

      res.json({
        message: "Podcast uploaded successfully",
        item: newItem
      });
    } catch (error) {
      res.status(500).json({
        message: "Upload failed",
        error: error.message
      });
    }
  }
);

app.post("/api/contact", async (req, res) => {
  const { category, message, transcript } = req.body;

  if (!category || (!message && !transcript)) {
    return res.status(400).json({
      message: "Category and message are required"
    });
  }

  const fullMessage = [
    `Category: ${category}`,
    "",
    "Message:",
    message || "",
    "",
    "Voice Transcript:",
    transcript || ""
  ].join("\n");

  if (!transporter) {
    return res.status(500).json({
      message: "Email transporter is not configured"
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "soulnotespodcastclub@gmail.com",
      subject: `Soul Notes Contact - ${category}`,
      text: fullMessage
    });

    res.json({
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("MAIL ERROR:", error);
    res.status(500).json({
      message: "Failed to send message",
      error: error.message
    });
}
console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("GMAIL_PASS EXISTS:", !!process.env.GMAIL_PASS);
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
console.log("Server file reached the end");

app.delete("/api/podcasts/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const podcasts = readJson(PODCASTS_FILE, []);
    const target = podcasts.find((item) => item.id === id);

    if (!target) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    const updated = podcasts.filter((item) => item.id !== id);
    writeJson(PODCASTS_FILE, updated);

    res.json({ message: "Podcast deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Delete failed",
      error: error.message
    });
  }
});