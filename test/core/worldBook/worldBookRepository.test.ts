import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  rebuildWorldBook,
  repositorizeWorldBookFromJson,
} from "../../../src/core/worldBook/worldBookRepository.js";

const tempDirs: string[] = [];
let originalCwd = process.cwd();

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ecc-world-book-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("standalone world-book repo/build", () => {
  it("应支持独立 world_book JSON 的层级导出与回建", async () => {
    const dir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(dir);

    const worldBookJson = {
      entries: {
        0: {
          uid: 0,
          comment: "Info",
          content: "entry-0",
          constant: true,
          order: 1,
          position: 0,
          key: ["alpha"],
          keysecondary: ["beta"],
          path_chain: "设定/组织",
          disable: false,
          selectiveLogic: 0,
        },
        1: {
          uid: 1,
          comment: "Rules",
          content: "entry-1",
          constant: true,
          order: 2,
          position: 0,
          key: [],
          keysecondary: [],
          path_chain: "设定",
          disable: false,
          selectiveLogic: 0,
        },
        2: {
          uid: 2,
          comment: "Root",
          content: "entry-2",
          constant: false,
          order: 3,
          position: 0,
          key: [],
          keysecondary: [],
          path_chain: "/",
          disable: false,
          selectiveLogic: 0,
        },
      },
      folder_paths: ["设定", "设定/空目录", "人物"],
      name: "WB-Sample",
    };

    await writeFile("world-book-input.json", `${JSON.stringify(worldBookJson, null, 2)}\n`, "utf-8");

    const repoPath = await repositorizeWorldBookFromJson("world-book-input.json", "wb_repo");
    expect(repoPath).toBe("wb_repo");

    expect(existsSync(path.join(repoPath, "_metadata.yaml"))).toBe(true);
    expect(existsSync(path.join(repoPath, "entries", "设定", "组织", "0_Info.yaml"))).toBe(true);
    expect(existsSync(path.join(repoPath, "entries", "设定", "组织", "0_Info.md"))).toBe(true);
    expect(existsSync(path.join(repoPath, "entries", "设定", "1_Rules.yaml"))).toBe(true);
    expect(existsSync(path.join(repoPath, "entries", "2_Root.yaml"))).toBe(true);
    expect(existsSync(path.join(repoPath, "entries", "设定", "空目录"))).toBe(true);

    const metadataText = await readFile(path.join(repoPath, "_metadata.yaml"), "utf-8");
    const metadata = YAML.parse(metadataText) as Record<string, unknown>;
    expect(metadata.folder_paths).toBeUndefined();

    const entryYamlText = await readFile(
      path.join(repoPath, "entries", "设定", "组织", "0_Info.yaml"),
      "utf-8",
    );
    expect(entryYamlText.includes("path_chain:")).toBe(false);

    const rebuilt = await rebuildWorldBook(repoPath);
    expect(rebuilt.entries.length).toBe(3);
    expect(rebuilt.entries.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(rebuilt.entries[0]?.key).toEqual(["alpha"]);
    expect(rebuilt.entries[0]?.secondaryKey).toEqual(["beta"]);
    expect(rebuilt.entries[0]?.path_chain).toBe("设定/组织");
    expect(rebuilt.entries[2]?.path_chain).toBe("");
    expect(rebuilt.folder_paths).toContain("设定/空目录");
    expect(rebuilt.folder_paths).toContain("人物");
    expect(rebuilt.folder_paths).toContain("设定/组织");
  });
});
