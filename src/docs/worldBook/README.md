# 独立世界书仓库 — YAML 规范索引

本目录包含创建/编辑**独立世界书仓库**（`ecc world-book init` 或 `ecc world-book repo` 生成的目录）时所有 YAML 文件的字段规范。

执行 `world-book init` / `world-book repo` 命令后，本套文档会被自动复制到 `<你的世界书仓库>/docs/`。

## 文档列表

| 文件 | 适用范围 |
|---|---|
| [`01_世界书仓库结构总览.md`](./01_世界书仓库结构总览.md) | 整个独立世界书仓库的目录结构、`_metadata.yaml`、与角色卡仓库内置 `world_book/` 的关系 |
| [`02_world_book条目.md`](./02_world_book条目.md) | `entries/*.yaml` 每个世界书条目的所有字段（与角色卡仓库内的世界书条目完全通用） |

> **复用说明**：`02_world_book条目.md` 与角色卡仓库 `docs/04_world_book条目.md` 是同一份内容（运行时由 CLI 同步复制）。条目结构在两种语境下完全一致，因此规范统一。

## 设计原则（重要）

1. **字段去冗余**：YAML 中只保留"原版酒馆世界书里真实存在的字段"。schema 里给可选字段填的 `null` 默认值（`description / scan_depth / ...`）都不会出现在 YAML。
2. **clean 字段是单一真理来源**：每个条目的 clean 字段（`position / depth / role / probability / excludeRecursion / ...`）是唯一可编辑入口，导出时自动反向生成酒馆 legacy 字段。
3. **`other.extensions` 只存"无 clean 对应的"扩展字段**：例如 `display_index / sticky / cooldown / group_* / match_*`，避免与 clean 字段双份存储。
4. **导出格式与酒馆原生 world_book.json 对齐**：字段顺序、命名、缩进与 SillyTavern 直接导出的世界书 JSON 一致。
