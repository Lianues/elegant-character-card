import { existsSync } from "node:fs";
import path from "node:path";

import { Command } from "commander";

import { loadCardFromFile } from "../../core/card/loadCard.js";

export async function runValidateCommand(input: string): Promise<void> {
  if (!existsSync(input)) {
    throw new Error(`输入文件不存在: ${input}`);
  }

  const ext = path.extname(input).toLowerCase();
  if (ext !== ".png" && ext !== ".json") {
    throw new Error("validate 输入必须是 PNG 或 JSON 文件");
  }

  const { card, upgradedFromV2 } = await loadCardFromFile(input);

  console.log("✅ 校验通过");
  console.log(`- 文件: ${input}`);
  console.log(`- 角色名: ${card.data.name}`);
  console.log(`- 创作者: ${card.data.creator}`);
  console.log(`- 规范: ${card.spec} v${card.spec_version}`);
  console.log(`- 设定条目数: ${card.data.world_book?.entries.length ?? 0}`);
  console.log(`- 资源数: ${card.data.assets?.length ?? 0}`);
  if (upgradedFromV2) {
    console.log("- 兼容提示: 输入为 V2，已按 V3 规范完成校验");
  }
}

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("验证角色卡文件（PNG/JSON）")
    .argument("<input>", "输入 PNG 或 JSON 文件")
    .action(runValidateCommand);
}
