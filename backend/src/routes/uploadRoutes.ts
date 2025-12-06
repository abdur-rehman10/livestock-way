import express, { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import authRequired from "../middlewares/auth";

const router = Router();
router.use(authRequired);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = crypto.randomBytes(8).toString("hex");
    cb(null, `${base}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or image files are allowed"));
    }
  },
});

router.post("/epod", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "ERROR", message: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  return res.status(200).json({ status: "OK", url });
});

router.post("/kyc", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "ERROR", message: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  return res.status(200).json({ status: "OK", url });
});

// Multer error handler to send clear messages
router.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: "ERROR", message: "File too large (max 20MB)" });
    }
    return res.status(400).json({ status: "ERROR", message: err.message || "Upload failed" });
  }
  if (err) {
    return res.status(400).json({ status: "ERROR", message: err.message || "Upload failed" });
  }
  return res.status(500).json({ status: "ERROR", message: "Unexpected upload error" });
});

export default router;
