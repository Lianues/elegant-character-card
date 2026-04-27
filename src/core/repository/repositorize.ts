import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import type { CharacterCardV3 } from "../models/cardSchemas.js";
import { loadConfig } from "../config/loadConfig.js";
import { stripCardMetadataFromPng } from "../png/metadata.js";
import {
  handleField,
  sanitizeFilename,
  stripDefaultEmptyFields,
} from "./fieldHandlers.js";

/** 仓库根目录中默认裸图文件名 */
export const REPO_DEFAULT_IMAGE_FILENAME = "character.png";

/**
 * 解析项目内置 docs/ 目录路径。兼容：
 *   - 开发模式（tsx）：当前位于 src/core/repository/，docs 在 src/docs
 *   - 生产模式：当前位于 dist/core/repository/，docs 在 dist/docs（由 build 脚本复制）
 */
function resolveProjectDocsDir(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, "../../docs");
  return existsSync(candidate) ? candidate : null;
}

/**
 * 把项目内置的 docs/ 复制到仓库根 docs/ 子目录。
 * 如果目标目录已存在则覆盖（保持文档与项目版本同步）。
 */
async function copyProjectDocsTo(repoDir: string): Promise<boolean> {
  const sourceDocsDir = resolveProjectDocsDir();
  if (!sourceDocsDir) {
    return false;
  }
  await cp(sourceDocsDir, path.join(repoDir, "docs"), {
    recursive: true,
    force: true,
  });
  return true;
}

/**
 * 将角色卡拆分为仓库结构。
 *
 * @param card             已解析的 V3 角色卡
 * @param configPath       配置文件路径
 * @param sourceImagePath  当来源是 PNG 时传入原图路径，会自动剥离 metadata chunk
 *                         并保存为 `<repo>/character.png`，同时把相对路径写入
 *                         `_metadata.yaml` 的 `data.image_path`，作为 build PNG
 *                         时的默认底图。当来源是 JSON 时不传，`image_path` 为空。
 */
export async function repositorize(
  card: CharacterCardV3,
  configPath = "config.yaml",
  sourceImagePath?: string,
): Promise<string> {
  if (!card || !card.data) {
    throw new Error("Invalid character card data");
  }

  const config = await loadConfig(configPath);
  const fieldsConfig = config.repositorize.fields;

  const basePath = sanitizeFilename(card.data.name);
  await mkdir(basePath, { recursive: true });

  // 复制项目内置的 yaml 规范文档到仓库 docs/ 子目录
  await copyProjectDocsTo(basePath);

  // 当来源是 PNG 时，复制一份"裸图"到仓库根目录
  let imagePath = "";
  if (sourceImagePath && sourceImagePath.toLowerCase().endsWith(".png")) {
    const cleanImageDestination = path.join(basePath, REPO_DEFAULT_IMAGE_FILENAME);
    await stripCardMetadataFromPng(sourceImagePath, cleanImageDestination);
    imagePath = REPO_DEFAULT_IMAGE_FILENAME;
  }

  const metadata = structuredClone(card) as Record<string, unknown>;
  const data = structuredClone(card.data) as Record<string, unknown>;

  for (const [fieldName, fieldConfig] of Object.entries(fieldsConfig)) {
    if (!fieldConfig.enabled || !(fieldName in data)) {
      continue;
    }

    const fieldData = data[fieldName];
    delete data[fieldName];

    if (!fieldData) {
      data[fieldName] = fieldData;
      continue;
    }

    await handleField(fieldData, fieldConfig.type, fieldConfig, basePath, fieldName, data);
  }

  // 写入前剔除原版酒馆卡里不存在的冗余字段（null / 空对象），如：
  //   nickname/source/creation_date/modification_date/assets/creator_notes_multilingual
  const cleanedData = stripDefaultEmptyFields(data);
  // image_path 始终写入 data 末尾（项目内部字段，build PNG 时用作默认底图；
  // 反向构建时被 V3 schema 自动忽略，不会污染输出）
  cleanedData.image_path = imagePath;
  metadata.data = cleanedData;

  await writeFile(
    path.join(basePath, "_metadata.yaml"),
    YAML.stringify(metadata, { indent: 2, lineWidth: 0, sortMapEntries: false }),
    "utf-8",
  );

  return basePath;
}
