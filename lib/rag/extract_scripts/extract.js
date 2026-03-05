#!/usr/bin/env node

// How to use:
//  node extract.js <path/to/input.jsonl> <limit> [outputDir]
// Usage:
//  从指定的JSONL文件中抽取前N条记录，保存为JSON数组文件，默认输出到outputs目录。
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const seenAsins = new Set();
  let lineNumber = 0;
  let skippedDuplicates = 0;

  try {
    for await (const line of rl) {
      lineNumber += 1;
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const record = JSON.parse(trimmed);
        const parentAsin = record.parent_asin;
        
        // Skip records without parent_asin
        if (!parentAsin) {
          console.warn(`Skipping line ${lineNumber}: Missing parent_asin`);
          continue;
        }
        
        // Skip duplicate parent_asin
        if (seenAsins.has(parentAsin)) {
          skippedDuplicates += 1;
          continue;
        }
        
        seenAsins.add(parentAsin);
        records.push(record);
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
  console.log(`Wrote ${records.length} unique records to ${outputPath}`);
  if (skippedDuplicates > 0) {
    console.log(`Skipped ${skippedDuplicates} duplicate parent_asin records`);
  }
}

main();
