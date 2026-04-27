import type { AppConfig } from "../core/config/types.js";

export const DEFAULT_CONFIG: AppConfig = {
  repositorize: {
    enabled: true,
    type: "nested",
    fields: {
      description: {
        enabled: true,
        type: "string",
        filename: "description.md",
      },
      personality: {
        enabled: true,
        type: "string",
        filename: "personality.md",
      },
      scenario: {
        enabled: true,
        type: "string",
        filename: "scenario.md",
      },
      system_prompt: {
        enabled: true,
        type: "string",
        filename: "system_prompt.md",
      },
      post_history_instructions: {
        enabled: true,
        type: "string",
        filename: "post_history_instructions.md",
      },
      mes_example: {
        enabled: true,
        type: "string",
        filename: "example_messages.md",
      },
      creator_notes: {
        enabled: true,
        type: "string",
        filename: "creator_notes.md",
      },
      message: {
        enabled: true,
        type: "array",
        file_pattern: "{idx}.md",
        value_type: "string",
      },
      group_only_greetings: {
        enabled: true,
        type: "array",
        file_pattern: "{idx}.md",
        value_type: "string",
      },
      tags: {
        enabled: false,
        type: "array",
        value_type: "string",
      },
      source: {
        enabled: false,
        type: "array",
        value_type: "string",
      },
      assets: {
        enabled: true,
        type: "array",
        file_pattern: "{name}_{type}.yaml",
        value_type: "dict",
      },
      creator_notes_multilingual: {
        enabled: true,
        type: "dict",
        file_pattern: "{key}.md",
        value_type: "string",
      },
      extensions: {
        enabled: true,
        type: "nested",
        fields: {
          TavernHelper_scripts: {
            enabled: true,
            type: "array",
            file_pattern: "{idx}_{value.name}.yaml",
            value_type: "dict",
          },
          regex_scripts: {
            enabled: true,
            type: "array",
            // clean 格式字段名是 name，不是 scriptName。
            // 旧配置会因取不到 scriptName 而回退成 1.yaml / 2.yaml / 10.yaml，
            // 进而在重建时产生顺序错乱。
            file_pattern: "{idx}_{name}.yaml",
            value_type: "dict",
          },
        },
      },
      world_book: {
        enabled: true,
        type: "nested",
        fields: {
          entries: {
            enabled: true,
            type: "array",
            file_pattern: "{index}_{name}.yaml",
            split_content_to_md: true,
            value_type: "dict",
          },
        },
      },
    },
  },
};
