try {
  console.log("Checking index bundle...");
  const fs = require('fs');
  const code = fs.readFileSync('./frontend/dist/assets/index-BYF36qby.js', 'utf8');
  console.log("File length:", code.length);
} catch (e) {
  console.error("Error:", e);
}
