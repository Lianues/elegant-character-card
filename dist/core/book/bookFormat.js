const POSITION_NUM_TO_STRING = {
    0: "beforeChar",
    1: "afterChar",
    2: "beforeAn",
    3: "afterAn",
    4: "fixed",
    5: "beforeEm",
    6: "afterEm",
    7: "outlet",
};
const ROLE_NUM_TO_STRING = {
    0: "system",
    1: "user",
    2: "model",
};
const SELECTIVE_LOGIC_NUM_TO_STRING = {
    0: "andAny",
    1: "notAll",
    2: "notAny",
    3: "andAll",
};
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function asStringArray(value) {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
}
function asNumber(value, fallback) {
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
function resolvePositionString(position, extensions) {
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
function resolveActivationMode(constant, extensions) {
    if (constant === true) {
        return "always";
    }
    if (extensions.vectorized === true) {
        return "vector";
    }
    return "keyword";
}
function resolveSelectiveLogic(extensions, fallbackRaw) {
    const raw = extensions.selectiveLogic ?? extensions.selective_logic ?? fallbackRaw;
    if (typeof raw === "number" && raw in SELECTIVE_LOGIC_NUM_TO_STRING) {
        return SELECTIVE_LOGIC_NUM_TO_STRING[raw];
    }
    if (raw === "andAny" || raw === "andAll" || raw === "notAll" || raw === "notAny") {
        return raw;
    }
    return "andAny";
}
function isLegacyBookEntry(entry) {
    return "keys" in entry || "comment" in entry || "secondary_keys" in entry;
}
function legacyBookEntryToCleanEntry(entry) {
    const extensions = isRecord(entry.extensions) ? entry.extensions : {};
    const position = resolvePositionString(entry.position, extensions);
    const activationMode = resolveActivationMode(entry.constant, extensions);
    const selectiveLogic = resolveSelectiveLogic(extensions, entry.selectiveLogic);
    const roleRaw = extensions.role;
    const role = position === "fixed"
        ? typeof roleRaw === "number" && roleRaw in ROLE_NUM_TO_STRING
            ? ROLE_NUM_TO_STRING[roleRaw]
            : "system"
        : null;
    const caseSensitive = entry.case_sensitive === undefined
        ? extensions.case_sensitive ?? null
        : entry.case_sensitive;
    const other = {
        use_regex: entry.use_regex ?? false,
        selective: entry.selective ?? null,
        name: entry.name ?? null,
        priority: entry.priority ?? null,
        position_raw: entry.position ?? null,
        extensions,
    };
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
function normalizeBookEntries(entries) {
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
export function normalizeLegacyBookInPayload(payload) {
    if (!isRecord(payload) || !isRecord(payload.data)) {
        return payload;
    }
    const data = payload.data;
    const worldBookRaw = isRecord(data.world_book)
        ? data.world_book
        : isRecord(data.character_book)
            ? data.character_book
            : null;
    const normalizedData = {
        ...data,
    };
    if (worldBookRaw) {
        normalizedData.world_book = {
            ...worldBookRaw,
            entries: normalizeBookEntries(worldBookRaw.entries),
        };
    }
    if (!("message" in normalizedData)) {
        const mergedMessage = [];
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
export function formatBookForReadableOutput(payload) {
    return normalizeLegacyBookInPayload(payload);
}
