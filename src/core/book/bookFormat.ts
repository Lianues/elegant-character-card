type AnyRecord = Record<string, unknown>;

type ActivationMode = "always" | "keyword" | "vector";
type SelectiveLogic = "andAny" | "andAll" | "notAll" | "notAny";
type PositionValue =
  | "beforeChar"
  | "afterChar"
  | "beforeEm"
  | "afterEm"
  | "beforeAn"
  | "afterAn"
  | "fixed"
  | "outlet";
type RoleValue = "system" | "user" | "model";

const POSITION_NUM_TO_STRING: Record<number, PositionValue> = {
  0: "beforeChar",
  1: "afterChar",
  2: "beforeAn",
  3: "afterAn",
  4: "fixed",
  5: "beforeEm",
  6: "afterEm",
  7: "outlet",
};

const ROLE_NUM_TO_STRING: Record<number, RoleValue> = {
  0: "system",
  1: "user",
  2: "model",
};

const SELECTIVE_LOGIC_NUM_TO_STRING: Record<number, SelectiveLogic> = {
  0: "andAny",
  1: "notAll",
  2: "notAny",
  3: "andAll",
};

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function resolvePositionString(position: unknown, extensions: AnyRecord): PositionValue {
  const extPos = extensions.position ?? position;
  if (typeof extPos === "number" && extPos in POSITION_NUM_TO_STRING) {
    return POSITION_NUM_TO_STRING[extPos];
  }

  if (typeof position === "string") {
    switch (position) {
      case "beforeChar":
        return "beforeChar";
      case "afterChar":
        return "afterChar";
      case "before_char":
        return "beforeChar";
      case "after_char":
        return "afterChar";
      default:
        break;
    }
  }

  return "beforeChar";
}

function resolveActivationMode(constant: unknown, extensions: AnyRecord): ActivationMode {
  if (constant === true) {
    return "always";
  }

  if (extensions.vectorized === true) {
    return "vector";
  }

  return "keyword";
}

function resolveSelectiveLogic(extensions: AnyRecord, fallbackRaw?: unknown): SelectiveLogic {
  const raw = extensions.selectiveLogic ?? extensions.selective_logic ?? fallbackRaw;

  if (typeof raw === "number" && raw in SELECTIVE_LOGIC_NUM_TO_STRING) {
    return SELECTIVE_LOGIC_NUM_TO_STRING[raw];
  }

  if (raw === "andAny" || raw === "andAll" || raw === "notAll" || raw === "notAny") {
    return raw;
  }

  return "andAny";
}

function isLegacyBookEntry(entry: AnyRecord): boolean {
  return "keys" in entry || "comment" in entry || "secondary_keys" in entry;
}

function legacyBookEntryToCleanEntry(entry: AnyRecord): AnyRecord {
  const extensions = isRecord(entry.extensions) ? entry.extensions : {};
  const position = resolvePositionString(entry.position, extensions);
  const activationMode = resolveActivationMode(entry.constant, extensions);
  const selectiveLogic = resolveSelectiveLogic(extensions, entry.selectiveLogic);

  const roleRaw = extensions.role;
  const role =
    position === "fixed"
      ? typeof roleRaw === "number" && roleRaw in ROLE_NUM_TO_STRING
        ? ROLE_NUM_TO_STRING[roleRaw]
        : "system"
      : null;

  const caseSensitive =
    entry.case_sensitive === undefined
      ? (extensions.case_sensitive as boolean | null | undefined) ?? null
      : (entry.case_sensitive as boolean | null);

  // 过滤 extensions：剔除所有已经被 clean 字段表示的键，避免 YAML 中出现"同一信息两份"
  // 同时也不再保留 position_raw（可由 clean.position 完全反推）
  const REDUNDANT_EXT_KEYS = new Set([
    "position",
    "depth",
    "probability",
    "selectiveLogic",
    "selective_logic",
    "role",
    "exclude_recursion",
    "excludeRecursion",
    "prevent_recursion",
    "preventRecursion",
    "vectorized",
    "case_sensitive",
    "caseSensitive",
    // path_chain 也由 clean 顶层字段表示——导出端把它塞进 extensions 只是为了
    // 穿透 SillyTavern 的 character_book→world_info 转换；这里反向还原后必须把
    // extensions 里的副本剔除，否则 YAML 会出现"同一信息两份"
    "path_chain",
    // _filename 同理：也是借 extensions 通道穿透 JSON 导出/导入，
    // 反向还原到 clean 顶层后必须从 extensions 剔除，避免重复
    "_filename",
  ]);
  const residualExtensions: AnyRecord = {};
  for (const [key, value] of Object.entries(extensions)) {
    if (!REDUNDANT_EXT_KEYS.has(key)) {
      residualExtensions[key] = value;
    }
  }

  const other: AnyRecord = {
    use_regex: entry.use_regex ?? false,
    selective: entry.selective ?? null,
    name: entry.name ?? null,
    priority: entry.priority ?? null,
  };
  if (Object.keys(residualExtensions).length > 0) {
    other.extensions = residualExtensions;
  }

  return {
    index: asNumber(entry.id ?? entry.uid, 0),
    name: String(entry.comment ?? entry.name ?? ""),
    content: String(entry.content ?? ""),
    enabled: entry.enabled !== false && entry.disable !== true,
    activationMode,
    key: asStringArray(entry.keys ?? entry.key),
    secondaryKey: asStringArray(entry.secondary_keys ?? entry.keysecondary),
    selectiveLogic,
    role,
    caseSensitive,
    excludeRecursion: Boolean(extensions.exclude_recursion ?? extensions.excludeRecursion),
    preventRecursion: Boolean(extensions.prevent_recursion ?? extensions.preventRecursion),
    probability: asNumber(extensions.probability ?? entry.probability, 100),
    position,
    order: asNumber(entry.insertion_order ?? entry.order, 100),
    depth: asNumber(extensions.depth ?? entry.depth, 4),
    // 从 extensions.path_chain 还原：导出端统一把它塞进 extensions 以穿透 ST 导入流程，
    // 不读顶层（顶层不是稳定来源，只在仓库内部传递时短暂存在）。
    path_chain: String(extensions.path_chain ?? ""),
    // 同 path_chain：_filename 只从 extensions._filename 还原。
    _filename: String(extensions._filename ?? ""),
    other,
  };
}

