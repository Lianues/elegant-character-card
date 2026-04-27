import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { embedCardMetadata } from "../../core/png/metadata.js";
import { getRepoImagePath, rebuildCard } from "../../core/repository/rebuild.js";
import { convertV3ToTavernCard } from "../../core/transforms/tavernExport.js";
import { withContributorsHeader } from "../../core/transforms/contributors.js";

export interface BuildOptions {
  output?: string;
  format?: "json" | "png";
  baseImage?: string;
  config?: string;
  legacy?: boolean;
  internal?: boolean;
}

/**
 * 解析项目内置的 default.png 路径。
 * 同时兼容：
 *   - 开发模式（tsx）：当前文件位于 src/cli/commands/，default.png 在 src/
 *   - 生产模式：当前文件位于 dist/cli/commands/，default.png 在 dist/（由 build 脚本拷贝）
 */
function resolveDefaultImagePath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, "../../default.png");
  return existsSync(candidate) ? candidate : null;
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
  const useTavernFormat = !options.internal;
  const exportPayload = withContributorsHeader(
    useTavernFormat ? convertV3ToTavernCard(card) : card,
  );
  // 酒馆原生导出使用 4 空格缩进；项目内部 V3 保持 2 空格
  const exportJson = JSON.stringify(exportPayload, null, useTavernFormat ? 4 : 2);
  const outputBase = options.output ?? `${card.data.name}_rebuilt`;

  if (format === "json") {
    const outputFile = `${outputBase}.json`;
    await writeFile(outputFile, `${exportJson}\n`, "utf-8");

    console.log("✅ 重建成功（JSON）");
    console.log(`- 输出文件: ${outputFile}`);
    console.log(`- 格式: ${useTavernFormat ? "SillyTavern 兼容" : "项目内部 V3"}`);
    return;
  }

  // 解析底图，优先级与错误规则：
  //   1) -b <file>：必须存在，否则报错
  //   2) 仓库 image_path 已填：必须存在，否则报错（不静默回落）
  //   3) 仓库 image_path 为空：使用项目内置 src/default.png 兜底
  let resolvedBaseImage: string;
  let baseImageSource: string;

  if (options.baseImage) {
    if (!existsSync(options.baseImage)) {
      throw new Error(`底图不存在：${options.baseImage}（来自命令行 -b）`);
    }
    resolvedBaseImage = options.baseImage;
    baseImageSource = "命令行 -b 指定";
  } else {
    const { raw, resolved } = await getRepoImagePath(repo);
    if (raw && resolved) {
      if (!existsSync(resolved)) {
        throw new Error(
          `底图不存在：${resolved}\n` +
            `（_metadata.yaml 中 data.image_path 设为 "${raw}" 但文件不存在；请修正路径或将 image_path 留空以使用默认图）`,
        );
      }
      resolvedBaseImage = resolved;
      baseImageSource = "仓库内置 image_path";
    } else {
      const defaultImage = resolveDefaultImagePath();
      if (!defaultImage) {
        throw new Error("内置 default.png 缺失：请检查项目是否完整安装");
      }
      resolvedBaseImage = defaultImage;
      baseImageSource = "项目内置 default.png（image_path 未设置）";
    }
  }

  const outputFile = `${outputBase}.png`;
  await embedCardMetadata(exportJson, resolvedBaseImage, outputFile, !!options.legacy);

  console.log("✅ 重建成功（PNG）");
  console.log(`- 输出文件: ${outputFile}`);
  console.log(`- 底图: ${resolvedBaseImage}（${baseImageSource}）`);
  console.log(`- 格式: ${useTavernFormat ? "SillyTavern 兼容" : "项目内部 V3"}`);
  console.log(`- legacy: ${options.legacy ? "开启" : "关闭"}`);
}

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("从仓库结构重建角色卡（默认输出 SillyTavern 兼容格式）")
    .argument("<repo>", "仓库目录路径")
    .option("-o, --output <name>", "输出文件名（不含扩展名）")
    .option("-f, --format <type>", "输出格式：json 或 png", "json")
    .option("-b, --base-image <file>", "输出 PNG 时使用的底图")
    .option("-c, --config <file>", "配置文件路径", "config.yaml")
    .option("-l, --legacy", "兼容输出 legacy chara chunk")
    .option("--internal", "输出本项目内部 V3 格式（不做酒馆兼容转换）")
    .action(runBuildCommand);
}
