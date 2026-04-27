const fs = require("fs");
const path = require("path");

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dst, name));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

copyRecursive("src/default.png", "dist/default.png");
copyRecursive("src/docs", "dist/docs");
console.log("✓ assets copied to dist/");