function normalizeBookEntries(entries: unknown): unknown {
  if (!Array.isArray(entries)) {
    return entries;
  }

  return entries.map((entry) => {
    if (!isRecord(entry) || !isLegacyBookEntry(entry)) {
      return entry;
    }

    return legacyBookEntryToCleanEntry(entry);
  });
}

/**
 * 将 payload 中旧字段统一迁移到新字段：
 * - data.character_book -> data.world_book
 * - data.first_mes + data.alternate_greetings -> data.message
 * - 删除 data.first_mes / data.alternate_greetings / data.character_book
 */
export function normalizeLegacyBookInPayload(payload: unknown): unknown {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return payload;
  }

  const data = payload.data as AnyRecord;

  const worldBookRaw = isRecord(data.world_book)
    ? (data.world_book as AnyRecord)
    : isRecord(data.character_book)
      ? (data.character_book as AnyRecord)
      : null;

  const normalizedData: AnyRecord = {
    ...data,
  };

  if (worldBookRaw) {
    // hierarchy-manager 对齐反向：folder_paths 在导出时被塞进 character_book.extensions.folder_paths
    // 以穿透 SillyTavern 的 character_book→world_info 转换，这里反向从 extensions 捞回顶层。
    // 不再支持顶层 folder_paths 作为来源——extensions 是唯一稳定通道。
    const worldBookExtensions = isRecord(worldBookRaw.extensions)
      ? (worldBookRaw.extensions as AnyRecord)
      : null;
    const normalizedWorldBook: AnyRecord = {
      ...worldBookRaw,
      entries: normalizeBookEntries(worldBookRaw.entries),
    };
    if (worldBookExtensions && "folder_paths" in worldBookExtensions) {
      const { folder_paths: rawFolderPaths, ...restExtensions } = worldBookExtensions;
      // 反向还原后从 extensions 中剔除 folder_paths，避免"同一信息两份"
      normalizedWorldBook.extensions = restExtensions;
      if (Array.isArray(rawFolderPaths)) {
        normalizedWorldBook.folder_paths = rawFolderPaths.map((item) => String(item));
      }
    }
    normalizedData.world_book = normalizedWorldBook;
  }

  if (!("message" in normalizedData)) {
    const mergedMessage: string[] = [];

    if (typeof data.first_mes === "string") {
      mergedMessage.push(data.first_mes);
    }

    if (Array.isArray(data.alternate_greetings)) {
      for (const msg of data.alternate_greetings) {
        mergedMessage.push(String(msg));
      }
    }

    normalizedData.message = mergedMessage;
  }

  delete normalizedData.character_book;
  delete normalizedData.alternate_greetings;
  delete normalizedData.first_mes;

  return {
    ...payload,
    data: normalizedData,
  };
}

/**
 * extract 输出使用的新格式（当前即直接执行旧->新迁移）。
 */
export function formatBookForReadableOutput(payload: unknown): unknown {
  return normalizeLegacyBookInPayload(payload);
}
