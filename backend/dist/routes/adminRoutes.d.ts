export declare function isSuperAdminUser(user?: {
    user_type?: string | null;
}): boolean;
export declare function computePayingStatus(subscriptionStatus?: string | null, currentPeriodEnd?: string | null): "PAID" | "UNPAID";
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=adminRoutes.d.ts.map