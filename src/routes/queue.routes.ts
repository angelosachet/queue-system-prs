import { Router } from "express";
import { QueueController } from "../controllers/queue.controller";

const router = Router();
const controller = new QueueController();

router.post("/", (req, res) => controller.addPlayer(req, res)); // add player
router.get("/", (req, res) => controller.listAllQueues(req, res)); // list all queues
router.get("/:simulatorId", (req, res) => controller.listQueue(req, res)); // list queue
router.delete("/:queueId", (req, res) => controller.removePlayer(req, res)); // remove player
router.put("/:queueId/move", (req, res) => controller.movePlayer(req, res)); // move position

export { router as queueRouter };
