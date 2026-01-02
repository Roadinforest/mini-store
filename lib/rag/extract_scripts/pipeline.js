#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// How to use:
//  node pipeline.js <name> <product_count> <each_comment_count> [insert_enable]
// Usage:
// 根据给定的name，从data目录中抽取meta和评论数据，生成outputs目录中的JSON文件。
// 如果insert_enable参数为true，则会将抽取的产品数据插入数据库。
// Examples:
// node ./lib/rag/extract_scripts/pipeline.js Cell_Phones_and_Accessories 50 10
// node ./lib/rag/extract_scripts/pipeline.js Cell_Phones_and_Accessories 50 10 insert_enable

function usage() {
  console.error('Usage: node pipeline.js <name> <product_count> <each_comment_count>');
  console.error('Example: node pipeline.js Software 30 5');
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function runNode(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${[scriptPath, ...args].join(' ')}`);
  }
}

async function main() {
  const [name, productCountArg, perCommentArg, insertFlag] = process.argv.slice(2);
  if (!name || !productCountArg || !perCommentArg) {
    usage();
    process.exit(1);
  }

  const productCount = Number(productCountArg);
  const perComment = Number(perCommentArg);
  if (!Number.isFinite(productCount) || productCount <= 0) {
    throw new Error('product_count must be a positive number');
  }
  if (!Number.isFinite(perComment) || perComment <= 0) {
    throw new Error('each_comment_count must be a positive number');
  }

  const dataDir = path.join(__dirname, '../data');
  const outputsDir = path.join(__dirname, '../outputs');
  const metaSource = path.join(dataDir, `meta_${name}.jsonl`);
  const reviewsSource = path.join(dataDir, `${name}.jsonl`);
  const extractScript = path.join(__dirname, 'extract.js');
  const findScript = path.join(__dirname, 'find_comments.js');
  const insertScript = path.join(__dirname, 'insert_products.js');
  const insertReviewsScript = path.join(__dirname, 'insert_reviews.js');

  ensureFileExists(extractScript, 'extract.js');
  ensureFileExists(findScript, 'find_comments.js');
  ensureFileExists(metaSource, 'Meta source');
  ensureFileExists(reviewsSource, 'Reviews source');
  const shouldInsert = typeof insertFlag === 'string' && ['insert_enable'].includes(insertFlag.toLowerCase());
  if (shouldInsert) {
    ensureFileExists(insertScript, 'insert_products.js');
    ensureFileExists(insertReviewsScript, 'insert_reviews.js');
  }

  fs.mkdirSync(outputsDir, { recursive: true });

  // Step 1: sample meta records
  runNode(extractScript, [metaSource, String(productCount), outputsDir]);
  const metaOutput = path.join(outputsDir, `meta_${name}-${productCount}.json`);
  ensureFileExists(metaOutput, 'Meta output');

  // Step 2: extract matching comments
  const commentsOutput = path.join(outputsDir, `comments_${name}-${productCount}-${perComment}.json`);
  runNode(findScript, [metaOutput, reviewsSource, commentsOutput, String(perComment)]);

  if (shouldInsert) {
    runNode(insertScript, [metaOutput]);
    runNode(insertReviewsScript, [commentsOutput]);
  }

  console.log('Done.');
  console.log(`Meta output: ${metaOutput}`);
  console.log(`Comments output: ${commentsOutput}`);
  if (shouldInsert) {
    console.log('Products inserted into database.');
    console.log('Reviews inserted into database.');
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
