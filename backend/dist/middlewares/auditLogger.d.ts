import { Request, Response, NextFunction } from "express";
type ResourceResolver = (req: Request, res: Response) => string | undefined;
export declare function auditRequest(action: string, resolveResource?: ResourceResolver): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auditLogger.d.ts.map