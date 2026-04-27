# 03 · `message/` 与 `group_only_greetings/` 目录

## 1. 这两个目录是什么

| 目录 | 对应酒馆字段 | 用途 |
|---|---|---|
| `message/` | `data.first_mes` + `data.alternate_greetings` | 角色开场白 + 备选问候 |
| `group_only_greetings/` | `data.group_only_greetings` | 仅在群聊场景使用的问候 |

两个目录的命名与排序规则**完全相同**，下文以 `message/` 为例。

> 项目内部把 `first_mes` + `alternate_greetings` 合并为统一的 `message[]` 数组，`message[0]` 即为 SillyTavern 的 `first_mes`，其余索引对应 `alternate_greetings`。

---

## 2. 文件命名规则

```
message/
  0.md   ← message[0]，即开场白（first_mes）
  1.md   ← message[1]，第 1 个备选问候（alternate_greetings[0]）
  2.md   ← message[2]，第 2 个备选问候
  ...
  10.md  ← message[10]
```

规则：

| 规则 | 说明 |
|---|---|
| 文件名必须是**纯数字** | 正则：`^\d+\.md$` |
| 数字 = 数组索引（0-based） | 不支持补零（不是 `001.md`） |
| 必须以 `.md` 结尾 | 其他扩展名会被忽略 |
| 不要求连续 / 不要求从 0 开始 | 但建议连续；`0.md, 2.md, 5.md` 会按 `[0]=0.md内容, [1]=2.md内容, [2]=5.md内容` 紧凑构建 |

如果出现非数字文件名（如 `开场白.md`），`build` 会**直接报错**。

---

## 3. 排序逻辑

`build` 时按**文件名数值升序**排序（不是字符串排序），所以：

| 文件名顺序 | 字符串排序（错） | 数值排序（本项目使用） |
|---|---|---|
| `1.md, 2.md, 10.md` | `1, 10, 2` | `1, 2, 10` ✓ |

---

## 4. `repo` 拆分时怎么生成

执行 `repo` 把 JSON/PNG 拆分为仓库时：

```
data.message[0]  → message/0.md
data.message[1]  → message/1.md
data.message[2]  → message/2.md
...
```

### 4.1 SillyTavern 兼容模式（默认 build 行为）

| 项目内部 | SillyTavern 输出 |
|---|---|
| `message[0]` | `data.first_mes`（字符串） |
| `message[1..]` | `data.alternate_greetings`（字符串数组） |

### 4.2 内部 V3 模式（`build --internal`）

直接输出统一的 `data.message[]` 数组，不做拆分。

---

## 5. 编辑建议

- **新增问候**：在 `message/` 里新建 `N.md`（N 取下一个未占用编号即可）
- **删除某条问候**：直接删文件；删除中间编号会让后续条目"前移"（数值排序后紧凑成数组）
- **重新排序**：改文件名数字
- **正文格式**：纯文本/Markdown 都可，所有内容会**原样**作为字符串注入到角色卡

---

## 6. 注意事项

- `message/` 目录可以为空（`message[]` 为空数组），但通常至少要有 `0.md`（开场白）
- 如果 `0.md` 缺失但 `1.md` 存在，`build` 不会报错，但导出的 `first_mes` 会是 `1.md` 的内容（因为它是数值最小的文件）
- `group_only_greetings/` 的内容**只在群聊场景**触发；单聊不展示
