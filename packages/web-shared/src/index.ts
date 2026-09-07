/**
 * @fileoverview Barrel for @magic/web-shared. Provides types and helpers shared
 * between the Fastify server and the React/Preact client. Keeps API contracts
 * in one place so client and server cannot drift.
 */

export * from './auth.js';
export * from './ws_auth.js';
