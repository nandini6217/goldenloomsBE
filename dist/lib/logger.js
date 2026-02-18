"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Simple structured logger. Replace with pino or another logger for production.
 */
function log(level, message, meta) {
    const payload = { level, message, ...meta, timestamp: new Date().toISOString() };
    if (level === 'error') {
        console.error(JSON.stringify(payload));
    }
    else {
        console.log(JSON.stringify(payload));
    }
}
exports.logger = {
    info: (message, meta) => log('info', message, meta),
    error: (message, meta) => log('error', message, meta),
};
