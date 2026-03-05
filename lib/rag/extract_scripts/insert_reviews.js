#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// How to use
// node insert_reviews.js <input_json_path>

// Load env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

function normalizeReview(item, allUsers, fallbackIdx) {
  // Get random user ID from available users
  const randomUserId = allUsers[Math.floor(Math.random() * allUsers.length)]?.id;
  
  if (!randomUserId) {
    throw new Error('No users found in database. Please ensure users exist before inserting reviews.');
  }

  // Use parent_asin directly as productId
  const productId = item.parent_asin;
  
  if (!productId) {
    console.warn(`No parent_asin found in review data, skipping review`);
    return null;
  }

  // Normalize rating (ensure it's between 1-5)
  const rating = Math.min(Math.max(parseInt(item.rating) || 1, 1), 5);

  return {
    userId: String(randomUserId),
    productId: String(productId),
    rating: rating,
    title: item.title || `Review ${fallbackIdx}`,
    description: item.text || 'No review text provided',
    isVerifiedPurchase: typeof item.verified_purchase === 'boolean' ? item.verified_purchase : true,
    createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
  };
}

async function main() {
  const inputArg = process.argv[2] || path.join(__dirname, 'outputs', 'comments_Cell_Phones_and_Accessories-50-10.json');
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

  console.log(`Loading existing data from database...`);
  
  // Get all users from database
  const allUsers = await prisma.user.findMany({
    select: { id: true }
  });
  
  if (allUsers.length === 0) {
    console.error('No users found in database. Please create users first.');
    process.exit(1);
  }
  
  console.log(`Found ${allUsers.length} users`);
  console.log(`Preparing to insert ${data.length} reviews from ${inputPath}`);

  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < data.length; i += 1) {
    const item = data[i];
    const review = normalizeReview(item, allUsers, i + 1);
    
    if (!review) {
      skipped += 1;
      continue;
    }
    
    try {
      // Find existing review to get its ID for upsert
      const existingReview = await prisma.review.findFirst({
        where: {
          AND: [
            { userId: { equals: String(review.userId) } },
            { productId: { equals: String(review.productId) } },
            { title: { equals: review.title } }
          ]
        },
        select: { id: true }
      });

      if (existingReview) {
        // Update existing review
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            rating: review.rating,
            description: review.description,
            isVerifiedPurchase: review.isVerifiedPurchase,
            createdAt: review.createdAt
          }
        });
        console.log(`Updated existing review for user ${review.userId} on product ${review.productId}`);
      } else {
        // Create new review
        await prisma.review.create({
          data: {
            userId: String(review.userId),
            productId: String(review.productId),
            rating: review.rating,
            title: review.title,
            description: review.description,
            isVerifiedPurchase: review.isVerifiedPurchase,
            createdAt: review.createdAt
          }
        });
      }
      
      success += 1;
      
      if (success % 10 === 0) {
        console.log(`Progress: ${success} / ${data.length} reviews inserted...`);
      }
      
    } catch (err) {
      failed += 1;
      console.error(`Failed review #${i + 1}: ${err.message}`);
      // Continue with next review even if this one fails
    }
  }

  console.log(`Done. Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
  console.log(`Product review statistics updated.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
