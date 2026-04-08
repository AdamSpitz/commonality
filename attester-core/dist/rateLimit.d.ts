import type { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
}
export declare function createRateLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void;
export declare function cleanupExpiredRateLimits(): void;
export declare function getRateLimitStoreSize(): number;
export {};
//# sourceMappingURL=rateLimit.d.ts.map