import { z } from "zod";
import { normalizeLegacyBookInPayload } from "../book/bookFormat.js";
import { CharacterCardV2Schema, CharacterCardV3Schema, } from "../models/cardSchemas.js";
/**
 * 严格按 V3（新格式）解析角色卡。
 */
export function parseCharacterCardV3(input) {
    return CharacterCardV3Schema.parse(input);
}
/**
 * 将 V2 角色卡升级为 V3（book 条目同步迁移为新格式）。
 */
export function upgradeV2ToV3(cardV2) {
    const payload = {
        data: cardV2.data,
    };
    const normalized = normalizeLegacyBookInPayload(payload);
    return CharacterCardV3Schema.parse({
        data: normalized.data,
    });
}
/**
 * 先按 V3（新格式）解析；失败后按 V2 解析并升级为 V3。
 */
export function parseV3OrUpgradeFromV2(input) {
    try {
        return {
            card: CharacterCardV3Schema.parse(input),
            upgradedFromV2: false,
        };
    }
    catch (v3Error) {
        try {
            const cardV2 = CharacterCardV2Schema.parse(input);
            return {
                card: upgradeV2ToV3(cardV2),
                upgradedFromV2: true,
            };
        }
        catch (v2Error) {
            const issues = [
                ...(v3Error instanceof z.ZodError ? v3Error.issues : []),
                ...(v2Error instanceof z.ZodError ? v2Error.issues : []),
            ];
            throw new z.ZodError(issues);
        }
    }
}
