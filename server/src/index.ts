import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { settingsRouter } from "./routes/settings.js";
import { salesRouter } from "./routes/sales.js";
import { reportsRouter } from "./routes/reports.js";
import { usersRouter } from "./routes/users.js";
import { uploadsRouter } from "./routes/uploads.js";
import { uploadsDir } from "./lib/uploads.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/users", usersRouter);
app.use("/api/uploads", uploadsRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
