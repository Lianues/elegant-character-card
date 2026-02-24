import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config/loadConfig.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "card-forge-config-"));
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

describe("loadConfig", () => {
  it("配置文件不存在时，应返回默认配置", async () => {
    const config = await loadConfig("not-exists.yaml");

    expect(config.repositorize.fields.description.filename).toBe("description.md");
    expect(config.repositorize.fields.tags.enabled).toBe(false);
  });

  it("应能覆盖 repositorize.fields 的字段配置", async () => {
    const dir = await createTempDir();
    const configPath = path.join(dir, "custom.yaml");

    await writeFile(
      configPath,
      [
        "repositorize:",
        "  fields:",
        "    description:",
        "      enabled: true",
        "      type: string",
        "      filename: desc_custom.md",
      ].join("\n"),
      "utf-8",
    );

    const config = await loadConfig(configPath);

    expect(config.repositorize.fields.description.filename).toBe("desc_custom.md");
    expect(config.repositorize.fields.personality.filename).toBe("personality.md");
  });
});
