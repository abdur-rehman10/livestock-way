"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = __importDefault(require("../middlewares/auth"));
const rbac_1 = require("../middlewares/rbac");
const auditLogger_1 = require("../middlewares/auditLogger");
const applicantRoles = [
    "hauler",
    "shipper",
    "stakeholder",
    "driver",
];
function normalizeStatus(value) {
    const normalized = value?.toLowerCase();
    if (!normalized)
        return null;
    if (normalized === "pending" || normalized === "pending_verification") {
        return "pending_verification";
    }
    if (normalized === "approved" || normalized === "verified") {
        return "verified";
    }
    if (normalized === "rejected") {
        return "rejected";
    }
    return null;
}
async function fetchRequestById(id) {
    const request = await database_1.pool.query(`
      SELECT
        r.*,
        u.full_name,
        u.email,
        u.user_type
      FROM kyc_requests r
      JOIN app_users u ON u.id = r.user_id
      WHERE r.id = $1
    `, [id]);
    if (request.rowCount === 0) {
        return null;
    }
    const docs = await database_1.pool.query(`SELECT id, doc_type, file_url, uploaded_at FROM kyc_documents WHERE kyc_request_id = $1 ORDER BY uploaded_at ASC`, [id]);
    return {
        ...request.rows[0],
        documents: docs.rows,
    };
}
async function fetchLatestRequestForUser(userId) {
    const { rows } = await database_1.pool.query(`
      SELECT r.*, u.full_name, u.email, u.user_type
      FROM kyc_requests r
      JOIN app_users u ON u.id = r.user_id
      WHERE r.user_id = $1
      ORDER BY r.submitted_at DESC
      LIMIT 1
    `, [userId]);
    if (rows.length === 0) {
        return null;
    }
    const request = rows[0];
    const docs = await database_1.pool.query(`SELECT id, doc_type, file_url, uploaded_at FROM kyc_documents WHERE kyc_request_id = $1 ORDER BY uploaded_at ASC`, [request.id]);
    return {
        ...request,
        documents: docs.rows,
    };
}
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.get("/requests/me", (0, rbac_1.requireRoles)(applicantRoles), async (req, res) => {
    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const request = await fetchLatestRequestForUser(userId);
        if (!request) {
            return res.json(null);
        }
        return res.json(request);
    }
    catch (error) {
        console.error("GET /api/kyc/requests/me error", error);
        return res.status(500).json({ message: "Failed to load KYC request" });
    }
});
router.post("/requests", (0, rbac_1.requireRoles)(applicantRoles), (0, auditLogger_1.auditRequest)("kyc:submit"), async (req, res) => {
    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const documents = Array.isArray(req.body?.documents)
        ? req.body.documents
        : [];
    if (documents.length === 0) {
        return res.status(400).json({ message: "At least one document is required" });
    }
    if (documents.some((doc) => !doc.doc_type || !doc.file_url)) {
        return res
            .status(400)
            .json({ message: "Each document must include doc_type and file_url" });
    }
    try {
        const requestResult = await database_1.pool.query(`
          INSERT INTO kyc_requests (user_id, status)
          VALUES ($1, 'pending_verification')
          RETURNING *
        `, [userId]);
        const request = requestResult.rows[0];
        const values = [];
        const placeholders = [];
        documents.forEach((doc, index) => {
            values.push(request.id, doc.doc_type, doc.file_url);
            placeholders.push(`($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`);
        });
        await database_1.pool.query(`INSERT INTO kyc_documents (kyc_request_id, doc_type, file_url) VALUES ${placeholders.join(", ")}`, values);
        const response = await fetchRequestById(request.id);
        return res.status(201).json(response);
    }
    catch (error) {
        console.error("POST /api/kyc/requests error", error);
        return res.status(500).json({ message: "Failed to submit KYC" });
    }
});
router.get("/requests", (0, rbac_1.requireRoles)(["super-admin"]), async (req, res) => {
    const statusFilter = req.query.status ? normalizeStatus(String(req.query.status)) : null;
    try {
        const values = [];
        const where = [];
        if (statusFilter) {
            values.push(statusFilter);
            where.push(`r.status = $${values.length}::document_status_enum`);
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const query = `
        SELECT
          r.*,
          u.full_name,
          u.email,
          u.user_type
        FROM kyc_requests r
        JOIN app_users u ON u.id = r.user_id
        ${whereSql}
        ORDER BY
          CASE WHEN r.status = 'pending_verification' THEN 0 ELSE 1 END,
          r.submitted_at DESC
        LIMIT 200
      `;
        const result = await database_1.pool.query(query, values);
        const requestIds = result.rows.map((row) => row.id);
        const documents = requestIds.length > 0
            ? await database_1.pool.query(`SELECT id, kyc_request_id, doc_type, file_url, uploaded_at
               FROM kyc_documents
               WHERE kyc_request_id = ANY($1::bigint[])
               ORDER BY uploaded_at ASC`, [requestIds])
            : { rows: [] };
        const docsByRequest = new Map();
        documents.rows.forEach((doc) => {
            const list = docsByRequest.get(doc.kyc_request_id) ?? [];
            list.push({
                id: doc.id,
                doc_type: doc.doc_type,
                file_url: doc.file_url,
                uploaded_at: doc.uploaded_at,
            });
            docsByRequest.set(doc.kyc_request_id, list);
        });
        const payload = result.rows.map((row) => ({
            ...row,
            documents: docsByRequest.get(row.id) ?? [],
        }));
        return res.json(payload);
    }
    catch (error) {
        console.error("GET /api/kyc/requests error", error);
        return res.status(500).json({ message: "Failed to load KYC requests" });
    }
});
router.patch("/requests/:id/review", (0, rbac_1.requireRoles)(["super-admin"]), (0, auditLogger_1.auditRequest)("kyc:review", (req) => `kyc_request:${req.params.id}`), async (req, res) => {
    const requestId = Number(req.params.id);
    if (Number.isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid KYC request id" });
    }
    const status = normalizeStatus(req.body?.status);
    if (!status || status === "pending_verification") {
        return res.status(400).json({ message: "Status must be approved or rejected" });
    }
    const notes = typeof req.body?.review_notes === "string" ? req.body.review_notes : null;
    try {
        const request = await database_1.pool.query(`SELECT * FROM kyc_requests WHERE id = $1`, [requestId]);
        if (request.rowCount === 0) {
            return res.status(404).json({ message: "KYC request not found" });
        }
        await database_1.pool.query(`
          UPDATE kyc_requests
          SET status = $1,
              reviewed_at = NOW(),
              review_notes = $2
          WHERE id = $3
        `, [status, notes, requestId]);
        if (status === "verified") {
            await database_1.pool.query(`UPDATE app_users SET account_status = 'verified' WHERE id = $1`, [request.rows[0].user_id]);
        }
        else if (status === "rejected") {
            await database_1.pool.query(`UPDATE app_users SET account_status = 'rejected' WHERE id = $1`, [request.rows[0].user_id]);
        }
        const updated = await fetchRequestById(requestId);
        return res.json(updated);
    }
    catch (error) {
        console.error("PATCH /api/kyc/requests/:id/review error", error);
        return res.status(500).json({ message: "Failed to update KYC request" });
    }
});
exports.default = router;
//# sourceMappingURL=kycRoutes.js.map