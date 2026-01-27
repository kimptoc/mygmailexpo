const fs = require('fs');
const path = require('path');

const buildDate = new Date().toISOString();
const buildInfo = {
  buildDate,
  version: require('../package.json').version
};

const outputPath = path.join(__dirname, '../constants/build-info.json');

fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

console.log(`Build info generated: ${buildDate}`);
