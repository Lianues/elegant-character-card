import type { CharacterCardV3 } from "../models/cardSchemas.js";
import { transformExtensionsRegexScriptsToNative } from "./regexScriptTransforms.js";

/**
 * 将本项目内部 V3 格式（clean 结构）转换回 SillyTavern 兼容的角色卡 JSON。
 *
 * 输出严格对齐 SillyTavern 实际导出格式（字段顺序、字段集合、命名风格均一致）。
 */

type AnyRecord = Record<string, unknown>;

const POSITION_STRING_TO_NUM: Record<string, number> = {
  beforeChar: 0,
  afterChar: 1,
  beforeAn: 2,
  afterAn: 3,
  fixed: 4,
  beforeEm: 5,
  afterEm: 6,
  outlet: 7,
};

/**
 * SillyTavern V2 规范：顶层 `position` 字段只允许 "before_char" / "after_char"。
 * 精细位置（at_depth=4 / AN / EM 等）一律写为 "after_char"，由 extensions.position 数字承载真实语义。
 */
const POSITION_STRING_TO_LEGACY: Record<string, string> = {
  beforeChar: "before_char",
  afterChar: "after_char",
  beforeAn: "after_char",
  afterAn: "after_char",
  fixed: "after_char",
  beforeEm: "after_char",
  afterEm: "after_char",
  outlet: "after_char",
};

const ROLE_STRING_TO_NUM: Record<string, number> = {
  system: 0,
  user: 1,
  model: 2,
};

const SELECTIVE_LOGIC_STRING_TO_NUM: Record<string, number> = {
  andAny: 0,
  notAll: 1,
  notAny: 2,
  andAll: 3,
};

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 规范化路径链：分隔符统一为 `/`，去除首尾与多余分隔，去掉空段。
 * 与 hierarchy-manager 的 `normalizePathChain` 保持一致（不做文件名 sanitize，
 * 因为出口给酒馆/前端使用，不是写入磁盘的文件名）。
 */
function normalizePathChainForExport(rawPath: unknown): string {
  if (typeof rawPath !== "string") {
    return "";
  }
  return rawPath
    .split(/[\\/]/)
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0)
    .join("/");
}

function expandParentPaths(pathChain: string): string[] {
  const normalized = normalizePathChainForExport(pathChain);
  if (!normalized) return [];
  const segments = normalized.split("/");
  const result: string[] = [];
  for (let i = 1; i <= segments.length; i += 1) {
    result.push(segments.slice(0, i).join("/"));
  }
  return result;
}

/**
 * 收集所有路径，自动补齐父路径，去重并按层级 + 本地化排序。
 * 排序规则与 hierarchy-manager 的 `pathLocaleCompare` 对齐：
 * 先按深度升序，再按 zh-Hans-CN 本地化排序。
 */
function normalizeFolderPathsForExport(paths: Iterable<unknown>): string[] {
  const set = new Set<string>();
  for (const raw of paths) {
    for (const expanded of expandParentPaths(normalizePathChainForExport(raw))) {
      set.add(expanded);
    }
  }
  return Array.from(set).sort((a, b) => {
    const depthA = a ? a.split("/").length : 0;
    const depthB = b ? b.split("/").length : 0;
    if (depthA !== depthB) return depthA - depthB;
    return String(a).localeCompare(String(b), "zh-Hans-CN");
  });
}

/**
 * 优先使用源 extensions 中保留的原值，类型不匹配/缺失时才回落到默认值。
 * 这是为了保证 extract → repo → build 的字段无损往返。
 */
function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
/**
 * 宽松版 pickBool：boolean / number 都按原值保留（酒馆历史上 0/1 与
 * false/true 在这些 extension 字段里是等价混写的），仅在缺失或类型不符
 * 时回落到默认值。用于 extensions 内的"布尔类"字段，避免把原 JSON 中
 * 的 0 静默改写成 false（破坏无损往返）。
 */
function passBool(value: unknown, fallback: boolean): boolean | number {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}
function pickNum(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function pickStr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
/** 三态字段：保留 number / null / 默认 */
function pickNumOrNull(value: unknown, fallback: number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null) return null;
  return fallback;
}
/** 三态字段：保留 boolean / null / 默认 */
function pickBoolOrNull(value: unknown, fallback: boolean | null): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === null) return null;
  return fallback;
}

/**
 * 将 clean 格式的单条 entry 反转为 SillyTavern legacy 格式。
 * 字段顺序严格对齐：id, keys, secondary_keys, comment, content, constant,
 * selective, insertion_order, enabled, position, use_regex, extensions
 */
