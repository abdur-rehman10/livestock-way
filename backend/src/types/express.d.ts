import "express";

declare global {
  namespace Express {
    interface AuthenticatedUserPayload {
      id?: string | number;
      user_type?: string | null;
      company_id?: string | number | null;
      account_status?: string | null;
    }

    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

export {};
