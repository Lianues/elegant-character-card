import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import YAML from "yaml";

import type { CharacterCardV3 } from "../models/cardSchemas.js";
import { loadConfig } from "../config/loadConfig.js";
import { handleField, sanitizeFilename } from "./fieldHandlers.js";

/**
 * 将角色卡拆分为仓库结构。
 */
export async function repositorize(
  card: CharacterCardV3,
  configPath = "config.yaml",
): Promise<string> {
  if (!card || !card.data) {
    throw new Error("Invalid character card data");
  }

  const config = await loadConfig(configPath);
  const fieldsConfig = config.repositorize.fields;

  const basePath = sanitizeFilename(card.data.name);
  await mkdir(basePath, { recursive: true });

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

  metadata.data = data;

  await writeFile(
    path.join(basePath, "_metadata.yaml"),
    YAML.stringify(metadata, { indent: 2, lineWidth: 0, sortMapEntries: false }),
    "utf-8",
  );

  return basePath;
}
