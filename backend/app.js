import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { dbConnect } from "./src/config/db.js";
import { authRoutes } from "./src/routes/auth.routes.js";
import { leadRoutes } from "./src/routes/lead.routes.js";
import { agentRoutes } from "./src/routes/agent.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dbConnect();

app.get("/get", (req, res) => {
  res.json({
    message: "hello",
  });
});

// 1. Auth Routes
app.use("/api/auth", authRoutes);

// 2. Lead Routes
app.use("/api/leads", leadRoutes);

// 3. Agent Routes

app.use("/api/agent", agentRoutes);

app.listen(PORT, () =>
  console.log(`server running on ${process.env.LOCAL_HOST}${PORT}`),
);
