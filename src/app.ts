import express from "express";
import cors from "cors";
import pool from "./db";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => {
    res.json({ message: "pong", time: new Date() });
});

app.get("/events", async (req, res) => {
    const [rows] = await pool.query("SELECT id, title, start, end FROM events");
    res.json(rows);
});

app.post("/events", async (req, res) => {
    const { title, start, end } = req.body;
    await pool.query(
        "INSERT INTO events (title, start, end) VALUES (?, ?, ?)",
        [title, start, end]
    );
    res.status(201).json({ message: "created" });
});

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
