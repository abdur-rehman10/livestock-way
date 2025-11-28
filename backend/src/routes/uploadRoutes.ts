import { Router } from "express";
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

const upload = multer({ storage });

router.post("/epod", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "ERROR", message: "No file uploaded" });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(200).json({ status: "OK", url });
});

router.post("/kyc", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "ERROR", message: "No file uploaded" });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(200).json({ status: "OK", url });
});

export default router;
