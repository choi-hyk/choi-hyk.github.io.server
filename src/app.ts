import express from "express";
import cors from "cors";
import pool from "./db";
import axios from "axios";
import Parser from "rss-parser";

const app = express();
const PORT = 3000;
const parser = new Parser();

app.use(cors());
app.use(express.json());

// ping check
app.get("/ping", (req, res) => {
    res.json({ message: "pong", time: new Date() });
});

// Calender--------------------------------------------------------------
// GET Events
app.get("/events", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, title, start, end, description FROM events"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

// POST Events
app.post("/events", async (req, res) => {
    try {
        const { title, start, end } = req.body;
        await pool.query(
            "INSERT INTO events (title, start, end) VALUES (?, ?, ?)",
            [title, start, end]
        );
        res.status(201).json({ message: "created" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create event" });
    }
});

// Velog-----------------------------------------------------------------
app.get("/velog", async (req, res) => {
    try {
        const url = `https://v2.velog.io/rss/choi-hyk`;
        const xml = await axios.get<string>(url);
        const feed = await parser.parseString(xml.data);
        const posts = feed.items.map((item, index, array) => {
            const rawTitle = item.title ?? "";
            const tagMatch = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
            return {
                id: array.length - 1 - index,
                tag: tagMatch ? tagMatch[1] : null,
                title: tagMatch ? tagMatch[2] : rawTitle,
                link: item.link,
                pubDate: item.pubDate,
                description: item.contentSnippet,
            };
        });
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch Velog RSS" });
    }
});

// ----------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
