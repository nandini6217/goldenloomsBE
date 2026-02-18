"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.validationError = validationError;
function success(res, data, status = 200) {
    res.status(status).json(data);
}
function error(res, message, status = 400, code) {
    const payload = { error: message };
    if (code)
        payload.code = code;
    res.status(status).json(payload);
}
function validationError(res, details) {
    res.status(400).json({ error: 'Validation failed', details });
}
