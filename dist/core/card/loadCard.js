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
    const payload = parseJson(text, jsonPath);
    const { card, upgradedFromV2 } = parseV3OrUpgradeFromV2(payload);
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
