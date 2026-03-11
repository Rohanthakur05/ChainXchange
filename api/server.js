/**
 * api/server.js — Vercel Serverless Entry Point
 *
 * Vercel invokes this file for all routes matched in vercel.json.
 * We import the Express app and export it as a serverless handler.
 *
 * NOTE: Socket.io real-time features won't work on Vercel serverless
 * (stateless, no persistent connections). The app will function fully
 * for REST API calls; live price updates via WebSocket need a separate
 * long-running server (Railway, Render, etc.) if needed.
 */

const app = require('../app');

module.exports = app;
