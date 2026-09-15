import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      name: "Shop Admin",
      role: "ADMIN",
    },
  });

  const cashierPasswordHash = await bcrypt.hash("cashier123", 10);
  await db.user.upsert({
    where: { username: "cashier" },
    update: {},
    create: {
      username: "cashier",
      passwordHash: cashierPasswordHash,
      name: "Front Register",
      role: "CASHIER",
    },
  });

  await db.setting.upsert({
    where: { key: "shopName" },
    update: {},
    create: { key: "shopName", value: "Njzaro Perfumes" },
  });

  const seedProducts = [
    { name: "Sauvage", brand: "Dior", category: "MEN", type: "EDT", size: "100ml", sellPriceIqd: 124000, costPriceIqd: 78000, stock: 12, sku: "DIOR-SAV-100", imageUrl: "/uploads/seed-sauvage.jpg" },
    { name: "Bleu de Chanel", brand: "Chanel", category: "MEN", type: "EDP", size: "100ml", sellPriceIqd: 170000, costPriceIqd: 111000, stock: 8, sku: "CHN-BLU-100", imageUrl: "/uploads/seed-bleu-de-chanel.jpg" },
    { name: "Black Opium", brand: "YSL", category: "WOMEN", type: "EDP", size: "90ml", sellPriceIqd: 144000, costPriceIqd: 91000, stock: 10, sku: "YSL-BOP-90", imageUrl: "/uploads/seed-black-opium.jpg" },
    { name: "Good Girl", brand: "Carolina Herrera", category: "WOMEN", type: "EDP", size: "80ml", sellPriceIqd: 150000, costPriceIqd: 98000, stock: 2, sku: "CH-GG-80", imageUrl: "/uploads/seed-good-girl.jpg" },
    { name: "Baccarat Rouge 540", brand: "Maison Francis Kurkdjian", category: "UNISEX", type: "EDP", size: "70ml", sellPriceIqd: 419000, costPriceIqd: 288000, stock: 4, sku: "MFK-BR540-70", imageUrl: "/uploads/seed-baccarat-rouge-540.jpg" },
    { name: "Oud Wood", brand: "Tom Ford", category: "UNISEX", type: "PARFUM", size: "50ml", sellPriceIqd: 327000, costPriceIqd: 223000, stock: 5, sku: "TF-OW-50", imageUrl: "/uploads/seed-oud-wood.jpg" },
    { name: "Amber Oud", brand: "Al Haramain", category: "UNISEX", type: "ATTAR", size: "30ml", sellPriceIqd: 59000, costPriceIqd: 29000, stock: 15, sku: "AH-AO-30", imageUrl: "/uploads/seed-amber-oud.jpg" },
  ];

  const existingProducts = await db.product.count();
  if (existingProducts === 0) {
    await db.product.createMany({ data: seedProducts });
  } else {
    // Backfill photos onto already-seeded rows from earlier runs.
    for (const p of seedProducts) {
      await db.product.updateMany({ where: { sku: p.sku }, data: { imageUrl: p.imageUrl } });
    }
  }

  console.log("Seed complete. Admin: admin / admin123, Cashier: cashier / cashier123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
