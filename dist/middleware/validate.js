"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParamId = validateParamId;
const apiResponse_1 = require("../utils/apiResponse");
const objectId_1 = require("../utils/objectId");
const errorHandler_1 = require("./errorHandler");
function getParseTarget(req, target) {
    return target === 'body' ? req.body : req.query;
}
function setValidated(req, target, data) {
    req[target === 'body' ? 'validatedBody' : 'validatedQuery'] = data;
}
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(getParseTarget(req, 'body'));
        if (!result.success) {
            const details = result.error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            }));
            (0, apiResponse_1.validationError)(res, details);
            return;
        }
        setValidated(req, 'body', result.data);
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(getParseTarget(req, 'query'));
        if (!result.success) {
            const details = result.error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            }));
            (0, apiResponse_1.validationError)(res, details);
            return;
        }
        setValidated(req, 'query', result.data);
        next();
    };
}
/** Middleware: ensure req.params[paramKey] is a valid MongoDB ObjectId; calls next(AppError(400)) if not. */
function validateParamId(paramKey = 'id') {
    return (req, _res, next) => {
        const id = req.params[paramKey];
        if (!id) {
            next(new errorHandler_1.AppError(400, 'Missing ID'));
            return;
        }
        try {
            (0, objectId_1.parseObjectId)(id, `Invalid ${paramKey}`);
        }
        catch (err) {
            next(err);
            return;
        }
        next();
    };
}
