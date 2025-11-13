import { Request, Response } from "express";
export declare function getLoads(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createLoad(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function assignLoad(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function startLoad(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function completeLoad(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getLoadById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=loadController.d.ts.map