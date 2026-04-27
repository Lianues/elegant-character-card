import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { loadCardFromFile } from "../../core/card/loadCard.js";
import { repositorize } from "../../core/repository/repositorize.js";

export interface InitOptions {
  config?: string;
}

/**
 * 解析项目内置的「空卡」模板路径。
 * 兼容：
 *   - 开发模式（tsx）：当前文件位于 src/cli/commands/，模板在 src/空卡.png
 *   - 生产模式：当前文件位于 dist/cli/commands/，模板在 dist/空卡.png（由 build 脚本拷贝）
 */
function resolveTemplateCardPath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, "../../空卡.png");
  return existsSync(candidate) ? candidate : null;
}

export async function runInitCommand(
  name: string | undefined,
  options: InitOptions,
): Promise<void> {
  const templatePath = resolveTemplateCardPath();
  if (!templatePath) {
    throw new Error("内置 空卡.png 模板缺失：请检查项目是否完整安装");
  }

  console.log("📁 正在使用内置「空卡」模板初始化新仓库");
  console.log(`- 模板: ${templatePath}`);

  const { card, upgradedFromV2 } = await loadCardFromFile(templatePath);

  const trimmed = name?.trim();
  if (trimmed) {
    card.data.name = trimmed;
    // V3 根级 name 字段（如有）保持与 data.name 同步
    if ("name" in card) {
      (card as { name?: string }).name = trimmed;
    }
  }

  const configPath = options.config ?? "config.yaml";

  // 复用 repo 命令的全部逻辑：把空卡当作 PNG 输入做仓库化，
  // 这样会自动剥离 metadata chunk 生成裸图 character.png 并写入 image_path。
  const repoPath = await repositorize(card, configPath, templatePath);

  console.log("✅ 项目初始化成功");
  console.log(`- 角色名: ${card.data.name}`);
  console.log(`- 仓库目录: ${repoPath}`);
  console.log(`- 配置文件: ${configPath}（不存在时使用内置默认）`);
  console.log(`- 规范文档: ${path.join(repoPath, "docs")}（已自动复制项目内置 docs/）`);
  console.log(`- 默认底图: ${path.join(repoPath, "character.png")}（已剥离 metadata chunk）`);
  if (upgradedFromV2) {
    console.log("- 兼容提示: 模板为 V2，已自动升级为 V3 再仓库化");
  }
  console.log("");
  console.log("下一步：");
  console.log(`  1. 编辑 ${path.join(repoPath, "_metadata.yaml")} 与各字段文件`);
  console.log(`  2. 运行 \`ecc build ${repoPath}\` 生成最终角色卡 PNG`);
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("使用内置「空卡」模板初始化一个新的角色卡仓库（等价于对内置空卡执行 ecc repo）")
    .argument("[name]", "新仓库 / 角色名（可选，缺省时沿用模板中的「空卡」）")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runInitCommand);
}
