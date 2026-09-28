import express from "express";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { WebSocketServer } from "ws";
import yUtils from "y-websocket/bin/utils";
const { setupWSConnection } = yUtils.default || yUtils;
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import Room from "./models/Room.js";
import crypto from "crypto";

connectDB(); // ✅ Only connect once

const app = express();
const server = http.createServer(app);

/* ===================== FIX __dirname FOR ES MODULE ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* ======================================================================= */


/* ===================== MIDDLEWARE ===================== */
app.use(express.json({ limit: '5mb' })); // large limit for avatar uploads
app.use(cookieParser());

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
/* ====================================================== */


/* ===================== AUTH ROUTES ===================== */

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ message: "All fields required" });

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: "User registered" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});


// LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: isProduction ? "none" : "strict",
            secure: isProduction,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ message: "Login successful", user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});


// CHECK AUTH
app.get("/api/me", async (req, res) => {
    const token = req.cookies.token;

    if (!token)
        return res.status(401).json({ authenticated: false });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Fetch fresh user data for avatar
        const freshUser = await User.findById(decoded.id).select('-password');
        res.json({ authenticated: true, user: { id: freshUser._id, name: freshUser.name, email: freshUser.email, avatar: freshUser.avatar } });
    } catch {
        res.status(401).json({ authenticated: false });
    }
});


// LOGOUT
app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
});

// MIDDLEWARE FOR API
const protectRoute = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
};

// CREATE ROOM
app.post("/api/rooms", protectRoute, async (req, res) => {
    try {
        const { name, maxUsers, files, isQuickIDE } = req.body;
        const roomId = crypto.randomBytes(4).toString("hex");

        const newRoom = await Room.create({
            name,
            roomId,
            maxUsers: maxUsers || 10,
            owner: req.user.id,
            files: files || [], // Start with provided files or a blank workspace
            isQuickIDE: isQuickIDE || false
        });
        
        res.status(201).json(newRoom);
    } catch (error) {
        res.status(500).json({ message: "Error creating room" });
    }
});

// VALIDATE ROOM EXISTS
app.get("/api/rooms/:roomId/exists", protectRoute, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ exists: false, message: "Room not found" });
        res.json({ exists: true, name: room.name });
    } catch (error) {
        res.status(500).json({ exists: false, message: "Server error" });
    }
});

// GET ROOM FILES
app.get("/api/rooms/:roomId/files", protectRoute, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });
        // Fallback for legacy rooms without files array
        if (!room.files || room.files.length === 0) {
            room.files = [{ name: "main.js", language: "javascript", content: "// Legacy room default file" }];
            await room.save();
        }
        res.json({ files: room.files, isQuickIDE: room.isQuickIDE });
    } catch (error) {
        res.status(500).json({ message: "Error fetching files" });
    }
});

// SAVE WORKSPACE FILES
app.post("/api/rooms/:roomId/save", protectRoute, async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) return res.status(400).json({ message: "Invalid files format" });
        
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        room.files = files;
        await room.save();
        res.json({ message: "Workspace saved successfully" });
    } catch (error) {
        console.error("Error saving workspace:", error);
        res.status(500).json({ message: "Error saving workspace" });
    }
});

// GET USER'S ROOMS
app.get("/api/rooms", protectRoute, async (req, res) => {
    try {
        const userRooms = await Room.find({ owner: req.user.id });
        res.json(userRooms);
    } catch (error) {
        res.status(500).json({ message: "Error fetching rooms" });
    }
});

// UPDATE ROOM (RENAME)
app.put("/api/rooms/:roomId", protectRoute, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });
        
        const room = await Room.findOneAndUpdate(
            { roomId: req.params.roomId, owner: req.user.id },
            { name },
            { new: true }
        );
        if (!room) return res.status(404).json({ message: "Room not found or unauthorized" });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Error updating room" });
    }
});

// DELETE ROOM
app.delete("/api/rooms/:roomId", protectRoute, async (req, res) => {
    try {
        const room = await Room.findOneAndDelete({ roomId: req.params.roomId, owner: req.user.id });
        if (!room) return res.status(404).json({ message: "Room not found or unauthorized" });
        res.json({ message: "Room deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting room" });
    }
});

/* ====================================================== */

/* ===================== AVATAR UPLOAD ===================== */
app.post("/api/avatar", protectRoute, async (req, res) => {
    try {
        const { avatar } = req.body; // base64 data URI
        if (!avatar) return res.status(400).json({ message: "No avatar provided" });
        await User.findByIdAndUpdate(req.user.id, { avatar });
        res.json({ message: "Avatar updated", avatar });
    } catch (error) {
        res.status(500).json({ message: "Error updating avatar" });
    }
});
/* ========================================================= */

/* ===================== CODE EXECUTION (JUDGE0 API) ===================== */
const JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=true&wait=true";

// Map editor language names → Judge0 language IDs
const LANGUAGE_IDS = {
    javascript: 93,  // Node.js 18.15.0
    python:     109, // Python 3.13.2
    cpp:        105, // C++ (GCC 14.1.0)
    java:       91,  // Java (JDK 17.0.6)
};

app.post("/api/execute", protectRoute, async (req, res) => {
    const { code, language, stdin } = req.body;

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
        return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    try {
        // Encode source code & stdin as base64 for safe transport
        const encodedCode  = Buffer.from(code).toString("base64");
        const encodedStdin = stdin ? Buffer.from(stdin).toString("base64") : "";

        const { data } = await axios.post(JUDGE0_URL, {
            language_id: languageId,
            source_code: encodedCode,
            stdin:       encodedStdin,
        }, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000, // 30 s ceiling
        });

        // Decode base64 outputs returned by Judge0
        const decode = (b64) => b64 ? Buffer.from(b64, "base64").toString("utf-8") : "";

        const stdout = decode(data.stdout);
        const stderr = decode(data.stderr);
        const compileOutput = decode(data.compile_output);

        // Judge0 status id 3 = Accepted (ran successfully)
        const exitCode = data.status?.id === 3 ? 0 : 1;

        res.json({
            run: {
                stdout: stdout || "",
                stderr: stderr || compileOutput || "",
                code:   exitCode,
            },
        });
    } catch (error) {
        console.error("Judge0 execution error:", error.message);
        const msg = error.response?.data?.message || error.message || "Execution failed";
        res.status(500).json({ message: msg });
    }
});
/* ======================================================================= */

/* ===================== Y.JS WEBSOCKET SERVER ===================== */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    // 1. Authenticate using JWT cookie
    const cookieHeader = req.headers.cookie || "";
    const token = cookieHeader
        .split("; ")
        .find(row => row.startsWith("token="))
        ?.split("=")[1];

    if (!token) {
        ws.close(4001, "Unauthorized");
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.user = decoded; // attach user info
    } catch {
        ws.close(4001, "Invalid Token");
        return;
    }

    // 2. Hand off connection to Y.js handler
    // The request URL contains the room name (e.g. /room/roomId)
    setupWSConnection(ws, req);
});
/* ================================================================= */


/* ===================== STATIC FRONTEND ===================== */
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});
/* ========================================================== */

server.listen(process.env.PORT, () => {
    console.log(`Server running at port ${process.env.PORT}`);
});
