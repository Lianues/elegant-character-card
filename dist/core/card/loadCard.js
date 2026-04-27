import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeLegacyBookInPayload } from "../book/bookFormat.js";
import { extractCardMetadata } from "../png/metadata.js";
import { parseV3OrUpgradeFromV2 } from "../transforms/cardTransforms.js";
function parseJson(text, context) {
    try {
        return JSON.parse(text);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${context} 不是有效 JSON：${message}`);
    }
}
export async function loadCardFromPng(imagePath) {
    if (!existsSync(imagePath)) {
        throw new Error(`输入文件不存在: ${imagePath}`);
    }
    const metadata = await extractCardMetadata(imagePath);
    if (!metadata) {
        throw new Error(`PNG 中未找到角色卡元数据: ${imagePath}`);
    }
    const rawPayload = parseJson(metadata, imagePath);
    const normalizedPayload = normalizeLegacyBookInPayload(rawPayload);
    const { card, upgradedFromV2 } = parseV3OrUpgradeFromV2(normalizedPayload);
    return {
        card,
        upgradedFromV2,
        source: "png",
    };
}
export async function loadCardFromJson(jsonPath) {
    if (!existsSync(jsonPath)) {
        throw new Error(`输入文件不存在: ${jsonPath}`);
    }
    const text = await readFile(jsonPath, "utf-8");
    const rawPayload = parseJson(text, jsonPath);
    // 与 loadCardFromPng 保持一致：先把旧字段名（character_book / first_mes /
    // alternate_greetings）归一化到 V3 字段，再交给 schema 解析。否则
    // spec=chara_card_v3 但 data 仍用旧字段名时，V3 解析会"成功"但静默丢弃数据。
    const normalizedPayload = normalizeLegacyBookInPayload(rawPayload);
    const { card, upgradedFromV2 } = parseV3OrUpgradeFromV2(normalizedPayload);
    return {
        card,
        upgradedFromV2,
        source: "json",
    };
}
export async function loadCardFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") {
        return loadCardFromPng(filePath);
    }
    if (ext === ".json") {
        return loadCardFromJson(filePath);
    }
    throw new Error("输入必须是 PNG 或 JSON 文件");
}
