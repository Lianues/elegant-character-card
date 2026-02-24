import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

import { Command } from "commander";

import { embedCardMetadata } from "../../core/png/metadata.js";
import { rebuildCard } from "../../core/repository/rebuild.js";

export interface BuildOptions {
  output?: string;
  format?: "json" | "png";
  baseImage?: string;
  config?: string;
  legacy?: boolean;
}

function normalizeFormat(input: string | undefined): "json" | "png" {
  const normalized = (input ?? "json").toLowerCase();
  if (normalized === "json" || normalized === "png") {
    return normalized;
  }

  throw new Error("输出格式仅支持 json 或 png");
}

export async function runBuildCommand(repo: string, options: BuildOptions): Promise<void> {
  if (!existsSync(repo)) {
    throw new Error(`仓库目录不存在: ${repo}`);
  }

  const format = normalizeFormat(options.format);
  const configPath = options.config ?? "config.yaml";

  console.log(`🔨 正在重建: ${repo}`);

  const card = await rebuildCard(repo, configPath);
  const outputBase = options.output ?? `${card.data.name}_rebuilt`;

  if (format === "json") {
    const outputFile = `${outputBase}.json`;
    await writeFile(outputFile, `${JSON.stringify(card, null, 2)}\n`, "utf-8");

    console.log("✅ 重建成功（JSON）");
    console.log(`- 输出文件: ${outputFile}`);
    return;
  }

  const baseImage = options.baseImage ?? "character.png";
  if (!existsSync(baseImage)) {
    throw new Error(`底图不存在: ${baseImage}`);
  }

  const outputFile = `${outputBase}.png`;
  await embedCardMetadata(JSON.stringify(card, null, 2), baseImage, outputFile, !!options.legacy);

  console.log("✅ 重建成功（PNG）");
  console.log(`- 输出文件: ${outputFile}`);
  console.log(`- 底图: ${baseImage}`);
  console.log(`- legacy: ${options.legacy ? "开启" : "关闭"}`);
}

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("从仓库结构重建角色卡")
    .argument("<repo>", "仓库目录路径")
    .option("-o, --output <name>", "输出文件名（不含扩展名）")
    .option("-f, --format <type>", "输出格式：json 或 png", "json")
    .option("-b, --base-image <file>", "输出 PNG 时使用的底图")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .option("-l, --legacy", "兼容输出 legacy chara chunk")
    .action(runBuildCommand);
}
