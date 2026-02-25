# 世界书字段说明（优美角色卡统一格式）

> 适用范围：`角色目录/world_book/entries/*.yaml`（以及同名 `.md`）
>
> 说明：本项目已统一为**新格式**（参考 `st-api-wrapper` 的 `worldBook.get` 友好结构）。
> 旧酒馆字段（如 `keys/comment/insertion_order`）不再作为主格式写出。
> 同时角色卡字段已统一：`character_book -> world_book`，`alternate_greetings -> message`。

---

## 1. 文件组织规则

每个世界书条目由两部分组成：

- `entries/{path_chain}/{index}_{name}.yaml`：结构化字段
- `entries/{path_chain}/{index}_{name}.md`：条目正文（原 content）

例如：

- `设定/组织/7_city.yaml`
- `设定/组织/7_city.md`

> 注意：`yaml` 中**不再保存** `content` 字段，正文统一放在同名 `.md`。

---

## 2. Entry 字段总览（YAML）

| 字段 | 中文名称 | 类型 | 必填 | 可填项 / 取值 | 默认值 | 含义 | 示例 |
|---|---|---|---|---|---|---|---|
| `index` | 条目索引 | `number`(int) | 是 | 任意非 NaN 整数 | 无 | 条目唯一编号（原 uid/id） | `7` |
| `name` | 条目名称 | `string` | 是 | 任意字符串 | `""` | 条目标题（原 comment） | `"世界地图总览"` |
| `enabled` | 是否启用 | `boolean` | 是 | `true` / `false` | `true` | 是否参与触发 | `true` |
| `activationMode` | 触发模式 | `string` | 是 | `keyword` / `always` / `vector` | `keyword` | 关键词触发 / 常驻触发 / 向量触发 | `"always"` |
| `key` | 主关键词 | `string[]` | 是 | 字符串数组 | `[]` | 主触发关键词列表 | `["王都", "教会"]` |
| `secondaryKey` | 副关键词 | `string[]` | 是 | 字符串数组 | `[]` | 与 selectiveLogic 配合使用 | `["夜晚", "贵族区"]` |
| `selectiveLogic` | 副关键词逻辑 | `string` | 是 | `andAny` / `andAll` / `notAll` / `notAny` | `andAny` | 副关键词命中逻辑 | `"andAny"` |
| `role` | 固定深度角色 | `string \| null` | 是 | `system` / `user` / `model` / `null` | `null` | 仅在 `position=fixed` 时有意义 | `null` |
| `caseSensitive` | 大小写敏感 | `boolean \| null` | 是 | `true` / `false` / `null` | `null` | `null` 表示沿用全局设置 | `null` |
| `excludeRecursion` | 禁止被递归触发 | `boolean` | 是 | `true` / `false` | `false` | 该条目不会被其他条目递归激活 | `true` |
| `preventRecursion` | 阻断后续递归 | `boolean` | 是 | `true` / `false` | `false` | 该条目激活后不再触发其他条目 | `true` |
| `probability` | 触发概率 | `number` | 是 | `0~100`（建议） | `100` | 命中概率 | `100` |
| `position` | 插入位置 | `string` | 是 | `beforeChar` / `afterChar` / `beforeEm` / `afterEm` / `beforeAn` / `afterAn` / `fixed` / `outlet` | `beforeChar` | 提示注入位置 | `"beforeChar"` |
| `order` | 插入顺序 | `number`(int) | 是 | 整数 | `100` | 同位置下排序 | `52` |
| `depth` | 固定深度 | `number`(int) | 是 | 整数 | `4` | 通常用于 `fixed` 位置 | `4` |
| `path_chain` | 条目路径 | `string` | 是 | 路径字符串（`/` 分隔） | `""` | 条目所在目录链 | `"设定/组织"` |
| `other` | 其他扩展信息 | `object` | 是 | 任意对象 | `{}` | 兜底保留字段 | 见下文 |

---

## 3. 枚举值说明

### 3.1 `activationMode`

