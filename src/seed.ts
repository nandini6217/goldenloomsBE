import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { AdminUser } from './models/AdminUser';
import { Product } from './models/Product';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@goldenlooms.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

async function seed() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);

  const existingAdmin = await AdminUser.findOne({ email: ADMIN_EMAIL });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await AdminUser.create({ email: ADMIN_EMAIL, passwordHash, role: 'ADMIN' });
    console.log('Admin user created:', ADMIN_EMAIL);
  } else {
    console.log('Admin user already exists:', ADMIN_EMAIL);
  }

  const sampleProducts = [
    { name: 'Resin Pearl Earrings', slug: 'resin-pearl-earrings', category: 'RESIN' as const, price: 899, description: 'Elegant resin pearl drop earrings.', isFeatured: true, stock: 50 },
    { name: 'Ocean Resin Pendant', slug: 'ocean-resin-pendant', category: 'RESIN' as const, price: 1299, description: 'Handcrafted ocean-inspired resin pendant.', isFeatured: true, stock: 30 },
    { name: 'Rose Gold Resin Bangle', slug: 'rose-gold-resin-bangle', category: 'RESIN' as const, price: 1599, description: 'Rose gold accent resin bangle.', isFeatured: true, stock: 25 },
    { name: 'Handloom Wool Scarf', slug: 'handloom-wool-scarf', category: 'HANDLOOM' as const, price: 2499, description: 'Pure wool handloom scarf.', isFeatured: true, stock: 40 },
    { name: 'Heritage Stole', slug: 'heritage-stole', category: 'HANDLOOM' as const, price: 3299, description: 'Traditional handloom stole.', isFeatured: true, stock: 20 },
    { name: 'Woolen Table Runner', slug: 'woolen-table-runner', category: 'HANDLOOM' as const, price: 1899, description: 'Handwoven wool table runner.', isFeatured: true, stock: 35 },
  ];

  for (const p of sampleProducts) {
    await Product.findOneAndUpdate(
      { slug: p.slug },
      { $set: p },
      { upsert: true, new: true }
    );
  }
  console.log('Sample products seeded (6 items).');

  await mongoose.disconnect();
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
