import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { searchBusinessesController } from "../controllers/agent.controller.js";

export const agentRoutes = express.Router();

agentRoutes.post("/search", authMiddleware, searchBusinessesController);
