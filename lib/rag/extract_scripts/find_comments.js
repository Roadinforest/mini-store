#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// How to use:
//  node find_comments.js <meta.json> <reviews.jsonl> [output.json] [maxPerAsin]

// Reads meta JSON (array), collects parent_asin values, then streams a JSONL file to extract matching reviews.
async function main() {
  const [metaPathArg, reviewsPathArg, outputPathArg, maxPerAsinArg] = process.argv.slice(2);
  if (!metaPathArg || !reviewsPathArg) {
    console.error('Usage: node find_comments.js <meta.json> <reviews.jsonl> [output.json] [maxPerAsin]');
    process.exit(1);
  }

  const metaPath = path.resolve(process.cwd(), metaPathArg);
  const reviewsPath = path.resolve(process.cwd(), reviewsPathArg);
  if (!fs.existsSync(metaPath)) {
    console.error(`Meta file not found: ${metaPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(reviewsPath)) {
    console.error(`Reviews file not found: ${reviewsPath}`);
    process.exit(1);
  }

  const metaRaw = fs.readFileSync(metaPath, 'utf8');
  let meta;
  try {
    meta = JSON.parse(metaRaw);
  } catch (err) {
    console.error(`Failed to parse meta JSON: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(meta)) {
    console.error('Meta JSON must be an array.');
    process.exit(1);
  }

  const parentAsins = new Set(
    meta
      .map(item => item?.parent_asin)
      .filter(Boolean)
  );
  if (parentAsins.size === 0) {
    console.error('No parent_asin values found in meta file.');
    process.exit(1);
  }

  const maxPerAsin = maxPerAsinArg ? Number(maxPerAsinArg) : Infinity;
  if (!Number.isFinite(maxPerAsin) || maxPerAsin <= 0) {
    console.error('maxPerAsin must be a positive number if provided.');
    process.exit(1);
  }

  const outputDefaultDir = path.join(__dirname, 'outputs');
  const outputPath = outputPathArg
    ? path.resolve(process.cwd(), outputPathArg)
    : path.join(outputDefaultDir, 'meta-comments.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const perAsinCount = new Map();
  const results = [];
  const stream = fs.createReadStream(reviewsPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  let matched = 0;
  let skippedParse = 0;

  for await (const line of rl) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (err) {
      skippedParse += 1;
      continue;
    }
    const asin = record?.parent_asin;
    if (!asin || !parentAsins.has(asin)) continue;

    const count = perAsinCount.get(asin) || 0;
    if (count >= maxPerAsin) continue;

    perAsinCount.set(asin, count + 1);
    results.push(record);
    matched += 1;
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Matched ${matched} reviews across ${perAsinCount.size} asins (skipped ${skippedParse} bad lines).`);
  console.log(`Output: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
