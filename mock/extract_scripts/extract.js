#!/usr/bin/env node

// How to use:
//  node extract.js <path/to/input.jsonl> <limit> [outputDir]
//  Example:  node pipeline.js Software 50 10
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Simple JSONL sampler: reads first N records and writes them as JSON array
async function main() {
  const [inputArg, limitArg, outputDirArg] = process.argv.slice(2);
  if (!inputArg) {
    console.error('Usage: node extract.js <path/to/input.jsonl> <limit> [outputDir]');
    process.exit(1);
  }

  const limit = Number(limitArg ?? 100);
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error('Limit must be a positive number.');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputDir = path.resolve(process.cwd(), outputDirArg ?? path.join(__dirname, 'outputs'));
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const baseName = path.basename(inputPath).replace(/\.jsonl$/i, '');
  const outputPath = path.join(outputDir, `${baseName}-${limit}.json`);

  const stream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const records = [];
  let lineNumber = 0;

  try {
    for await (const line of rl) {
      lineNumber += 1;
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        records.push(JSON.parse(trimmed));
      } catch (err) {
        console.warn(`Skipping line ${lineNumber}: ${err.message}`);
      }
      if (records.length >= limit) {
        rl.close();
        break;
      }
    }
  } catch (err) {
    console.error(`Failed while reading ${inputPath}: ${err.message}`);
    process.exit(1);
  }

  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
  console.log(`Wrote ${records.length} records to ${outputPath}`);
}

main();
