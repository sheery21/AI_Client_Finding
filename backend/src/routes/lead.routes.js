import express from "express";
import { createLead, deleteLead, getLeadById, getLeads } from "../controllers/lead.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export const leadRoutes = express.Router();

leadRoutes.post("/", authMiddleware, createLead);
leadRoutes.get("/", authMiddleware, getLeads);
leadRoutes.get("/:id", authMiddleware, getLeadById);
leadRoutes.delete("/:id", authMiddleware, deleteLead);