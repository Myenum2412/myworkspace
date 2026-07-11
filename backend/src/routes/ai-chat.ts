import { Router, Request, Response } from "express";
import { ChatLogRepository } from "../services/ai/repositories/chat-log.repository.js";
import { logger } from "../lib/logger/index.js";

const router = Router();
const chatLogRepo = new ChatLogRepository();

// Get chat logs
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const { phone, intent, limit, offset } = req.query;

    let logs;
    if (phone) {
      logs = await chatLogRepo.getLogsByCustomer(phone as string, {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
    } else if (intent) {
      logs = await chatLogRepo.getLogsByIntent(intent as string, {
        limit: limit ? parseInt(limit as string) : 100,
      });
    } else {
      logs = await chatLogRepo.getLogsByCustomer("", {
        limit: limit ? parseInt(limit as string) : 50,
      });
    }

    res.json({ success: true, data: logs });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch chat logs");
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get chat statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const options: { startDate?: Date; endDate?: Date } = {};
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    const stats = await chatLogRepo.getStats(options);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch chat stats");
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get logs by customer
router.get("/customer/:phone", async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { limit, offset } = req.query;

    const logs = await chatLogRepo.getLogsByCustomer(String(phone), {
      limit: limit ? parseInt(String(limit)) : 50,
      offset: offset ? parseInt(String(offset)) : 0,
    });

    res.json({ success: true, data: logs });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch customer logs");
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get logs by intent
router.get("/intent/:intent", async (req: Request, res: Response) => {
  try {
    const { intent } = req.params;
    const { limit, startDate, endDate } = req.query;

    const options: { limit?: number; startDate?: Date; endDate?: Date } = {
      limit: limit ? parseInt(String(limit)) : 100,
    };
    if (startDate) options.startDate = new Date(String(startDate));
    if (endDate) options.endDate = new Date(String(endDate));

    const logs = await chatLogRepo.getLogsByIntent(String(intent), options);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch intent logs");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
