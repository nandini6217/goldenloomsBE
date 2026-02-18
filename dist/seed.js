"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const AdminUser_1 = require("./models/AdminUser");
const Product_1 = require("./models/Product");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@goldenlooms.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
async function seed() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }
    await mongoose_1.default.connect(MONGODB_URI);
    const existingAdmin = await AdminUser_1.AdminUser.findOne({ email: ADMIN_EMAIL });
    if (!existingAdmin) {
        const passwordHash = await bcrypt_1.default.hash(ADMIN_PASSWORD, 10);
        await AdminUser_1.AdminUser.create({ email: ADMIN_EMAIL, passwordHash, role: 'ADMIN' });
        console.log('Admin user created:', ADMIN_EMAIL);
    }
    else {
        console.log('Admin user already exists:', ADMIN_EMAIL);
    }
    const sampleProducts = [
        { name: 'Resin Pearl Earrings', slug: 'resin-pearl-earrings', category: 'RESIN', price: 899, description: 'Elegant resin pearl drop earrings.', isFeatured: true, stock: 50 },
        { name: 'Ocean Resin Pendant', slug: 'ocean-resin-pendant', category: 'RESIN', price: 1299, description: 'Handcrafted ocean-inspired resin pendant.', isFeatured: true, stock: 30 },
        { name: 'Rose Gold Resin Bangle', slug: 'rose-gold-resin-bangle', category: 'RESIN', price: 1599, description: 'Rose gold accent resin bangle.', isFeatured: true, stock: 25 },
        { name: 'Handloom Wool Scarf', slug: 'handloom-wool-scarf', category: 'HANDLOOM', price: 2499, description: 'Pure wool handloom scarf.', isFeatured: true, stock: 40 },
        { name: 'Heritage Stole', slug: 'heritage-stole', category: 'HANDLOOM', price: 3299, description: 'Traditional handloom stole.', isFeatured: true, stock: 20 },
        { name: 'Woolen Table Runner', slug: 'woolen-table-runner', category: 'HANDLOOM', price: 1899, description: 'Handwoven wool table runner.', isFeatured: true, stock: 35 },
    ];
    for (const p of sampleProducts) {
        await Product_1.Product.findOneAndUpdate({ slug: p.slug }, { $set: p }, { upsert: true, new: true });
    }
    console.log('Sample products seeded (6 items).');
    await mongoose_1.default.disconnect();
    console.log('Seed complete.');
    process.exit(0);
}
seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
