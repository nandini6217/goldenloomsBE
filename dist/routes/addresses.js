"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Address_1 = require("../models/Address");
const auth_1 = require("../middleware/auth");
const address_1 = require("../validators/address");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// List my addresses (customer only)
router.get('/', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    const addresses = await Address_1.Address.find({ userId }).sort({ isDefault: -1, createdAt: 1 }).lean();
    res.json(addresses);
});
// Create address (customer only)
router.post('/', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const parsed = address_1.createAddressSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
        return;
    }
    const data = parsed.data;
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    if (data.isDefault) {
        await Address_1.Address.updateMany({ userId }, { isDefault: false });
    }
    const address = await Address_1.Address.create({
        userId,
        ...data,
    });
    res.status(201).json(address);
});
// Update address (customer only, own address)
router.put('/:id', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid address ID' });
        return;
    }
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    const existing = await Address_1.Address.findOne({ _id: id, userId });
    if (!existing) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    const parsed = address_1.updateAddressSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
        return;
    }
    const data = parsed.data;
    if (data.isDefault) {
        await Address_1.Address.updateMany({ userId }, { isDefault: false });
    }
    const address = await Address_1.Address.findByIdAndUpdate(id, data, { new: true }).lean();
    res.json(address);
});
// Set default address (customer only)
router.patch('/:id/default', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid address ID' });
        return;
    }
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    const existing = await Address_1.Address.findOne({ _id: id, userId });
    if (!existing) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    await Address_1.Address.updateMany({ userId }, { isDefault: false });
    await Address_1.Address.findByIdAndUpdate(id, { isDefault: true });
    const address = await Address_1.Address.findById(id).lean();
    res.json(address);
});
// Delete address (customer only, own address)
router.delete('/:id', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid address ID' });
        return;
    }
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    const deleted = await Address_1.Address.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    res.json({ deleted: true });
});
exports.default = router;
