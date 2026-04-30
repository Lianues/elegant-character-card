import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { loadCardFromFile } from "../../core/card/loadCard.js";
import { sanitizeFilename } from "../../core/repository/fieldHandlers.js";
import { worldBookToCharacterBook } from "../../core/transforms/tavernExport.js";
import {
  rebuildWorldBook,
  repositorizeWorldBook,
  repositorizeWorldBookFromJson,
} from "../../core/worldBook/worldBookRepository.js";

export interface WorldBookRepoOptions {
  output?: string;
  config?: string;
}

export interface WorldBookBuildOptions {
  output?: string;
  config?: string;
  internal?: boolean;
}

export interface WorldBookInitOptions {
  config?: string;
}

/**
 * 解析项目内置的「空卡」模板路径（其内嵌的 character_book 即「空世界书」模板）。
 * 复用与 ecc init 相同的查找逻辑：
 *   - 开发模式（tsx）：当前文件位于 src/cli/commands/，模板在 src/空卡.png
 *   - 生产模式：当前文件位于 dist/cli/commands/，模板在 dist/空卡.png
 */
function resolveTemplateCardPath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, "../../空卡.png");
  return existsSync(candidate) ? candidate : null;
}

export async function runWorldBookRepoCommand(
  input: string,
  options: WorldBookRepoOptions,
): Promise<void> {
  if (!existsSync(input)) {
    throw new Error(`输入文件不存在: ${input}`);
  }

  if (path.extname(input).toLowerCase() !== ".json") {
    throw new Error("world-book repo 输入必须是 JSON 文件");
  }

  const configPath = options.config ?? "config.yaml";
  console.log(`📚 正在仓库化世界书: ${input}`);

  const outputDir = await repositorizeWorldBookFromJson(input, options.output, configPath);

  console.log("✅ 世界书仓库化成功");
  console.log(`- 输出目录: ${outputDir}`);
  console.log(`- 配置文件: ${configPath}`);
  console.log(`- 规范文档: ${path.join(outputDir, "docs")}（已自动复制项目内置 docs/）`);
}

export async function runWorldBookBuildCommand(
  repo: string | undefined,
  options: WorldBookBuildOptions,
): Promise<void> {
  const repoPath = repo ?? ".";
  if (!existsSync(repoPath)) {
    throw new Error(`仓库目录不存在: ${repoPath}`);
  }
  if (!existsSync(path.join(repoPath, "_metadata.yaml"))) {
    throw new Error(
      `当前目录不是有效的世界书仓库（缺少 _metadata.yaml）：${path.resolve(repoPath)}`,
    );
  }

  const configPath = options.config ?? "config.yaml";
  console.log(`📚 正在重建世界书: ${path.resolve(repoPath)}`);

  const worldBook = await rebuildWorldBook(repoPath, configPath);
  // path.basename('.') 在某些 Node 版本上为空串，先 resolve 成绝对路径再取名
  const defaultName = path.basename(path.resolve(repoPath)) || "world_book";
  const outputFile = options.output ?? `${defaultName}.json`;
  const useTavernFormat = !options.internal;
  // 与 `ecc build` 保持一致：默认输出酒馆兼容的 character_book 格式（复用同一转换器），
  // 仅当 --internal 时才直出项目内部 V3 world_book 结构。
  const exportPayload = useTavernFormat
    ? worldBookToCharacterBook(worldBook as unknown as Record<string, unknown>)
    : worldBook;
  // 酒馆原生导出使用 4 空格缩进；项目内部 V3 保持 2 空格
  const exportJson = JSON.stringify(exportPayload, null, useTavernFormat ? 4 : 2);
  await writeFile(outputFile, `${exportJson}\n`, "utf-8");

  console.log("✅ 世界书重建成功");
  console.log(`- 输出文件: ${outputFile}`);
  console.log(`- 条目数: ${worldBook.entries.length}`);
  console.log(`- 文件夹数: ${worldBook.folder_paths.length}`);
  console.log(`- 格式: ${useTavernFormat ? "SillyTavern 兼容（character_book）" : "项目内部 V3"}`);
}

export async function runWorldBookInitCommand(
  name: string | undefined,
  options: WorldBookInitOptions,
): Promise<void> {
  const templatePath = resolveTemplateCardPath();
  if (!templatePath) {
    throw new Error("内置 空卡.png 模板缺失：请检查项目是否完整安装");
  }

  console.log("📚 正在使用内置「空世界书」模板初始化新世界书仓库");
  console.log(`- 模板: ${templatePath}（取其内嵌 character_book）`);

  const { card } = await loadCardFromFile(templatePath);
  const worldBook = card.data.world_book;
  if (!worldBook) {
    throw new Error("内置空卡模板中未找到 world_book / character_book，无法用作世界书种子");
  }

  const trimmed = name?.trim();
  if (trimmed) {
    worldBook.name = trimmed;
  }

  const targetDir = sanitizeFilename(
    trimmed ?? worldBook.name ?? "空世界书",
  );

  if (existsSync(targetDir)) {
    throw new Error(`目标目录已存在：${targetDir}（请换一个名字或先删除该目录）`);
  }

  const configPath = options.config ?? "config.yaml";
  const repoPath = await repositorizeWorldBook(worldBook, targetDir, configPath);

  console.log("✅ 世界书初始化成功");
  console.log(`- 世界书名: ${worldBook.name ?? "(未命名)"}`);
  console.log(`- 仓库目录: ${repoPath}`);
  console.log(`- 配置文件: ${configPath}（不存在时使用内置默认）`);
  console.log(`- 条目数: ${worldBook.entries.length}（含 1 条占位条目，可按需删改）`);
  console.log(`- 规范文档: ${path.join(repoPath, "docs")}（已自动复制项目内置 docs/）`);
  console.log("");
  console.log("下一步：");
  console.log(`  1. 阅读 ${path.join(repoPath, "docs", "README.md")} 了解 yaml 字段规范`);
  console.log(`  2. 编辑 ${path.join(repoPath, "entries")} 下的条目文件`);
  console.log(`  3. 运行 \`ecc world-book build ${repoPath}\` 生成最终 world_book JSON`);
}

export function registerWorldBookCommand(program: Command): void {
  const worldBook = program
    .command("world-book")
    .description("单独处理 world_book JSON（角色卡 Character Book 内容）");

  worldBook
    .command("init")
    .description("使用内置「空世界书」模板初始化一个新的世界书仓库（种子取自 src/空卡.png）")
    .argument("[name]", "新仓库 / 世界书名（可选，缺省时沿用模板中的「空世界书」）")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runWorldBookInitCommand);

  worldBook
    .command("repo")
    .description("将 world_book JSON 转换为仓库目录")
    .argument("<input>", "输入 world_book JSON 文件")
    .option("-o, --output <dir>", "输出仓库目录")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runWorldBookRepoCommand);

  worldBook
    .command("build")
    .description("从世界书仓库目录重建为 world_book JSON（默认输出 SillyTavern 兼容格式；省略仓库参数则使用当前目录）")
    .argument("[repo]", "世界书仓库目录（默认当前目录 .）", ".")
    .option("-o, --output <file>", "输出 JSON 文件")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .option("--internal", "输出本项目内部 V3 格式（不做酒馆兼容转换）")
    .action(runWorldBookBuildCommand);
}
