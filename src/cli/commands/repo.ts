import { existsSync } from "node:fs";
import path from "node:path";

import { Command } from "commander";

import { loadCardFromFile } from "../../core/card/loadCard.js";
import { repositorize } from "../../core/repository/repositorize.js";

export interface RepoOptions {
  config?: string;
}

export async function runRepoCommand(input: string, options: RepoOptions): Promise<void> {
  if (!existsSync(input)) {
    throw new Error(`输入文件不存在: ${input}`);
  }

  const ext = path.extname(input).toLowerCase();
  if (ext !== ".png" && ext !== ".json") {
    throw new Error("repo 输入必须是 PNG 或 JSON 文件");
  }

  console.log(`📁 正在仓库化: ${input}`);

  const { card, upgradedFromV2 } = await loadCardFromFile(input);
  const configPath = options.config ?? "config.yaml";
  const repoPath = await repositorize(card, configPath);

  console.log("✅ 仓库化成功");
  console.log(`- 角色名: ${card.data.name}`);
  console.log(`- 仓库目录: ${repoPath}`);
  console.log(`- 配置文件: ${configPath}`);
  if (upgradedFromV2) {
    console.log("- 兼容提示: 输入为 V2，已自动升级为 V3 再仓库化");
  }
}

export function registerRepoCommand(program: Command): void {
  program
    .command("repo")
    .description("将角色卡转换为仓库化目录结构")
    .argument("<input>", "输入 PNG 或 JSON 文件")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .action(runRepoCommand);
}
