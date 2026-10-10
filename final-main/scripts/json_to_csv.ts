import fs from 'fs';
import path from 'path';

const inputPath = path.resolve(process.cwd(), 'mdcat_mcqs_output.json');
const outputPath = path.resolve(process.cwd(), 'mdcat_mcqs_output.csv');

console.log('Reading JSON file...');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

if (data.length === 0) {
  console.log('No data to convert.');
  process.exit(0);
}

// We want to ensure all keys are captured, so we collect keys from all objects (in case some are missing fields)
const headersSet = new Set<string>();
for (const item of data) {
  Object.keys(item).forEach(key => headersSet.add(key));
}
const headers = Array.from(headersSet);

function escapeCsv(val: any) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Escape double quotes and wrap in double quotes if there are commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

console.log('Converting to CSV format...');
const csvRows = [];
// Add header row
csvRows.push(headers.map(escapeCsv).join(','));

// Add data rows
for (const row of data) {
  csvRows.push(headers.map(h => escapeCsv(row[h])).join(','));
}

console.log('Writing to CSV file...');
fs.writeFileSync(outputPath, csvRows.join('\n'));
console.log(`Successfully converted ${data.length} rows to CSV at: ${outputPath}`);
