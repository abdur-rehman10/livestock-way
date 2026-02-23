import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

/* ── helpers ── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── upload setup (reuses same uploads/ dir) ── */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `blog-${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

/* ═══════════════════════════════════════════════
   PUBLIC endpoints (no auth)
   ═══════════════════════════════════════════════ */

// List published blogs (paginated)
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    let where = "WHERE published = TRUE";
    const params: (string | number)[] = [];

    if (category && category !== "All") {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM blogs ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT id, slug, title, excerpt, cover_image, author, category, tags,
              published_at, created_at
       FROM blogs ${where}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      blogs: dataRes.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /blogs error:", err);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Get single published blog by slug
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT * FROM blogs WHERE slug = $1 AND published = TRUE`,
      [slug]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Blog not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /blogs/slug/:slug error:", err);
    res.status(500).json({ error: "Failed to fetch blog" });
  }
});

// Get published categories
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM blogs WHERE published = TRUE AND category IS NOT NULL ORDER BY category`
    );
    res.json(result.rows.map((r: { category: string }) => r.category));
  } catch (err) {
    console.error("GET /blogs/categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/* ═══════════════════════════════════════════════
   ADMIN endpoints (super-admin only)
   ═══════════════════════════════════════════════ */

// List ALL blogs (including drafts)
router.get(
  "/admin/list",
  authRequired,
  requireRoles(["super-admin"]),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const countRes = await pool.query(`SELECT COUNT(*) FROM blogs`);
      const total = parseInt(countRes.rows[0].count, 10);

      const dataRes = await pool.query(
        `SELECT * FROM blogs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.json({
        blogs: dataRes.rows,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error("GET /blogs/admin/list error:", err);
      res.status(500).json({ error: "Failed to fetch blogs" });
    }
  }
);

// Get single blog by id (admin — includes drafts)
router.get(
  "/admin/:id",
  authRequired,
  requireRoles(["super-admin"]),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`SELECT * FROM blogs WHERE id = $1`, [
        req.params.id,
      ]);
      if (!result.rowCount) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("GET /blogs/admin/:id error:", err);
      res.status(500).json({ error: "Failed to fetch blog" });
    }
  }
);

// Create blog
router.post(
  "/admin",
  authRequired,
  requireRoles(["super-admin"]),
  async (req: Request, res: Response) => {
    try {
      const { title, excerpt, content, cover_image, author, category, tags, published } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "title and content are required" });
      }

      let slug = slugify(title);
      const existing = await pool.query(`SELECT id FROM blogs WHERE slug = $1`, [slug]);
      if (existing.rowCount) slug += `-${Date.now()}`;

      const userId = (req as any).user?.id || null;
      const pub = published === true;
      const pubAt = pub ? new Date().toISOString() : null;

      const result = await pool.query(
        `INSERT INTO blogs (slug, title, excerpt, content, cover_image, author, category, tags, published, published_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [slug, title, excerpt || null, content, cover_image || null, author || null, category || null, tags || [], pub, pubAt, userId]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /blogs/admin error:", err);
      res.status(500).json({ error: "Failed to create blog" });
    }
  }
);

// Update blog
router.patch(
  "/admin/:id",
  authRequired,
  requireRoles(["super-admin"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(`SELECT * FROM blogs WHERE id = $1`, [id]);
      if (!existing.rowCount) return res.status(404).json({ error: "Not found" });

      const old = existing.rows[0];
      const { title, excerpt, content, cover_image, author, category, tags, published } = req.body;

      let slug = old.slug;
      if (title && title !== old.title) {
        slug = slugify(title);
        const dup = await pool.query(`SELECT id FROM blogs WHERE slug = $1 AND id != $2`, [slug, id]);
        if (dup.rowCount) slug += `-${Date.now()}`;
      }

      const pub = published !== undefined ? published === true : old.published;
      let pubAt = old.published_at;
      if (pub && !old.published) pubAt = new Date().toISOString();

      const result = await pool.query(
        `UPDATE blogs SET slug=$1, title=$2, excerpt=$3, content=$4, cover_image=$5,
         author=$6, category=$7, tags=$8, published=$9, published_at=$10, updated_at=NOW()
         WHERE id=$11 RETURNING *`,
        [
          slug,
          title ?? old.title,
          excerpt !== undefined ? excerpt : old.excerpt,
          content ?? old.content,
          cover_image !== undefined ? cover_image : old.cover_image,
          author !== undefined ? author : old.author,
          category !== undefined ? category : old.category,
          tags ?? old.tags,
          pub,
          pubAt,
          id,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /blogs/admin/:id error:", err);
      res.status(500).json({ error: "Failed to update blog" });
    }
  }
);

// Delete blog
router.delete(
  "/admin/:id",
  authRequired,
  requireRoles(["super-admin"]),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`DELETE FROM blogs WHERE id = $1 RETURNING id`, [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /blogs/admin/:id error:", err);
      res.status(500).json({ error: "Failed to delete blog" });
    }
  }
);

// Upload cover image
router.post(
  "/admin/upload-cover",
  authRequired,
  requireRoles(["super-admin"]),
  upload.single("cover"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (err) {
      console.error("POST /blogs/admin/upload-cover error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
