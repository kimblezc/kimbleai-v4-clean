const fs = require('fs');
const path = require('path');

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (err) {
    return 0;
  }
}

function walkDir(dir, filter, exclude = []) {
  let results = [];

  try {
    const list = fs.readdirSync(dir);

    list.forEach(file => {
      const filePath = path.join(dir, file);

      // Skip excluded directories
      if (exclude.some(ex => filePath.includes(ex))) {
        return;
      }

      const stat = fs.statSync(filePath);

      if (stat && stat.isDirectory()) {
        results = results.concat(walkDir(filePath, filter, exclude));
      } else if (filter(filePath)) {
        const lines = countLines(filePath);
        results.push({ path: filePath.replace(process.cwd(), '.'), lines });
      }
    });
  } catch (err) {
    // Skip inaccessible directories
  }

  return results;
}

console.log('=== KIMBLEAI CODEBASE ANALYSIS ===\n');

// Analyze source code
const codeFilter = (p) => /\.(ts|tsx|js|jsx)$/.test(p);
const codeExclude = ['node_modules', '.next', 'dist', '.git'];
const codeFiles = walkDir('.', codeFilter, codeExclude);
const totalCodeLines = codeFiles.reduce((sum, f) => sum + f.lines, 0);

console.log(`📁 Source Code Files: ${codeFiles.length}`);
console.log(`📝 Source Code Lines: ${totalCodeLines.toLocaleString()}`);

// Analyze documentation
const docFilter = (p) => /\.md$/.test(p);
const docExclude = ['node_modules', '.next', '.git'];
const docFiles = walkDir('.', docFilter, docExclude);
const totalDocLines = docFiles.reduce((sum, f) => sum + f.lines, 0);

console.log(`📄 Documentation Files: ${docFiles.length}`);
console.log(`📝 Documentation Lines: ${totalDocLines.toLocaleString()}`);
console.log(`\n📊 TOTAL LINES: ${(totalCodeLines + totalDocLines).toLocaleString()}\n`);

// Find largest source files
console.log('=== TOP 15 LARGEST SOURCE FILES ===\n');
const largestCode = codeFiles
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 15);

largestCode.forEach((file, i) => {
  const paddedNum = String(i + 1).padStart(2, ' ');
  const paddedLines = String(file.lines).padStart(5, ' ');
  console.log(`${paddedNum}. ${paddedLines} lines - ${file.path}`);
});

// Find largest documentation files
console.log('\n=== TOP 10 LARGEST DOCUMENTATION FILES ===\n');
const largestDocs = docFiles
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 10);

largestDocs.forEach((file, i) => {
  const paddedNum = String(i + 1).padStart(2, ' ');
  const paddedLines = String(file.lines).padStart(5, ' ');
  console.log(`${paddedNum}. ${paddedLines} lines - ${file.path}`);
});

// Breakdown by directory
console.log('\n=== LINES BY DIRECTORY ===\n');
const dirStats = {};

codeFiles.forEach(file => {
  const dir = file.path.split(path.sep)[1] || 'root';
  if (!dirStats[dir]) dirStats[dir] = { files: 0, lines: 0 };
  dirStats[dir].files++;
  dirStats[dir].lines += file.lines;
});

Object.entries(dirStats)
  .sort((a, b) => b[1].lines - a[1].lines)
  .forEach(([dir, stats]) => {
    const paddedLines = String(stats.lines).padStart(6, ' ');
    const paddedFiles = String(stats.files).padStart(3, ' ');
    console.log(`${paddedLines} lines in ${paddedFiles} files - /${dir}`);
  });

console.log('\n=== ANALYSIS COMPLETE ===');
