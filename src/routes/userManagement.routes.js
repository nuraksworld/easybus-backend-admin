// src/routes/userManagement.routes.js
import { Router } from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userManagement.controller.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// 🔒 Admin-only routes
router.get("/", auth(), listUsers);     // GET /api/user-mgmt
router.get("/:id", auth(), getUser);    // GET /api/user-mgmt/:id
router.post("/", auth(), createUser);   // POST /api/user-mgmt
router.put("/:id", auth(), updateUser); // PUT /api/user-mgmt/:id
router.delete("/:id", auth(), deleteUser); // DELETE /api/user-mgmt/:id

export default router;
