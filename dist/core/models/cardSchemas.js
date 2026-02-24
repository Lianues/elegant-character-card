import { z } from "zod";
const IntegerSchema = z.number().int();
/**
 * 角色卡资产定义（icon/background/emotion 等）。
 */
export const AssetSchema = z.object({
    type: z.string(),
    uri: z.string(),
    name: z.string(),
    ext: z.string(),
});
/**
 * 旧酒馆格式（legacy）LorebookEntry，仅用于旧来源升级到新格式。
 */
export const LegacyLorebookEntrySchema = z.object({
    keys: z.array(z.string()).default([]),
    content: z.string(),
    extensions: z.record(z.unknown()).default({}),
    enabled: z.boolean().default(true),
    insertion_order: IntegerSchema.default(100),
    case_sensitive: z.boolean().nullable().optional().default(null),
    use_regex: z.boolean().default(false),
    constant: z.boolean().nullable().optional().default(null),
    name: z.string().nullable().optional().default(null),
    priority: IntegerSchema.nullable().optional().default(null),
    id: z.union([IntegerSchema, z.string()]).nullable().optional().default(null),
    comment: z.string().nullable().optional().default(null),
    selective: z.boolean().nullable().optional().default(null),
    secondary_keys: z.array(z.string()).nullable().optional().default(null),
    position: z.enum(["before_char", "after_char"]).nullable().optional().default(null),
});
/**
 * 新统一格式 LorebookEntry（参考 worldBook.get 的友好结构）。
 */
export const LorebookEntrySchema = z.object({
    index: IntegerSchema,
    name: z.string(),
    content: z.string(),
    enabled: z.boolean().default(true),
    activationMode: z.enum(["always", "keyword", "vector"]).default("keyword"),
    key: z.array(z.string()).default([]),
    secondaryKey: z.array(z.string()).default([]),
    selectiveLogic: z.enum(["andAny", "andAll", "notAll", "notAny"]).default("andAny"),
    role: z.enum(["system", "user", "model"]).nullable().default(null),
    caseSensitive: z.boolean().nullable().default(null),
    excludeRecursion: z.boolean().default(false),
    preventRecursion: z.boolean().default(false),
    probability: z.number().default(100),
    position: z
        .enum([
        "beforeChar",
        "afterChar",
        "beforeEm",
        "afterEm",
        "beforeAn",
        "afterAn",
        "fixed",
        "outlet",
    ])
        .default("beforeChar"),
    order: IntegerSchema.default(100),
    depth: IntegerSchema.default(4),
    other: z.record(z.unknown()).default({}),
});
/**
 * 新统一格式世界书容器（字段名 world_hook）。
 */
export const WorldHookSchema = z.object({
    entries: z.array(LorebookEntrySchema).default([]),
    name: z.string().nullable().optional().default(null),
    description: z.string().nullable().optional().default(null),
    scan_depth: IntegerSchema.nullable().optional().default(null),
    token_budget: IntegerSchema.nullable().optional().default(null),
    recursive_scanning: z.boolean().nullable().optional().default(null),
    extensions: z.record(z.unknown()).default({}),
});
/**
 * Legacy Lorebook（用于 V2 数据源解析）。
 */
export const LegacyLorebookSchema = z.object({
    entries: z.array(LegacyLorebookEntrySchema).default([]),
    name: z.string().nullable().optional().default(null),
    description: z.string().nullable().optional().default(null),
    scan_depth: IntegerSchema.nullable().optional().default(null),
    token_budget: IntegerSchema.nullable().optional().default(null),
    recursive_scanning: z.boolean().nullable().optional().default(null),
    extensions: z.record(z.unknown()).default({}),
});
/**
 * Character Card V2 data（保留旧字段结构用于升级）。
 */
export const CharacterCardV2DataSchema = z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    creator: z.string(),
    character_version: z.string(),
    mes_example: z.string(),
    extensions: z.record(z.unknown()).default({}),
    system_prompt: z.string(),
    post_history_instructions: z.string(),
    first_mes: z.string(),
    alternate_greetings: z.array(z.string()).default([]),
    personality: z.string(),
    scenario: z.string(),
    creator_notes: z.string().default(""),
    character_book: LegacyLorebookSchema.nullable().optional().default(null),
});
/**
 * Character Card V3 data（新格式）
 * - world_hook 替代 character_book
 * - message = first_mes + alternate_greetings（合并）
 */
export const CharacterCardV3DataSchema = z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    creator: z.string(),
    character_version: z.string(),
    mes_example: z.string(),
    extensions: z.record(z.unknown()).default({}),
    system_prompt: z.string(),
    post_history_instructions: z.string(),
    message: z.array(z.string()).default([]),
    personality: z.string(),
    scenario: z.string(),
    creator_notes: z.string().default(""),
    world_hook: WorldHookSchema.nullable().optional().default(null),
    assets: z.array(AssetSchema).nullable().optional().default(null),
    nickname: z.string().nullable().optional().default(null),
    creator_notes_multilingual: z.record(z.string()).nullable().optional().default(null),
    source: z.array(z.string()).nullable().optional().default(null),
    group_only_greetings: z.array(z.string()).default([]),
    creation_date: IntegerSchema.nullable().optional().default(null),
    modification_date: IntegerSchema.nullable().optional().default(null),
});
/**
 * Character Card V2。
 */
export const CharacterCardV2Schema = z.object({
    spec: z.enum(["chara_card_v2"]).default("chara_card_v2"),
    spec_version: z.string().default("2.0"),
    data: CharacterCardV2DataSchema,
});
/**
 * Character Card V3。
 */
export const CharacterCardV3Schema = z.object({
    spec: z.enum(["chara_card_v3"]).default("chara_card_v3"),
    spec_version: z.string().default("3.0"),
    data: CharacterCardV3DataSchema,
});
