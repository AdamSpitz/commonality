/**
 * Main API router.
 *
 * REST only. GraphQL and /sql are gone; liveness is GET /health and height is GET /status.
 * REST handlers live in restApp.ts so the raw-log engine can serve the same routes.
 */

import { Hono } from "hono";
import { attachRest } from "./restApp";
import { ponderEventStore } from "./ponderEventStore";

const app = new Hono();

attachRest(app, ponderEventStore());

app.get("/health", c => c.json({ ok: true }));

export default app;