| 值 | 中文 | 说明 |
|---|---|---|
| `keyword` | 关键词触发 | 常规模式，通过 `key/secondaryKey` 判断 |
| `always` | 常驻触发 | 总是注入 |
| `vector` | 向量触发 | 依赖向量索引（高级模式） |

### 3.2 `selectiveLogic`

| 值 | 中文 | 逻辑 |
|---|---|---|
| `andAny` | 任一满足 | 任意一个副关键词满足即可 |
| `andAll` | 全部满足 | 所有副关键词都要满足 |
| `notAll` | 非全满足 | 不是“全部满足” |
| `notAny` | 全不满足 | 所有副关键词都不满足 |

### 3.3 `position`

| 值 | 中文 |
|---|---|
| `beforeChar` | 角色定义之前 |
| `afterChar` | 角色定义之后 |
| `beforeEm` | 示例消息之前 |
| `afterEm` | 示例消息之后 |
| `beforeAn` | 作者注释之前 |
| `afterAn` | 作者注释之后 |
| `fixed` | 固定深度 |
| `outlet` | Outlet 插槽 |

### 3.4 `role`（仅 `position=fixed` 时）

| 值 | 中文 |
|---|---|
| `system` | 系统层 |
| `user` | 用户层 |
| `model` | 模型层 |
| `null` | 不指定 |

---

## 4. `other` 常用字段（建议保留）

`other` 用来承载非核心字段，推荐至少保留以下信息：

| 字段 | 类型 | 含义 | 示例 |
|---|---|---|---|
| `use_regex` | `boolean` | 是否把关键词当正则 | `true` |
| `selective` | `boolean \| null` | 是否启用副关键词机制 | `true` |
| `name` | `string \| null` | 兼容来源名 | `null` |
| `priority` | `number \| null` | 兼容优先级 | `null` |
| `position_raw` | `string \| null` | 原始位置值（兼容追踪） | `"before_char"` |
| `extensions` | `object` | 原始扩展字段快照 | `{ ... }` |

---

## 5. 最小可用示例

### 5.1 `7_city.yaml`

```yaml
index: 7
name: city
enabled: true
activationMode: keyword
key:
  - 城市
secondaryKey: []
selectiveLogic: andAny
role: null
caseSensitive: null
excludeRecursion: false
preventRecursion: false
probability: 100
position: beforeChar
order: 1
depth: 4
path_chain: 设定/组织
other:
  use_regex: false
  selective: null
  name: null
  priority: null
  position_raw: before_char
  extensions: {}
```

### 5.2 `7_city.md`

```md
这里是城市背景设定正文（即条目 content）。
```

---

## 6. Book 容器字段（`world_book`）

除了 `entries` 外，`world_book` 本身还可包含：

| 字段 | 中文名称 | 类型 | 说明 |
|---|---|---|---|
| `name` | 书名 | `string \| null` | 世界书名称 |
| `folder_paths` | 文件夹路径列表 | `string[]` | 允许空文件夹写入（如 `"设定/空目录"`） |
| `description` | 说明 | `string \| null` | 世界书描述 |
| `scan_depth` | 扫描深度 | `number \| null` | 最近消息扫描深度 |
| `token_budget` | token 预算 | `number \| null` | 预算限制 |
| `recursive_scanning` | 递归扫描 | `boolean \| null` | 是否递归扫描 |
| `extensions` | 扩展信息 | `object` | 其他系统字段 |

---

## 7. 推荐填写策略（实践）

- **剧情常驻规则**：`activationMode=always`，`position=beforeChar`
- **知识词条**：`activationMode=keyword`，在 `key` 放触发词
- **高噪声条目**：降低 `probability`（如 `60~80`）
- **强依赖顺序内容**：调小 `order`（更先注入）
- **希望不连锁触发**：`preventRecursion=true`

---

如果你需要，我可以再给你补一版「字段模板生成器」：输入旧条目，自动输出标准化 yaml+md 草稿。