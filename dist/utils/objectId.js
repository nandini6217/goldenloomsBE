"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseObjectId = parseObjectId;
exports.isValidObjectId = isValidObjectId;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
function parseObjectId(id, message = 'Invalid ID') {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new errorHandler_1.AppError(400, message);
    }
    return new mongoose_1.default.Types.ObjectId(id);
}
function isValidObjectId(id) {
    return mongoose_1.default.Types.ObjectId.isValid(id);
}
