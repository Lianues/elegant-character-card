import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import { CharacterCardV3Schema } from "../../../src/core/models/cardSchemas.js";
import { rebuildCard } from "../../../src/core/repository/rebuild.js";
import { repositorize } from "../../../src/core/repository/repositorize.js";

const tempDirs: string[] = [];
let originalCwd = process.cwd();

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "card-forge-repo-"));
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

describe("repositorize + rebuildCard", () => {
  it("应支持配置驱动拆分并可回建为等价 V3 数据", async () => {
    const card = CharacterCardV3Schema.parse({
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "测试角色/1",
        description: "角色描述",
        creator: "tester",
        character_version: "1.2.3",
        mes_example: "示例消息",
        system_prompt: "系统提示",
        post_history_instructions: "后置指令",
        personality: "冷静",
        scenario: "未来都市",
        creator_notes: "创作备注",
        message: [
          "你好",
          "你好 1",
          "你好 2",
          "你好 3",
          "你好 4",
          "你好 5",
          "你好 6",
          "你好 7",
          "你好 8",
          "你好 9",
          "你好 10",
          "你好 11",
          "你好 12",
        ],
        group_only_greetings: ["群聊你好"],
        tags: ["tag1", "tag2"],
        source: ["https://example.com"],
        assets: [
          {
            type: "icon",
            uri: "ccdefault:",
            name: "main",
            ext: "png",
          },
        ],
        creator_notes_multilingual: {
          en: "note",
          zh: "备注",
        },
        extensions: {
          TavernHelper_scripts: [
            {
              name: "script-one",
              enabled: true,
            },
          ],
          regex_scripts: [
            {
              scriptName: "regex-one",
              pattern: "test",
            },
          ],
        },
        world_hook: {
          name: "Lorebook",
          entries: [
            {
              index: 7,
              name: "city",
              content: "设定条目",
              enabled: true,
              activationMode: "keyword",
              key: ["城市"],
              secondaryKey: [],
              selectiveLogic: "andAny",
              role: null,
              caseSensitive: null,
              excludeRecursion: false,
              preventRecursion: false,
              probability: 100,
              position: "beforeChar",
              order: 1,
              depth: 4,
              other: {},
            },
          ],
        },
      },
    });

    const dir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(dir);

    const repoPath = await repositorize(card);

    expect(repoPath).toBe("测试角色_1");
    expect(existsSync(path.join(repoPath, "_metadata.yaml"))).toBe(true);
    expect(existsSync(path.join(repoPath, "description.md"))).toBe(true);
    expect(existsSync(path.join(repoPath, "message", "0.md"))).toBe(true);
    expect(existsSync(path.join(repoPath, "message", "10.md"))).toBe(true);
    expect(existsSync(path.join(repoPath, "group_only_greetings", "1.md"))).toBe(true);
    expect(existsSync(path.join(repoPath, "assets", "main_icon.yaml"))).toBe(true);

    const regexScripts = await readdir(
      path.join(repoPath, "extensions", "regex_scripts"),
    );
    expect(regexScripts.some((name) => name.endsWith("_regex-one.yaml"))).toBe(true);
    expect(
      existsSync(path.join(repoPath, "world_hook", "entries", "7_city.yaml")),
    ).toBe(true);
    expect(
      existsSync(path.join(repoPath, "world_hook", "entries", "7_city.md")),
    ).toBe(true);

    const entryYaml = await readFile(
      path.join(repoPath, "world_hook", "entries", "7_city.yaml"),
      "utf-8",
    );
    const entryObject = YAML.parse(entryYaml) as Record<string, unknown>;
    expect("content" in entryObject).toBe(false);


    const rebuilt = await rebuildCard(repoPath);

    expect(rebuilt).toEqual(card);
  });
});
