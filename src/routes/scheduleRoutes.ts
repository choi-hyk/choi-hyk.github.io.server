import { Router } from "express";
import {
    getAllSchedules,
    createSchedule,
} from "../controllers/scheduleController";

const router = Router();

router.get("/", getAllSchedules);
router.post("/", createSchedule);

export default router;
