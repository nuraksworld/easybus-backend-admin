import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  listBuses,
  createBus,
  updateBus,
  deleteBus,
} from "../controllers/buses.controller.js";

const r = Router();

r.get("/", auth(), listBuses);
r.post("/", auth(), createBus);

// IMPORTANT: updateBus now supports partial update (PATCH-like)
r.put("/:id", auth(), updateBus);

// deleteBus now falls back to soft delete if FK blocks delete
r.delete("/:id", auth("SUPER"), deleteBus);

export default r;
