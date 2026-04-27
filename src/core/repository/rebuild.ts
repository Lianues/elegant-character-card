import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import { loadConfig } from "../config/loadConfig.js";
import { CharacterCardV3Schema, type CharacterCardV3 } from "../models/cardSchemas.js";
import {
  loadArrayField,
  loadDictField,
  loadNestedField,
  loadStringField,
} from "./fieldHandlers.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 读取仓库根 `_metadata.yaml` 中的 `data.image_path`。
 *
 * @returns
 *   - `{ raw: null, resolved: null }` 字段未设置或为空字符串
 *   - `{ raw: <原值>, resolved: <绝对路径> }` 字段已设置（无论文件是否存在）
 *
 * 由调用方决定"未设置时回落到默认图"vs"已设置但文件缺失则报错"。
 */
export async function getRepoImagePath(
  basePath: string,
): Promise<{ raw: string | null; resolved: string | null }> {
  const mainMetadataPath = path.join(basePath, "_metadata.yaml");
  if (!existsSync(mainMetadataPath)) {
    return { raw: null, resolved: null };
  }

  const metadataContent = await readFile(mainMetadataPath, "utf-8");
  const metadata = YAML.parse(metadataContent);
  if (!isRecord(metadata) || !isRecord(metadata.data)) {
    return { raw: null, resolved: null };
  }

  const value = (metadata.data as Record<string, unknown>).image_path;
  if (typeof value !== "string" || value.length === 0) {
    return { raw: null, resolved: null };
  }

  const resolved = path.isAbsolute(value) ? value : path.join(basePath, value);
  return { raw: value, resolved };
}

/**
 * 从仓库结构重建角色卡。
 */
export async function rebuildCard(
  basePath: string,
  configPath = "config.yaml",
): Promise<CharacterCardV3> {
  const config = await loadConfig(configPath);
  const fieldsConfig = config.repositorize.fields;

  const mainMetadataPath = path.join(basePath, "_metadata.yaml");
  if (!existsSync(mainMetadataPath)) {
    throw new Error(`Main metadata file not found: ${mainMetadataPath}`);
  }

  const mainMetadataContent = await readFile(mainMetadataPath, "utf-8");
  const metadata = YAML.parse(mainMetadataContent);
  if (!isRecord(metadata)) {
    throw new Error(`Main metadata is invalid: ${mainMetadataPath}`);
  }

  const data = metadata.data;
  if (!isRecord(data)) {
    throw new Error(`Card data section is invalid: ${mainMetadataPath}`);
  }

  for (const [fieldName, fieldConfig] of Object.entries(fieldsConfig)) {
    if (!fieldConfig.enabled || !(fieldName in data)) {
      continue;
    }

    const marker = data[fieldName];
    if (typeof marker !== "string" || !marker.startsWith(basePath)) {
      continue;
    }

    if (fieldConfig.type === "string") {
      const filename = fieldConfig.filename ?? `${fieldName}.md`;
      const content = await loadStringField(basePath, filename);
      if (content !== null) {
        data[fieldName] = content;
      }
    } else if (fieldConfig.type === "array") {
      data[fieldName] = await loadArrayField(fieldConfig, basePath, fieldName);
    } else if (fieldConfig.type === "dict") {
      data[fieldName] = await loadDictField(fieldConfig, basePath, fieldName);
    } else if (fieldConfig.type === "nested") {
      data[fieldName] = await loadNestedField(fieldConfig, basePath, fieldName);
    }
  }

  metadata.data = data;

  try {
    return CharacterCardV3Schema.parse(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Card validation failed: ${message}`);
  }
}
