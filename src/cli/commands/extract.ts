import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { extractCardMetadata } from "../../core/png/metadata.js";

export interface ExtractOptions {
  output?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string, context: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context} 中的角色卡 metadata 不是有效 JSON：${message}`);
  }
}

function resolveCardName(payload: unknown, input: string): string {
  if (isRecord(payload) && typeof payload.name === "string" && payload.name.trim()) {
    return payload.name;
  }

  if (
    isRecord(payload) &&
    isRecord(payload.data) &&
    typeof payload.data.name === "string" &&
    payload.data.name.trim()
  ) {
    return payload.data.name;
  }

  return path.parse(input).name;
}

export async function runExtractCommand(
  input: string,
  options: ExtractOptions,
): Promise<void> {
  if (!existsSync(input)) {
    throw new Error(`输入文件不存在: ${input}`);
  }

  if (path.extname(input).toLowerCase() !== ".png") {
    throw new Error("extract 仅支持 PNG 输入");
  }

  console.log(`📤 正在提取: ${input}`);

  const metadata = await extractCardMetadata(input);
  if (!metadata) {
    throw new Error(`PNG 中未找到角色卡元数据: ${input}`);
  }

  // extract 默认输出 PNG 中保存的原始 JSON（仅做 pretty-print），
  // 不做 normalize / 升级 / contributors 注入，避免与酒馆原始导出产生差异。
  const rawPayload = parseJson(metadata, input);
  const outputPayload = JSON.stringify(rawPayload, null, 4);
  const cardName = resolveCardName(rawPayload, input);

  const outputPath = options.output ?? `${cardName}.json`;
  await writeFile(outputPath, `${outputPayload}\n`, "utf-8");

  console.log("✅ 提取成功");
  console.log(`- 角色名: ${cardName}`);
  console.log(`- 输出文件: ${outputPath}`);
}

export function registerExtractCommand(program: Command): void {
  program
    .command("extract")
    .description("从 PNG 提取角色卡原始 JSON（pretty-print 输出）")
    .argument("<input>", "输入 PNG 文件")
    .option("-o, --output <file>", "输出 JSON 文件")
    .action(runExtractCommand);
}
