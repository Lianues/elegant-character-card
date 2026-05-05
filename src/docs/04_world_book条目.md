# 04 · `world_book/entries/*.yaml` 世界书条目

每个世界书条目对应酒馆 `data.character_book.entries[]` 中的一项，由两个文件组成：

```
world_book/entries/
  0_alice.yaml   ← 结构化字段
  0_alice.md     ← 条目正文（content）
```

也支持子目录组织（保留路径作为 `path_chain`）：

```
world_book/entries/
  设定/
    组织/
      7_城市.yaml
      7_城市.md
```

---

## 1. 字段总览（YAML 顶层）

字段顺序在 yaml 里**就按下表呈现**。

| 字段 | 类型 | 必填 | 取值 | 默认 | 含义 | 示例 |
|---|---|---|---|---|---|---|
| `index` | `int` | 是 | 任意整数 | 无 | 条目唯一编号（→ 酒馆 `id` / `uid`） | `7` |
| `name` | `string` | 是 | 任意字符串 | `""` | 条目标题（→ 酒馆 `comment`） | `"Alice"` |
| `enabled` | `boolean` | 是 | `true / false` | `true` | 是否启用 | `true` |
| `activationMode` | `string` | 是 | `keyword / always / vector` | `keyword` | 触发模式 | `"keyword"` |
| `key` | `string[]` | 是 | 字符串数组 | `[]` | 主关键词 | `["Alice", "alice"]` |
| `secondaryKey` | `string[]` | 是 | 字符串数组 | `[]` | 副关键词 | `[]` |
| `selectiveLogic` | `string` | 是 | `andAny / andAll / notAll / notAny` | `andAny` | 副关键词命中逻辑 | `"andAny"` |
| `role` | `string \| null` | 是 | `system / user / model / null` | `null` | **仅 `position=fixed` 时有效** | `null` |
| `caseSensitive` | `boolean \| null` | 是 | `true / false / null` | `null` | `null` 表示沿用全局设置 | `null` |
| `excludeRecursion` | `boolean` | 是 | `true / false` | `false` | 该条目不会被其他条目递归激活 | `true` |
| `preventRecursion` | `boolean` | 是 | `true / false` | `false` | 激活后不再触发其他条目 | `true` |
| `probability` | `number` | 是 | `0~100` | `100` | 命中概率 | `100` |
| `position` | `string` | 是 | 见 §3 | `beforeChar` | 提示注入位置 | `"beforeChar"` |
| `order` | `int` | 是 | 整数 | `100` | 同位置下排序（→ 酒馆 `insertion_order`） | `999` |
| `depth` | `int` | 是 | 整数 | `4` | 注入深度（仅 `position=fixed` 有意义） | `4` |
| `path_chain` | `string` | 自动 | `/` 分隔的路径 | `""` | 由 yaml 所在子目录自动推断，**通常不要手填** | `"设定/组织"` |
| `other` | `object` | 是 | 见 §5 | `{}` | 兜底字段（无 clean 字段对应的扩展） | 见示例 |

---

## 2. `content`（条目正文）放哪里

**不放在 yaml 里**，统一放在同名 `.md`：

```
0_alice.yaml   ← 上面那张表的字段
0_alice.md     ← 条目正文（角色描述、设定细节等）
```

`build` 时自动把 `.md` 内容读为字符串塞进 `content` 字段。

---

## 3. 枚举值速查

### 3.1 `activationMode`

| 值 | 含义 | 对应酒馆字段 |
|---|---|---|
| `keyword` | 关键词触发 | `constant: false`, `vectorized: false` |
| `always` | 常驻触发 | `constant: true` |
| `vector` | 向量触发 | `extensions.vectorized: true` |

### 3.2 `selectiveLogic`

| 值 | 含义 | 数字编码（酒馆 extensions） |
|---|---|---|
| `andAny` | 任一副关键词满足即可 | `0` |
| `notAll` | 不是"全部满足"（NOT-AND） | `1` |
| `notAny` | 所有副关键词都不满足 | `2` |
| `andAll` | 所有副关键词都要满足 | `3` |

### 3.3 `position`

| 值 | 含义 | 数字编码（原生格式） | `--character-book` 时顶层 `position`（V2 兼容） |
|---|---|---|---|
| `beforeChar` | 角色定义之前 | `0` | `before_char` |
| `afterChar` | 角色定义之后 | `1` | `after_char` |
| `beforeAn` | 作者注释之前 | `2` | `after_char` |
| `afterAn` | 作者注释之后 | `3` | `after_char` |
| `fixed` | 固定深度（at depth） | `4` | `after_char` |
| `beforeEm` | 示例消息之前 | `5` | `after_char` |
| `afterEm` | 示例消息之后 | `6` | `after_char` |
| `outlet` | Outlet 插槽 | `7` | `after_char` |

> **导出差异说明**：默认导出（SillyTavern 原生格式）直接使用上表的数字编码作为 `position` 字段值。`--character-book` 模式（V2 规范）下，顶层 `position` 字段**只允许 `before_char` / `after_char`**，更精细的位置通过 `extensions.position` 数字承载。两种格式本项目均自动处理，你只需在 YAML 里填语义化的字符串值即可。

### 3.4 `role`（仅 `position=fixed` 时）

