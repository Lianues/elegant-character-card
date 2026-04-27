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
    path_chain: String(entry.path_chain ?? ""),
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
    normalizedData.world_book = {
      ...worldBookRaw,
      entries: normalizeBookEntries(worldBookRaw.entries),
    };
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
