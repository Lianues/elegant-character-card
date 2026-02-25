import { existsSync } from "node:fs";
import path from "node:path";

import { Command } from "commander";

import { loadCardFromFile } from "../../core/card/loadCard.js";

function formatTimestamp(value: number | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toLocaleString("zh-CN", { hour12: false });
}

export async function runInfoCommand(input: string): Promise<void> {
  if (!existsSync(input)) {
    throw new Error(`输入文件不存在: ${input}`);
  }

  const ext = path.extname(input).toLowerCase();
  if (ext !== ".png" && ext !== ".json") {
    throw new Error("info 输入必须是 PNG 或 JSON 文件");
  }

  const { card, upgradedFromV2 } = await loadCardFromFile(input);
  const data = card.data;

  console.log("=".repeat(72));
  console.log(`🎭 角色: ${data.name}`);
  console.log("=".repeat(72));
  console.log(`👤 创作者: ${data.creator}`);
  console.log(`🏷️ 标签: ${data.tags.length > 0 ? data.tags.join(", ") : "无"}`);
  console.log(`🧩 规范: ${card.spec} v${card.spec_version}`);
  console.log(`📝 版本: ${data.character_version}`);

  if (data.nickname) {
    console.log(`📛 昵称: ${data.nickname}`);
  }

  const created = formatTimestamp(data.creation_date);
  if (created) {
    console.log(`📅 创建时间: ${created}`);
  }

  const modified = formatTimestamp(data.modification_date);
  if (modified) {
    console.log(`🛠️ 修改时间: ${modified}`);
  }

  console.log("\n📋 内容统计:");
  console.log(`- description: ${data.description.length} 字符`);
  console.log(`- personality: ${data.personality.length} 字符`);
  console.log(`- scenario: ${data.scenario.length} 字符`);
  console.log(`- system_prompt: ${data.system_prompt.length} 字符`);
  console.log(`- mes_example: ${data.mes_example.length} 字符`);
  console.log(`- message: ${data.message.length}`);
  console.log(`- group_only_greetings: ${data.group_only_greetings.length}`);

  if (data.world_book) {
    console.log("\n📚 World Book:");
    console.log(`- name: ${data.world_book.name ?? "(未命名)"}`);
    console.log(`- entries: ${data.world_book.entries.length}`);
  }

  if (data.assets && data.assets.length > 0) {
    console.log(`\n🖼️ 资源 (${data.assets.length}):`);
    for (const asset of data.assets) {
      console.log(`- ${asset.name} (${asset.type}) .${asset.ext}`);
    }
  }

  if (data.source && data.source.length > 0) {
    console.log("\n🔗 来源:");
    for (const source of data.source) {
      console.log(`- ${source}`);
    }
  }

  if (upgradedFromV2) {
    console.log("\n⚠️ 兼容提示: 输入为 V2，已自动升级为 V3 展示");
  }
}

export function registerInfoCommand(program: Command): void {
  program
    .command("info")
    .description("展示角色卡详细信息")
    .argument("<input>", "输入 PNG 或 JSON 文件")
    .action(runInfoCommand);
}
