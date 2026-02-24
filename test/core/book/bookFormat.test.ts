import { describe, expect, it } from "vitest";

import { CharacterCardV3Schema } from "../../../src/core/models/cardSchemas.js";
import {
  formatBookForReadableOutput,
  normalizeLegacyBookInPayload,
} from "../../../src/core/book/bookFormat.js";

describe("book format normalize", () => {
  it("应将旧酒馆字段迁移到新字段（character_book->world_hook, alternate_greetings->message）", () => {
    const legacyPayload = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "book-card",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        first_mes: "hello",
        alternate_greetings: ["a", "b"],
        personality: "kind",
        scenario: "city",
        character_book: {
          entries: [
            {
              keys: ["kw1"],
              content: "entry-content",
              enabled: true,
              insertion_order: 10,
              id: 3,
              comment: "城市",
              secondary_keys: ["s1"],
              extensions: {
                position: 0,
                selectiveLogic: 3,
                role: 0,
                depth: 6,
                probability: 88,
                exclude_recursion: true,
                prevent_recursion: false,
              },
            },
          ],
        },
      },
    };

    const normalized = normalizeLegacyBookInPayload(legacyPayload) as any;

    expect(normalized.data.message).toEqual(["hello", "a", "b"]);
    expect(normalized.data.alternate_greetings).toBeUndefined();
    expect(normalized.data.character_book).toBeUndefined();
    expect(normalized.data.first_mes).toBeUndefined();

    const entry = normalized.data.world_hook.entries[0];
    expect(entry.index).toBe(3);
    expect(entry.name).toBe("城市");
    expect(entry.key).toEqual(["kw1"]);
    expect(entry.secondaryKey).toEqual(["s1"]);
    expect(entry.position).toBe("beforeChar");
    expect(entry.selectiveLogic).toBe("andAll");
    expect(entry.depth).toBe(6);
  });

  it("新格式条目应可直接通过 CharacterCardV3Schema 校验", () => {
    const cleanPayload = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "book-card",
        description: "desc",
        creator: "tester",
        character_version: "1.0",
        mes_example: "example",
        system_prompt: "system",
        post_history_instructions: "post",
        message: ["m1", "m2"],
        personality: "kind",
        scenario: "city",
        world_hook: {
          entries: [
            {
              index: 2,
              name: "设定A",
              content: "abc",
              enabled: true,
              activationMode: "keyword",
              key: ["k1"],
              secondaryKey: ["k2"],
              selectiveLogic: "andAny",
              role: null,
              caseSensitive: null,
              excludeRecursion: false,
              preventRecursion: true,
              probability: 100,
              position: "beforeChar",
              order: 7,
              depth: 4,
              other: {
                use_regex: true,
                selective: true,
                extensions: {
                  vectorized: false,
                },
              },
            },
          ],
        },
      },
    };

    const formatted = formatBookForReadableOutput(cleanPayload);
    const parsed = CharacterCardV3Schema.parse(formatted);

    const entry = parsed.data.world_hook?.entries[0];
    expect(entry?.index).toBe(2);
    expect(entry?.name).toBe("设定A");
    expect(entry?.key).toEqual(["k1"]);
    expect(entry?.secondaryKey).toEqual(["k2"]);
    expect(entry?.order).toBe(7);
    expect(parsed.data.message).toEqual(["m1", "m2"]);
  });
});
