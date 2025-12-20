#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// How to use:
//  node pipeline.js <name> <product_count> <each_comment_count>

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
  const [name, productCountArg, perCommentArg] = process.argv.slice(2);
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

  const originDir = path.join(__dirname, '../origin');
  const outputsDir = path.join(__dirname, '../outputs');
  const metaSource = path.join(originDir, `meta_${name}.jsonl`);
  const reviewsSource = path.join(originDir, `${name}.jsonl`);
  const extractScript = path.join(__dirname, 'extract.js');
  const findScript = path.join(__dirname, 'find_comments.js');

  ensureFileExists(extractScript, 'extract.js');
  ensureFileExists(findScript, 'find_comments.js');
  ensureFileExists(metaSource, 'Meta source');
  ensureFileExists(reviewsSource, 'Reviews source');

  fs.mkdirSync(outputsDir, { recursive: true });

  // Step 1: sample meta records
  runNode(extractScript, [metaSource, String(productCount), outputsDir]);
  const metaOutput = path.join(outputsDir, `meta_${name}-${productCount}.json`);
  ensureFileExists(metaOutput, 'Meta output');

  // Step 2: extract matching comments
  const commentsOutput = path.join(outputsDir, `comments_${name}-${productCount}-${perComment}.json`);
  runNode(findScript, [metaOutput, reviewsSource, commentsOutput, String(perComment)]);

  console.log('Done.');
  console.log(`Meta output: ${metaOutput}`);
  console.log(`Comments output: ${commentsOutput}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
