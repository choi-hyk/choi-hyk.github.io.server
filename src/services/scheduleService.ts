import pool from "../db";

export async function getAllEvents() {
    const [rows] = await pool.query("SELECT id, title, start, end FROM events");
    return rows;
}

export async function create(title: string, date: string) {
    await pool.query("INSERT INTO schedules (title, date) VALUES (?, ?)", [
        title,
        date,
    ]);
}
