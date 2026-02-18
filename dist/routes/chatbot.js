"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChatbotLead_1 = require("../models/ChatbotLead");
const chatbot_1 = require("../validators/chatbot");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const parsed = chatbot_1.createChatbotLeadSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
        return;
    }
    const lead = await ChatbotLead_1.ChatbotLead.create(parsed.data);
    res.status(201).json({ success: true, id: lead._id });
});
exports.default = router;
