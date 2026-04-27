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

// 给 CLI 入口加可执行权限（Windows 下 npm pack 不会自动设置）
try {
  fs.chmodSync("dist/cli/index.js", 0o755);
} catch (_) {
  // 非 POSIX 平台忽略
}

console.log("✓ assets copied to dist/");