function cleanEntryToLegacy(entry: AnyRecord, displayIndex: number): AnyRecord {
  const other = isRecord(entry.other) ? entry.other : {};
  const sourceExt = isRecord(other.extensions) ? other.extensions : {};

  const positionStr = typeof entry.position === "string" ? entry.position : "beforeChar";
  const positionNum = POSITION_STRING_TO_NUM[positionStr] ?? 0;
  const positionLegacy = POSITION_STRING_TO_LEGACY[positionStr] ?? "before_char";

  const selectiveLogicStr =
    typeof entry.selectiveLogic === "string" ? entry.selectiveLogic : "andAny";
  const selectiveLogicNum = SELECTIVE_LOGIC_STRING_TO_NUM[selectiveLogicStr] ?? 0;

  // role：优先用 clean entry.role（仅 position=fixed 时被正向写入），
  // 否则回落到 sourceExt.role（可能为数字），最终默认 0
  const roleStr = typeof entry.role === "string" ? entry.role : null;
  const roleNum =
    roleStr && roleStr in ROLE_STRING_TO_NUM
      ? ROLE_STRING_TO_NUM[roleStr]
      : pickNum(sourceExt.role, 0);

  const idValue = typeof entry.index === "number" ? entry.index : 0;
  const depthValue = typeof entry.depth === "number" ? entry.depth : 4;
  const probabilityValue =
    typeof entry.probability === "number" ? entry.probability : 100;
  const orderValue = typeof entry.order === "number" ? entry.order : 100;
  const caseSensitiveValue =
    entry.caseSensitive === undefined || entry.caseSensitive === null
      ? null
      : entry.caseSensitive;

  // 严格按参考顺序构建 extensions
  const extensions: AnyRecord = {
    position: positionNum,
    exclude_recursion: passBool(sourceExt.exclude_recursion, Boolean(entry.excludeRecursion)),
    display_index: pickNum(sourceExt.display_index, displayIndex),
    probability: probabilityValue,
    useProbability: passBool(sourceExt.useProbability, true),
    depth: depthValue,
    selectiveLogic: selectiveLogicNum,
    outlet_name: pickStr(sourceExt.outlet_name, ""),
    group: pickStr(sourceExt.group, ""),
    group_override: passBool(sourceExt.group_override ?? sourceExt.groupOverride, false),
    group_weight: pickNum(sourceExt.group_weight ?? sourceExt.groupWeight, 100),
    prevent_recursion: passBool(sourceExt.prevent_recursion, Boolean(entry.preventRecursion)),
    delay_until_recursion: passBool(
      sourceExt.delay_until_recursion ?? sourceExt.delayUntilRecursion,
      false,
    ),
    scan_depth: pickNumOrNull(sourceExt.scan_depth, null),
    match_whole_words: pickBoolOrNull(sourceExt.match_whole_words, null),
    use_group_scoring: passBool(
      sourceExt.use_group_scoring ?? sourceExt.useGroupScoring,
      false,
    ),
    case_sensitive: caseSensitiveValue,
    automation_id: pickStr(sourceExt.automation_id ?? sourceExt.automationId, ""),
    role: roleNum,
    vectorized:
      entry.activationMode === "vector"
        ? true
        : passBool(sourceExt.vectorized, false),
    sticky: pickNum(sourceExt.sticky, 0),
    cooldown: pickNum(sourceExt.cooldown, 0),
    delay: pickNum(sourceExt.delay, 0),
    match_persona_description: passBool(sourceExt.match_persona_description, false),
    match_character_description: passBool(sourceExt.match_character_description, false),
    match_character_personality: passBool(sourceExt.match_character_personality, false),
    match_character_depth_prompt: passBool(sourceExt.match_character_depth_prompt, false),
    match_scenario: passBool(sourceExt.match_scenario, false),
    match_creator_notes: passBool(sourceExt.match_creator_notes, false),
    triggers: Array.isArray(sourceExt.triggers) ? sourceExt.triggers : [],
    ignore_budget: passBool(sourceExt.ignore_budget, false),
  };

  // 严格按参考顺序构建 entry
  const legacy: AnyRecord = {
    id: idValue,
    keys: Array.isArray(entry.key) ? entry.key : [],
    secondary_keys: Array.isArray(entry.secondaryKey) ? entry.secondaryKey : [],
    comment: typeof entry.name === "string" ? entry.name : "",
    content: typeof entry.content === "string" ? entry.content : "",
    constant: entry.activationMode === "always",
    // selective：原始 SillyTavern 字段是布尔；正向若为 null 则视作未设置
    selective: typeof other.selective === "boolean" ? other.selective : true,
    insertion_order: orderValue,
    enabled: entry.enabled !== false,
    position: positionLegacy,
    use_regex: pickBool(other.use_regex, false),
    // hierarchy-manager 对齐：把仓库内 entry.path_chain 作为顶层字段透出
    // （与其 characterbook-sync.js 中 ENTRY_PATH_KEY 写入位置一致：use_regex 之后、extensions 之前）
    path_chain: normalizePathChainForExport(entry.path_chain),
    extensions,
  };

  return legacy;
}

