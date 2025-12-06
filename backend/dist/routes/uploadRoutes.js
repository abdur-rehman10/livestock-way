"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
router.use(auth_1.default);
const uploadsDir = path_1.default.join(__dirname, "..", "..", "uploads");
fs_1.default.mkdirSync(uploadsDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const base = crypto_1.default.randomBytes(8).toString("hex");
        cb(null, `${base}${ext}`);
    },
});
const allowedMimeTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
]);
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            cb(null, true);
        }
        else {
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
router.use((err, _req, res, _next) => {
    if (err instanceof multer_1.default.MulterError) {
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
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map