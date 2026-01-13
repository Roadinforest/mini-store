#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from project root
// How to use
// node lib/rag/extract_scripts/insert_products.js path/to/your/input.json

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || `product-${Date.now()}`;
}

function normalizeProduct(item, fallbackIdx) {
  const images = Array.isArray(item.images)
    ? item.images.map(img => img?.large).filter(Boolean)
    : [];

  return {
    id: item.parent_asin,
    name: item.title || `Product ${fallbackIdx}`,
    slug: slugify(item.title || `product-${fallbackIdx}`),
    category: item.main_category || 'General',
    brand: item.store || 'Unknown',
    description: Array.isArray(item.features)
      ? item.features.join(' ')
      : String(item.features|| 'No features available.'),
    images: images.length ? images : ['https://placehold.co/600x600'],
    stock: Number.isFinite(item.stock) ? item.stock : 100,
    price: typeof item.price === 'number' ? item.price : 0,
    rating: typeof item.average_rating === 'number' ? item.average_rating : 0,
    numReviews: Number.isFinite(item.rating_number) ? item.rating_number : 0,
    banner: images[0] || null,
  };
}

async function main() {
  const inputArg = process.argv[2] || path.join(__dirname, 'outputs', 'meta_Software-30.json');
  const inputPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('Input JSON must be an array.');
    process.exit(1);
  }

  console.log(`Preparing to upsert ${data.length} products from ${inputPath}`);

  let success = 0;
  let failed = 0;
  for (let i = 0; i < data.length; i += 1) {
    const item = data[i];
    const product = normalizeProduct(item, i + 1);
    try {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          slug: product.slug,
          category: product.category,
          brand: product.brand,
          description: product.description,
          images: product.images,
          stock: product.stock,
          price: product.price,
          rating: product.rating,
          numReviews: product.numReviews,
          banner: product.banner,
        },
        create: product,
      });
      success += 1;
    } catch (err) {
      failed += 1;
      console.error(`Failed product #${i + 1} (${product.slug}): ${err.message}`);
    }

    if((success + failed) % 10 === 0) {
      console.log(`Progress: ${success + failed} / ${data.length} products processed...`);
    }
  }

  console.log(`Done. Success: ${success}, Failed: ${failed}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