/**
 * world_book → character_book，字段顺序：entries, name
 * （仅在源数据中存在的可选字段才追加，保持与 SillyTavern 实际导出一致的简洁性）
 */
function worldBookToCharacterBook(worldBook: AnyRecord): AnyRecord {
  const entries = Array.isArray(worldBook.entries)
    ? worldBook.entries
        .filter((e): e is AnyRecord => isRecord(e))
        .map((e, idx) => cleanEntryToLegacy(e, idx))
    : [];

  const result: AnyRecord = {
    entries,
  };

  if (typeof worldBook.name === "string" && worldBook.name) {
    result.name = worldBook.name;
  }
  if (typeof worldBook.description === "string" && worldBook.description) {
    result.description = worldBook.description;
  }
  if (typeof worldBook.scan_depth === "number") {
    result.scan_depth = worldBook.scan_depth;
  }
  if (typeof worldBook.token_budget === "number") {
    result.token_budget = worldBook.token_budget;
  }
  if (typeof worldBook.recursive_scanning === "boolean") {
    result.recursive_scanning = worldBook.recursive_scanning;
  }
  if (isRecord(worldBook.extensions) && Object.keys(worldBook.extensions).length > 0) {
    result.extensions = worldBook.extensions;
  }

  // hierarchy-manager 对齐：把世界书层级目录列表 folder_paths 透出到 character_book 顶层。
  // 同时合并所有 entry 的 path_chain（自动补齐父路径），确保即使 _metadata.yaml 没显式列出
  // folder_paths 也不会丢失层级信息。仅在最终列表非空时才写入字段，避免给无层级的卡引入冗余字段。
  const collectedFolderPaths = normalizeFolderPathsForExport([
    ...(Array.isArray(worldBook.folder_paths) ? worldBook.folder_paths : []),
    ...(Array.isArray(worldBook.entries)
      ? worldBook.entries
          .filter((entry): entry is AnyRecord => isRecord(entry))
          .map((entry) => entry.path_chain)
      : []),
  ]);
  if (collectedFolderPaths.length > 0) {
    result.folder_paths = collectedFolderPaths;
  }

  return result;
}

/**
 * 当前日期，ISO 字符串格式（与酒馆导出 create_date 一致）。
 */
function nowIsoDate(): string {
  return new Date().toISOString();
}

/**
 * 将本项目 CharacterCardV3 转为 SillyTavern 期望的角色卡 JSON。
 *
 * 顶层顺序：
 *   name, description, personality, scenario, first_mes, mes_example,
 *   creatorcomment, avatar, talkativeness, fav, tags, spec, spec_version,
 *   data, create_date
 *
 * data 顺序：
 *   name, description, personality, scenario, first_mes, mes_example,
 *   creator_notes, system_prompt, post_history_instructions, tags, creator,
 *   character_version, alternate_greetings, extensions, group_only_greetings,
 *   character_book
 */
export function convertV3ToTavernCard(card: CharacterCardV3): AnyRecord {
  const data = card.data;
  const messages = Array.isArray(data.message) ? data.message : [];
  const firstMes = messages.length > 0 ? messages[0] : "";
  const alternateGreetings = messages.length > 1 ? messages.slice(1) : [];

  const characterBook = data.world_book
    ? worldBookToCharacterBook(data.world_book as unknown as AnyRecord)
    : null;

  const rawExtensions: AnyRecord = isRecord(data.extensions) ? { ...data.extensions } : {};
  // 出口：把仓库里的 friendly 格式 regex_scripts 转回 SillyTavern 原生字段
  const extensions: AnyRecord = transformExtensionsRegexScriptsToNative(
    rawExtensions,
  ) as AnyRecord;
  const talkativeness =
    extensions.talkativeness !== undefined ? extensions.talkativeness : "0.5";
  const fav = extensions.fav !== undefined ? extensions.fav : false;

  // data 部分（严格按参考顺序）
  const tavernData: AnyRecord = {
    name: data.name,
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    first_mes: firstMes,
    mes_example: data.mes_example,
    creator_notes: data.creator_notes,
    system_prompt: data.system_prompt,
    post_history_instructions: data.post_history_instructions,
    tags: data.tags,
    creator: data.creator,
    character_version: data.character_version,
    alternate_greetings: alternateGreetings,
    extensions,
    group_only_greetings: data.group_only_greetings ?? [],
  };

  if (characterBook) {
    tavernData.character_book = characterBook;
  }

  // 顶层（严格按参考顺序）
  const tavernCard: AnyRecord = {
    name: data.name,
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    first_mes: firstMes,
    mes_example: data.mes_example,
    creatorcomment: data.creator_notes,
    avatar: "none",
    talkativeness,
    fav,
    tags: data.tags,
    spec: card.spec,
    spec_version: card.spec_version,
    data: tavernData,
    create_date: nowIsoDate(),
  };

  return tavernCard;
}
