# 02 · `extensions/` 角色级扩展

`extensions/_metadata.yaml` 对应酒馆角色卡 `data.extensions`，存放 SillyTavern 本身或社区插件给角色挂的"扩展属性"。

## 1. 典型示例

```yaml
talkativeness: "0.5"          # 健谈度（影响群聊抢话）
fav: false                    # 是否标星收藏
world: 示例世界书      # 关联的世界书名称
depth_prompt:
  prompt: ""
  depth: 4
  role: system
```

## 2. 字段说明

`extensions` 没有固定 schema，**任何字段都可以加**——SillyTavern 会原样回写。下面列出最常用的：

| 字段 | 类型 | 含义 | 备注 |
|---|---|---|---|
| `talkativeness` | 字符串数字（如 `"0.5"`） | 健谈度（0~1） | 群聊抢话权重 |
| `fav` | 布尔 | 是否收藏 | 角色列表星标 |
| `world` | 字符串 | 关联的独立世界书名 | 与 `data.world_book` 不同：这是引用一个**外部全局世界书** |
| `depth_prompt` | 对象 | 固定深度系统提示 | `prompt / depth / role` |
| `depth_prompt.prompt` | 字符串 | 提示内容 | |
| `depth_prompt.depth` | 整数 | 注入深度 | 默认 4 |
| `depth_prompt.role` | `system / user / model` | 角色 | |

## 3. 添加自定义扩展字段

如果你装了第三方扩展（如某些角色卡分组、心情系统等），它们写入 `extensions` 时会出现自定义键，比如：

```yaml
talkativeness: "0.5"
fav: false
world: 我的世界书
my_plugin_settings:
  enabled: true
  weights:
    a: 0.3
    b: 0.7
```

`build` 会**原样保留**所有字段并写回 `data.extensions`，不需要在本项目里注册。

## 4. 与 `world` 字段的区别

容易混淆的两个概念：

| 字段 | 数据所在 | 用途 |
|---|---|---|
| `data.world_book`（→ 仓库 `world_book/` 目录） | 角色卡**内嵌**世界书 | 跟着角色卡一起分享 |
| `data.extensions.world`（→ 本文件） | 一个字符串 | 引用 SillyTavern 全局世界书库里的某本书的名称 |

通常两者只用一个；如果一个角色既有内嵌也指向外部，`build` 会两个都保留。

## 5. `extensions/regex_scripts/` 正则脚本

`extensions/regex_scripts/` 下每个 `.yaml` 对应一条角色级正则脚本。

仓库内采用**友好格式**（对齐 ST API `regexScript.get`），`build` 时会自动转换回酒馆原生字段（`scriptName` / `disabled` / `placement` / `substituteRegex` / `markdownOnly` / `promptOnly` / `trimStrings`）。

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一标识符（UUID）。 |
| `name` | string | 脚本名称（对应原始 `scriptName`）。 |
| `enabled` | boolean | 是否启用（与原始 `disabled` 相反）。 |
| `findRegex` | string | 查找正则。 |
| `replaceRegex` | string | 替换文本（对应原始 `replaceString`）。 |
| `trimRegex` | string[] | 修剪文本列表（对应原始 `trimStrings`）。 |
| `targets` | string[] | 作用位置：`userInput` / `aiOutput` / `slashCommands` / `worldBook` / `reasoning`（原 `placement` 数字 1/2/3/5/6）。 |
| `view` | string[] | 视图过滤：`user`（仅显示，对应 `markdownOnly`）/ `model`（仅发送 AI，对应 `promptOnly`）。空表示全部生效。 |
| `runOnEdit` | boolean | 是否在编辑时运行。 |
| `macroMode` | string | 宏替换模式：`none` / `raw` / `escaped`（对应原 `substituteRegex` 0/1/2）。 |
| `minDepth` | number \| null | 最小深度。 |
| `maxDepth` | number \| null | 最大深度。 |
| `other` | object | （可选）兜底容器，保留原生 yaml 中其它未识别字段，保证无损往返。 |

### 示例

```yaml
id: 1a28a631-1b9b-4aa8-93a9-caae98801498
name: 去除变量更新
enabled: true
findRegex: /<UpdateVariable>[\s\S]*?</UpdateVariable>/gm
replaceRegex: ""
trimRegex: []
targets:
  - aiOutput
view:
  - user
  - model
runOnEdit: true
macroMode: none
minDepth: null
maxDepth: null
```
