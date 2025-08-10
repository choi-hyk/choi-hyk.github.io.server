import express from "express";
import cors from "cors";
import pool from "./db";
import axios from "axios";
import Parser from "rss-parser";
import TurndownService from "turndown";

const app = express();
const PORT = 3000;
const parser = new Parser();
const turndownService = new TurndownService();

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
        res.status(500).json({
            error: "Failed to fetch events",
            message: err,
        });
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
        res.status(500).json({
            error: "Failed to create event",
            message: err,
        });
    }
});

// GitHub----------------------------------------------------------------
const buildHeaders = () => {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

// GET GitHub Profile
app.get("/github/profile", async (req, res) => {
    try {
        const resGithub = await fetch(`https://api.github.com/users/choi-hyk`, {
            headers: buildHeaders(),
        });
        const data = await resGithub.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to fetch GitHub profile",
            message: err,
        });
    }
});

// GET GitHub Repositories & Pull requests & Issues
app.get("/github/repo", async (req, res) => {
    try {
        const headers = buildHeaders();

        const resGithub = await fetch(
            "https://api.github.com/users/choi-hyk/repos",
            { headers }
        );
        const repos = await resGithub.json();
        const originalRepos = repos.filter((repo: any) => !repo.fork);

        const pullPromises = originalRepos.map(async (repo: any) => {
            const resPulls = await fetch(
                `https://api.github.com/repos/choi-hyk/${repo.name}/pulls?state=all`,
                { headers }
            );
            const pulls = await resPulls.json();
            if (!Array.isArray(pulls)) return [];
            return pulls.map((pull) => ({
                ...pull,
                repoName: repo.name,
            }));
        });

        const issuePromises = originalRepos.map(async (repo: any) => {
            const resIssues = await fetch(
                `https://api.github.com/repos/choi-hyk/${repo.name}/issues?state=all`,
                { headers }
            );
            const issues = await resIssues.json();
            if (!Array.isArray(issues)) return [];
            return issues
                .filter((issue) => !issue.pull_request)
                .map((issue) => ({
                    ...issue,
                    repoName: repo.name,
                }));
        });

        const [pullsArray, issuesArray] = await Promise.all([
            Promise.all(pullPromises),
            Promise.all(issuePromises),
        ]);

        res.json({
            repositories: originalRepos,
            pullRequests: pullsArray.flat(),
            issues: issuesArray.flat(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to fetch GitHub repositories",
            message: err,
        });
    }
});

// Velog-----------------------------------------------------------------
// GET Velog Posts
app.get("/velog", async (req, res) => {
    try {
        const url = `https://v2.velog.io/rss/choi-hyk`;
        const xml = await axios.get<string>(url);
        const feed = await parser.parseString(xml.data);
        const posts = feed.items.map((item, index, array) => {
            const html = (item["content:encoded"] ||
                item.content ||
                item.contentSnippet ||
                "") as string;
            const markdown = turndownService.turndown(html);
            const rawTitle = item.title ?? "";
            const tagMatch = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
            return {
                id: array.length - 1 - index,
                tag: tagMatch ? tagMatch[1] : null,
                title: tagMatch ? tagMatch[2] : rawTitle,
                link: item.link,
                pubDate: item.pubDate,
                description: markdown,
            };
        });
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to fetch Velog RSS",
            message: err,
        });
    }
});

// ----------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
