# 角色卡仓库 — YAML 规范索引

本目录包含创建/编辑"角色卡仓库"时所有 YAML 文件的字段规范。
当你执行 `repo` 命令把一张角色卡拆分到目录后，本套文档会被自动复制到 `<你的仓库>/docs/`。

## 文档列表

| 文件 | 适用范围 |
|---|---|
| [`01_仓库结构总览.md`](./01_仓库结构总览.md) | 整个仓库的目录结构、主 `_metadata.yaml`、`image_path` 默认底图机制 |
| [`02_extensions目录.md`](./02_extensions目录.md) | `extensions/_metadata.yaml`（角色级 SillyTavern 扩展字段，如 `talkativeness/fav/depth_prompt`） |
| [`03_message目录.md`](./03_message目录.md) | `message/*.md`（开场白与备选问候）的命名与排序规则 |
| [`04_world_book条目.md`](./04_world_book条目.md) | `world_book/entries/*.yaml` 每个世界书条目的所有字段 |

## 设计原则（重要）

1. **字段去冗余**：YAML 中只保留"原版酒馆角色卡里真实存在的字段"。所有 V3 schema 给可选字段填的 `null` 默认值（`nickname / source / creation_date / ...`）都不会出现在 YAML。
2. **clean 字段是单一真理来源**：每个世界书条目的 clean 字段（`position / depth / role / probability / excludeRecursion / ...`）是唯一可编辑入口，导出时自动反向生成酒馆 legacy 字段。
3. **`other.extensions` 只存"无 clean 对应的"扩展字段**：例如 `display_index / sticky / cooldown / group_* / match_*`，避免与 clean 字段双份存储。
4. **`build` 默认输出 SillyTavern 兼容格式**：字段顺序、命名、4 空格缩进与酒馆原生导出逐行对齐。如需输出本项目内部 V3，加 `--internal`。
