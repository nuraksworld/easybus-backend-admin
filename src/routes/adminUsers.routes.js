import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { getAdminUsers } from "../controllers/adminUsers.controller.js";

const r = Router();

// FINAL URL: GET /api/admin/users
r.get("/users", auth(), getAdminUsers);

export default r;