| 值 | 含义 |
|---|---|
| `system` | 系统层 |
| `user` | 用户层 |
| `model` | 模型层 |
| `null` | 不指定 |

---

## 4. 完整可用示例

### 4.1 `7_alice.yaml`

```yaml
index: 0
name: Alice
enabled: true
activationMode: keyword
key:
  - Alice
  - alice
  - 示例角色
  - demo
secondaryKey: []
selectiveLogic: andAny
role: null
caseSensitive: null
excludeRecursion: true
preventRecursion: true
probability: 100
position: beforeChar
order: 999
depth: 4
other:
  use_regex: true
  selective: true
  name: null
  priority: null
  extensions:
    display_index: 0
    useProbability: true
    group: ""
    group_override: false
    group_weight: 100
    delay_until_recursion: false
    scan_depth: null
    match_whole_words: null
    use_group_scoring: false
    automation_id: ""
    sticky: 0
    cooldown: 0
    delay: 0
    match_persona_description: false
    match_character_description: false
    match_character_personality: false
    match_character_depth_prompt: false
    match_scenario: false
    match_creator_notes: false
```

### 4.2 `7_alice.md`

```markdown
（这里写条目正文，例如角色背景设定，会作为 content 字段嵌入）
姓名: Alice
年龄: 25 岁
身份: ...
```

---

## 5. `other` 字段详解

`other` 是兜底容器，分两块：

### 5.1 `other` 顶层字段（少量来自原 entry 顶层）

| 字段 | 类型 | 含义 |
|---|---|---|
| `use_regex` | `boolean` | 是否把关键词当正则匹配 |
| `selective` | `boolean \| null` | 是否启用副关键词机制 |
| `name` | `string \| null` | 兼容来源用的名称（与顶层 `name` 不同，通常为 null） |
| `priority` | `number \| null` | 兼容用 |

### 5.2 `other.extensions` —— 仅"无 clean 对应"的酒馆扩展字段

这里**不会重复存储**已被 clean 顶层字段表示的内容（如 `position / depth / probability / role / excludeRecursion / ...`）。只保留：

| 字段 | 类型 | 含义 | 默认 |
|---|---|---|---|
| `display_index` | `number` | UI 中显示的位置序号 | 自动 |
| `useProbability` | `boolean` | 是否启用 probability 字段 | `true` |
| `group` | `string` | 所属分组名 | `""` |
| `group_override` | `boolean` | 分组覆盖 | `false` |
| `group_weight` | `number` | 分组权重 | `100` |
| `delay_until_recursion` | `boolean` | 延迟到递归阶段才生效 | `false` |
| `scan_depth` | `number \| null` | 扫描深度（覆盖全局） | `null` |
| `match_whole_words` | `boolean \| null` | 整词匹配 | `null` |
| `use_group_scoring` | `boolean` | 启用分组评分 | `false` |
| `automation_id` | `string` | 自动化 ID | `""` |
| `sticky` | `number` | 粘滞回合数 | `0` |
| `cooldown` | `number` | 冷却回合数 | `0` |
| `delay` | `number` | 延迟回合数 | `0` |
| `match_persona_description` | `boolean` | 在 persona 描述里也扫描 | `false` |
| `match_character_description` | `boolean` | 在角色描述里也扫描 | `false` |
| `match_character_personality` | `boolean` | 在角色性格里也扫描 | `false` |
| `match_character_depth_prompt` | `boolean` | 在角色 depth_prompt 里也扫描 | `false` |
| `match_scenario` | `boolean` | 在 scenario 里也扫描 | `false` |
| `match_creator_notes` | `boolean` | 在 creator_notes 里也扫描 | `false` |
| `outlet_name` | `string` | Outlet 名称 | `""` |
| `triggers` | `array` | 触发器列表 | `[]` |
| `ignore_budget` | `boolean` | 忽略 token 预算 | `false` |

> 这些字段都是 SillyTavern 专属扩展，本项目不解释其语义，只做透传。如果你不知道某字段是什么，**保持默认值**就行。

---

## 6. `world_book/_metadata.yaml`（世界书自身的元数据）

```yaml
name: 示例世界书           # 世界书名称
entries: my_character\world_book\entries  # 路径标记，不要改
```

可选字段（默认 null，自动从 yaml 中省略；需要时手动加）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `description` | `string` | 世界书描述 |
| `scan_depth` | `number` | 扫描深度（覆盖全局） |
| `token_budget` | `number` | token 预算 |
| `recursive_scanning` | `boolean` | 是否递归扫描 |
| `extensions` | `object` | 其他系统字段 |

---

## 7. 推荐填写策略

| 场景 | 配置 |
|---|---|
| **常驻规则**（如世界观、群组规则） | `activationMode: always`，`position: beforeChar` |
| **角色档案条目** | `activationMode: keyword`，把人名/外号都加到 `key` |
| **高噪声条目**（容易误触发） | 降低 `probability`（如 `60~80`） |
| **强依赖顺序的内容** | 调小 `order`（更先注入） |
| **不希望连锁触发** | `preventRecursion: true` |
| **不希望被其他条目触发** | `excludeRecursion: true` |
| **at-depth 提示**（紧贴最新消息） | `position: fixed`，设 `depth` 与 `role` |
