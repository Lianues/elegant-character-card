import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import { normalizeLegacyBookInPayload } from "../book/bookFormat.js";
import { loadConfig } from "../config/loadConfig.js";
import type { FieldConfig } from "../config/types.js";
import { WorldBookSchema, type WorldBook } from "../models/cardSchemas.js";
import {
  dumpArrayField,
  loadArrayField,
  sanitizeFilename,
} from "../repository/fieldHandlers.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePathChain(rawPath: unknown): string {
  if (typeof rawPath !== "string") {
    return "";
  }

  const segments = rawPath
    .split(/[\\/]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => sanitizeFilename(segment));

  return segments.join("/");
}

function expandPathWithParents(pathChain: string): string[] {
  const normalized = normalizePathChain(pathChain);
  if (!normalized) {
    return [];
  }

  const segments = normalized.split("/");
  const result: string[] = [];
  for (let i = 1; i <= segments.length; i += 1) {
    result.push(segments.slice(0, i).join("/"));
  }

  return result;
}

function dedupeAndSortPathChains(paths: string[]): string[] {
  const unique = new Set<string>();
  for (const pathChain of paths) {
    for (const expanded of expandPathWithParents(pathChain)) {
      unique.add(expanded);
    }
  }

  return Array.from(unique).sort((a, b) =>
    a.localeCompare(b, "zh-CN", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function parseJson(text: string, context: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context} 不是有效 JSON：${message}`);
  }
}

function normalizeStandaloneEntry(entry: unknown): unknown {
  if (!isRecord(entry)) {
    return entry;
  }

  const normalized: Record<string, unknown> = { ...entry };

  if (!("id" in normalized) && "uid" in normalized) {
    normalized.id = normalized.uid;
  }

  if (!("enabled" in normalized) && "disable" in normalized) {
    normalized.enabled = !Boolean(normalized.disable);
  }

  if (!("insertion_order" in normalized) && "order" in normalized) {
    normalized.insertion_order = normalized.order;
  }

  if (!("keys" in normalized) && Array.isArray(normalized.key)) {
    normalized.keys = normalized.key;
  }

  if (!("secondary_keys" in normalized) && Array.isArray(normalized.keysecondary)) {
    normalized.secondary_keys = normalized.keysecondary;
  }

  if (!("case_sensitive" in normalized) && "caseSensitive" in normalized) {
    normalized.case_sensitive = normalized.caseSensitive;
  }

  const extensions = isRecord(normalized.extensions) ? { ...normalized.extensions } : {};

  const extMappings: Array<[string, unknown]> = [
    ["position", normalized.position],
    ["depth", normalized.depth],
    ["probability", normalized.probability],
    ["selectiveLogic", normalized.selectiveLogic],
    ["role", normalized.role],
    ["exclude_recursion", normalized.excludeRecursion],
    ["prevent_recursion", normalized.preventRecursion],
    ["vectorized", normalized.vectorized],
    ["case_sensitive", normalized.caseSensitive],
  ];

  for (const [key, value] of extMappings) {
    if (!(key in extensions) && value !== undefined) {
      extensions[key] = value;
    }
  }

  normalized.extensions = extensions;

  return normalized;
}

function normalizeStandaloneWorldBookPayload(payload: unknown): WorldBook {
  if (!isRecord(payload)) {
    throw new Error("世界书 JSON 必须是对象");
  }

  const rawEntries = payload.entries;
  const normalizedEntries = Array.isArray(rawEntries)
    ? rawEntries.map((entry) => normalizeStandaloneEntry(entry))
    : isRecord(rawEntries)
      ? Object.values(rawEntries).map((entry) => normalizeStandaloneEntry(entry))
      : [];

  const wrappedPayload = {
    data: {
      character_book: {
        ...payload,
        entries: normalizedEntries,
      },
    },
  };

  const normalizedPayload = normalizeLegacyBookInPayload(wrappedPayload) as {
    data?: { world_book?: unknown };
  };

  return WorldBookSchema.parse(normalizedPayload.data?.world_book ?? payload);
}

async function getWorldBookEntriesConfig(configPath: string): Promise<FieldConfig> {
  const config = await loadConfig(configPath);
  const worldBookField = config.repositorize.fields.world_book;
  if (!worldBookField || worldBookField.type !== "nested" || !worldBookField.fields?.entries) {
    throw new Error("配置中缺少 repositorize.fields.world_book.fields.entries");
  }

  return worldBookField.fields.entries;
}

async function listRelativeDirectoriesRecursively(rootPath: string): Promise<string[]> {
  const directories: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, absolutePath).replaceAll("\\", "/");
      const normalized = normalizePathChain(relativePath);
      if (normalized) {
        directories.push(normalized);
      }

      await walk(absolutePath);
    }
  }

  await walk(rootPath);
  return directories;
}

export async function loadWorldBookFromJson(jsonPath: string): Promise<WorldBook> {
  if (!existsSync(jsonPath)) {
    throw new Error(`输入文件不存在: ${jsonPath}`);
  }

  const content = await readFile(jsonPath, "utf-8");
  const payload = parseJson(content, jsonPath);
  return normalizeStandaloneWorldBookPayload(payload);
}

export async function repositorizeWorldBook(
  worldBook: WorldBook,
  outputDir: string,
  configPath = "config.yaml",
): Promise<string> {
  const entriesConfig = await getWorldBookEntriesConfig(configPath);

  await mkdir(outputDir, { recursive: true });

  const entriesPath = path.join(outputDir, "entries");
  await mkdir(entriesPath, { recursive: true });

  await dumpArrayField(worldBook.entries, entriesConfig, outputDir, "entries");

  const folderPaths = dedupeAndSortPathChains([
    ...(worldBook.folder_paths ?? []),
    ...worldBook.entries.map((entry) => entry.path_chain),
  ]);

  for (const folderPath of folderPaths) {
    await mkdir(path.join(entriesPath, ...folderPath.split("/")), { recursive: true });
  }

  const { folder_paths: _folderPaths, ...worldBookWithoutFolders } = worldBook;
  const metadata = {
    ...worldBookWithoutFolders,
    entries: entriesPath,
  };
  delete (metadata as Record<string, unknown>).folder_paths;

  await writeFile(
    path.join(outputDir, "_metadata.yaml"),
    YAML.stringify(metadata, { indent: 2, lineWidth: 0, sortMapEntries: false }),
    "utf-8",
  );

  return outputDir;
}

export async function repositorizeWorldBookFromJson(
  jsonPath: string,
  outputDir?: string,
  configPath = "config.yaml",
): Promise<string> {
  const worldBook = await loadWorldBookFromJson(jsonPath);
  const targetDir =
    outputDir ||
    sanitizeFilename(
      worldBook.name ?? path.parse(jsonPath).name ?? "world_book",
    );
  return repositorizeWorldBook(worldBook, targetDir, configPath);
}

export async function rebuildWorldBook(
  repoPath: string,
  configPath = "config.yaml",
): Promise<WorldBook> {
  const entriesConfig = await getWorldBookEntriesConfig(configPath);

  const metadataPath = path.join(repoPath, "_metadata.yaml");
  if (!existsSync(metadataPath)) {
    throw new Error(`世界书元数据不存在: ${metadataPath}`);
  }

  const metadataContent = await readFile(metadataPath, "utf-8");
  const metadata = YAML.parse(metadataContent);
  if (!isRecord(metadata)) {
    throw new Error(`世界书元数据无效: ${metadataPath}`);
  }

  const entries = await loadArrayField(entriesConfig, repoPath, "entries");
  const parsedEntries = WorldBookSchema.shape.entries.parse(entries);

  const entriesPath = path.join(repoPath, "entries");
  const folderPathsFromDirs = existsSync(entriesPath)
    ? dedupeAndSortPathChains(await listRelativeDirectoriesRecursively(entriesPath))
    : [];

  const folderPathsFromEntries = dedupeAndSortPathChains(
    parsedEntries.map((entry) => entry.path_chain),
  );

  const worldBookPayload = {
    ...metadata,
    entries: parsedEntries,
    folder_paths: dedupeAndSortPathChains([...folderPathsFromDirs, ...folderPathsFromEntries]),
  };

  return WorldBookSchema.parse(worldBookPayload);
}
