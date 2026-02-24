import { describe, expect, it } from "vitest";

import {
  CharacterCardV2Schema,
  CharacterCardV3Schema,
} from "../../../src/core/models/cardSchemas.js";
import {
  parseCharacterCardV3,
  parseV3OrUpgradeFromV2,
  upgradeV2ToV3,
} from "../../../src/core/transforms/cardTransforms.js";

describe("Character card schema", () => {
  it("应能解析合法 V3 数据", () => {
    const card = parseCharacterCardV3({
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "Alice",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        message: ["hello"],
        personality: "kind",
        scenario: "city",
      },
    });

    expect(card.spec).toBe("chara_card_v3");
    expect(card.data.group_only_greetings).toEqual([]);
    expect(card.data.creator_notes).toBe("");
  });

  it("spec 不是 chara_card_v3 时应抛错", () => {
    expect(() =>
      CharacterCardV3Schema.parse({
        spec: "chara_card_v2",
        spec_version: "3.0",
        data: {
          name: "Alice",
          description: "desc",
          creator: "tester",
          character_version: "1.0",
          mes_example: "example",
          system_prompt: "system",
          post_history_instructions: "post",
          message: ["hello"],
          personality: "kind",
          scenario: "city",
        },
      }),
    ).toThrow();
  });

  it("应可将 V2 升级到 V3", () => {
    const cardV2 = CharacterCardV2Schema.parse({
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: "Eve",
        description: "desc",
        creator: "tester",
        character_version: "2.1",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        first_mes: "hello",
        personality: "calm",
        scenario: "forest",
        alternate_greetings: ["hi", "hey"],
      },
    });

    const cardV3 = upgradeV2ToV3(cardV2);

    expect(cardV3.spec).toBe("chara_card_v3");
    expect(cardV3.spec_version).toBe("3.0");
    expect(cardV3.data.name).toBe("Eve");
    expect(cardV3.data.group_only_greetings).toEqual([]);
    expect(cardV3.data.assets).toBeNull();
    expect(cardV3.data.message).toEqual(["hello", "hi", "hey"]);
  });

  it("parseV3OrUpgradeFromV2: V3 输入 upgradedFromV2 应为 false", () => {
    const result = parseV3OrUpgradeFromV2({
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "V3",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        message: ["hello"],
        personality: "kind",
        scenario: "city",
      },
    });

    expect(result.upgradedFromV2).toBe(false);
    expect(result.card.spec).toBe("chara_card_v3");
  });

  it("parseV3OrUpgradeFromV2: V2 输入 upgradedFromV2 应为 true", () => {
    const result = parseV3OrUpgradeFromV2({
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: "V2",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        first_mes: "hello",
        alternate_greetings: [],
        personality: "kind",
        scenario: "city",
      },
    });

    expect(result.upgradedFromV2).toBe(true);
    expect(result.card.spec).toBe("chara_card_v3");
  });
});
