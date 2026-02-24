import { readFile, writeFile } from "node:fs/promises";
import extractChunks from "png-chunks-extract";
import encodeChunks from "png-chunks-encode";
import * as textChunk from "png-chunk-text";
const CARD_METADATA_PRIMARY_KEY = "ccv3";
const CARD_METADATA_LEGACY_KEY = "chara";
function encodeMetadataToBase64(metadata) {
    return Buffer.from(metadata, "utf-8").toString("base64");
}
function decodeMetadataFromBase64(encoded) {
    return Buffer.from(encoded, "base64").toString("utf-8");
}
function withoutCardMetadataChunks(chunks) {
    return chunks.filter((chunk) => {
        if (chunk.name !== "tEXt") {
            return true;
        }
        try {
            const { keyword } = textChunk.decode(chunk.data);
            return keyword !== CARD_METADATA_PRIMARY_KEY && keyword !== CARD_METADATA_LEGACY_KEY;
        }
        catch {
            return true;
        }
    });
}
function insertBeforeIend(chunks, extraChunks) {
    const cloned = [...chunks];
    const iendIndex = cloned.findIndex((chunk) => chunk.name === "IEND");
    if (iendIndex < 0) {
        throw new Error("无效 PNG：缺少 IEND chunk");
    }
    cloned.splice(iendIndex, 0, ...extraChunks);
    return cloned;
}
/**
 * 读取 PNG 中所有 tEXt chunk。
 */
export async function readPngTextChunks(imagePath) {
    const pngBuffer = await readFile(imagePath);
    const chunks = extractChunks(new Uint8Array(pngBuffer));
    return chunks
        .filter((chunk) => chunk.name === "tEXt")
        .map((chunk) => textChunk.decode(chunk.data));
}
/**
 * 将角色卡 JSON 文本写入 PNG 的 ccv3/chara 文本块。
 */
export async function embedCardMetadata(metadata, imagePath, outputPath, legacy = false) {
    const pngBuffer = await readFile(imagePath);
    const chunks = extractChunks(new Uint8Array(pngBuffer));
    const cleanedChunks = withoutCardMetadataChunks(chunks);
    const encodedMetadata = encodeMetadataToBase64(metadata);
    const newTextChunks = [
        textChunk.encode(CARD_METADATA_PRIMARY_KEY, encodedMetadata),
    ];
    if (legacy) {
        newTextChunks.push(textChunk.encode(CARD_METADATA_LEGACY_KEY, encodedMetadata));
    }
    const mergedChunks = insertBeforeIend(cleanedChunks, newTextChunks);
    const nextPngBuffer = Buffer.from(encodeChunks(mergedChunks));
    await writeFile(outputPath, nextPngBuffer);
}
/**
 * 从 PNG 中提取角色卡 JSON 文本（优先 ccv3，其次 chara）。
 */
export async function extractCardMetadata(imagePath) {
    const textChunks = await readPngTextChunks(imagePath);
    const primaryChunk = textChunks.find((chunk) => chunk.keyword === CARD_METADATA_PRIMARY_KEY);
    if (primaryChunk) {
        return decodeMetadataFromBase64(primaryChunk.text);
    }
    const legacyChunk = textChunks.find((chunk) => chunk.keyword === CARD_METADATA_LEGACY_KEY);
    if (legacyChunk) {
        return decodeMetadataFromBase64(legacyChunk.text);
    }
    return null;
}
