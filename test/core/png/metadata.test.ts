import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import extractChunks from "png-chunks-extract";
import encodeChunks from "png-chunks-encode";
import * as textChunk from "png-chunk-text";

import {
  embedCardMetadata,
  extractCardMetadata,
  readPngTextChunks,
} from "../../../src/core/png/metadata.js";

const BASE_PNG = resolve(process.cwd(), "character.png");
const createdDirs: string[] = [];

async function createTempPath(filename: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "card-forge-ts-"));
  createdDirs.push(dir);
  return join(dir, filename);
}

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("PNG card metadata", () => {
  it("应能写入并读回 ccv3 元数据", async () => {
    const output = await createTempPath("card-ccv3.png");
    const sourceJson = JSON.stringify({ spec: "chara_card_v3", data: { name: "Alice" } });

    await embedCardMetadata(sourceJson, BASE_PNG, output, false);
    const extracted = await extractCardMetadata(output);

    expect(extracted).toBe(sourceJson);

    const allTextChunks = await readPngTextChunks(output);
    expect(allTextChunks.some((item) => item.keyword === "ccv3")).toBe(true);
    expect(allTextChunks.some((item) => item.keyword === "chara")).toBe(false);
  });

  it("legacy=true 时应同时写入 chara", async () => {
    const output = await createTempPath("card-legacy.png");
    const sourceJson = JSON.stringify({ spec: "chara_card_v3", data: { name: "Legacy" } });

    await embedCardMetadata(sourceJson, BASE_PNG, output, true);

    const allTextChunks = await readPngTextChunks(output);
    expect(allTextChunks.some((item) => item.keyword === "ccv3")).toBe(true);
    expect(allTextChunks.some((item) => item.keyword === "chara")).toBe(true);
  });

  it("当 ccv3 缺失时，应回退读取 chara", async () => {
    const output = await createTempPath("card-fallback.png");
    const sourceJson = JSON.stringify({ spec: "chara_card_v3", data: { name: "Fallback" } });

    await embedCardMetadata(sourceJson, BASE_PNG, output, true);

    const pngBuffer = await readFile(output);
    const chunks = extractChunks(new Uint8Array(pngBuffer));

    const cleaned = chunks.filter((chunk) => {
      if (chunk.name !== "tEXt") {
        return true;
      }

      const decoded = textChunk.decode(chunk.data);
      return decoded.keyword !== "ccv3";
    });

    await writeFile(output, Buffer.from(encodeChunks(cleaned)));

    const extracted = await extractCardMetadata(output);
    expect(extracted).toBe(sourceJson);
  });
});
