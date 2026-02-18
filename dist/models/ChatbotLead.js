"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotLead = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const chatbotLeadSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    productTypeRequired: { type: String, required: true },
    message: { type: String, default: '' },
}, { timestamps: true });
exports.ChatbotLead = mongoose_1.default.model('ChatbotLead', chatbotLeadSchema);
