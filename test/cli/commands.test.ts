import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runBuildCommand } from "../../src/cli/commands/build.js";
import { runExtractCommand } from "../../src/cli/commands/extract.js";
import { runInfoCommand } from "../../src/cli/commands/info.js";
import { runInitConfigCommand } from "../../src/cli/commands/initConfig.js";
import { runRepoCommand } from "../../src/cli/commands/repo.js";
import { runValidateCommand } from "../../src/cli/commands/validate.js";

const tempDirs: string[] = [];
const basePng = path.resolve(process.cwd(), "character.png");

function createSampleCardJson(): string {
  return JSON.stringify(
    {
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "CLI 测试角色",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        personality: "kind",
        scenario: "city",
        creator_notes: "notes",
        message: ["hello", "a", "b"],
        group_only_greetings: ["g1"],
      },
    },
    null,
    2,
  );
}

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "card-forge-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("CLI command runners", () => {
  it("应能走通 repo -> build(json/png) -> validate/info -> extract 链路", async () => {
    const dir = await createTempDir();
    const oldCwd = process.cwd();

    try {
      process.chdir(dir);

      const inputJson = "input.json";
      await writeFile(inputJson, `${createSampleCardJson()}\n`, "utf-8");

      await runRepoCommand(inputJson, {});
      expect(existsSync(path.join("CLI 测试角色", "_metadata.yaml"))).toBe(true);

      await runBuildCommand("CLI 测试角色", { format: "json" });
      expect(existsSync("CLI 测试角色_rebuilt.json")).toBe(true);

      const baseImage = "character.png";
      const pngBuffer = await readFile(basePng);
      await writeFile(baseImage, pngBuffer);

      await runBuildCommand("CLI 测试角色", {
        format: "png",
        output: "rebuilt_cli",
        baseImage,
        legacy: true,
      });
      expect(existsSync("rebuilt_cli.png")).toBe(true);

      await runValidateCommand("rebuilt_cli.png");
      await runInfoCommand("rebuilt_cli.png");

      await runExtractCommand("rebuilt_cli.png", { output: "extracted.json" });
      expect(existsSync("extracted.json")).toBe(true);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it("应能生成默认配置文件", async () => {
    const dir = await createTempDir();
    const oldCwd = process.cwd();

    try {
      process.chdir(dir);

      await runInitConfigCommand({ output: "config.generated.yaml" });
      expect(existsSync("config.generated.yaml")).toBe(true);
    } finally {
      process.chdir(oldCwd);
    }
  });
});
