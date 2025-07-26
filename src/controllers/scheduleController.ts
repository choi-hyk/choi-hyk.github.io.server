import { Request, Response } from "express";
import * as service from "../services/scheduleService";

export async function getAllSchedules(req: Request, res: Response) {
    const data = await service.getAllEvents();
    res.json(data);
}

export async function createSchedule(req: Request, res: Response) {
    const { title, date } = req.body;
    await service.create(title, date);
    res.status(201).json({ message: "created" });
}
