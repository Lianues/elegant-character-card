import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import {
  rebuildWorldBook,
  repositorizeWorldBookFromJson,
} from "../../core/worldBook/worldBookRepository.js";

export interface WorldBookRepoOptions {
  output?: string;
  config?: string;
}

export interface WorldBookBuildOptions {
  output?: string;
  config?: string;
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
}

export async function runWorldBookBuildCommand(
  repo: string,
  options: WorldBookBuildOptions,
): Promise<void> {
  if (!existsSync(repo)) {
    throw new Error(`仓库目录不存在: ${repo}`);
  }

  const configPath = options.config ?? "config.yaml";
  console.log(`📚 正在重建世界书: ${repo}`);

  const worldBook = await rebuildWorldBook(repo, configPath);
  const outputFile = options.output ?? `${path.basename(repo)}.json`;
  await writeFile(outputFile, `${JSON.stringify(worldBook, null, 2)}\n`, "utf-8");

  console.log("✅ 世界书重建成功");
  console.log(`- 输出文件: ${outputFile}`);
  console.log(`- 条目数: ${worldBook.entries.length}`);
  console.log(`- 文件夹数: ${worldBook.folder_paths.length}`);
}

export function registerWorldBookCommand(program: Command): void {
  const worldBook = program
    .command("world-book")
    .description("单独处理 world_book JSON（角色卡 Character Book 内容）");

  worldBook
    .command("repo")
    .description("将 world_book JSON 转换为仓库目录")
    .argument("<input>", "输入 world_book JSON 文件")
    .option("-o, --output <dir>", "输出仓库目录")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runWorldBookRepoCommand);

  worldBook
    .command("build")
    .description("从世界书仓库目录重建为 world_book JSON")
    .argument("<repo>", "世界书仓库目录")
    .option("-o, --output <file>", "输出 JSON 文件")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runWorldBookBuildCommand);
}
