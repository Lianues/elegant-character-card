# Elegant Character Card（优美角色卡）

这是 **Elegant Character Card** 的 TypeScript + npm CLI 工程（CLI-only 版本）。

## 当前进度

- ✅ 完成工程骨架
- ✅ 完成核心命令注册（`init` / `extract` / `repo` / `build` / `validate` / `info` / `init-config`）
- ✅ 完成 CCV2/CCV3 schema、V2→V3 升级、PNG 元数据读写
- ✅ 完成配置驱动的 `repo/build` 链路（`string/array/dict/nested`）
- ✅ 世界书字段统一（`character_book -> world_book`，`alternate_greetings -> message`）
- ✅ `build` 默认输出 SillyTavern 兼容格式（字段顺序、命名、4 空格缩进与酒馆原生卡逐行对齐）
- ✅ `repo` 自动剥离原图 metadata chunk 并保存为仓库内置裸图，`build -f png` 默认底图
- ✅ `repo` 自动把项目内置的 yaml 规范文档复制到 `<仓库>/docs/`，方便用户离线查阅字段说明
- ✅ 完成命令执行逻辑与测试

## 使用

全局命令名为 **`ecc`**（短别名）和 `elegant-character-card`（完整名）。两者完全等价。

### 1) 本地源码使用（开发 / 试用）

```bash
# 一键安装并把 ecc 注册到全局 PATH
npm install
npm run link        # = npm run build && npm link

ecc --help          # 验证已可调用
```

取消注册：`npm run unlink`

### 2) 作为 npm 包使用（发布后）

```bash
# 全局安装
npm install -g elegant-character-card
ecc --help

# 或在某个项目里本地安装，配合 npx
npm install --save-dev elegant-character-card
npx ecc --help
```

`files` 字段已声明发布范围，安装后会自带 `dist/`（含内置模板 `dist/空卡.png`、`dist/default.png` 与 `dist/docs/`），开箱即用。

### 3) 不想安装的开发模式

```bash
# 直接跑 TypeScript 源码，无需编译
npm run dev -- --help
```

## 命令示例

> 下面所有示例都用短命令 `ecc`，等价于 `elegant-character-card` 或 `npx ecc`。

```bash
# 生成默认配置
ecc init-config

# 项目初始化：用内置「空卡」模板一键生成一个新仓库（等价于对内置空卡执行 ecc repo）
ecc init                 # 直接生成名为「空卡」的仓库
ecc init 我的新卡        # 指定角色名/仓库目录名
ecc init 我的新卡 -c custom.yaml  # 指定配置文件

# PNG -> JSON
ecc extract character.png

# PNG/JSON -> repo
ecc repo character.png   # 自动剥离 metadata chunk，裸图存为 <repo>/character.png
ecc repo character.json  # 不带图，仓库 _metadata.yaml 中 image_path 留空

# repo -> JSON
ecc build my_character -f json
ecc build my_character -f json --internal   # 输出项目内部 V3 而非酒馆兼容
ecc build -f json                           # 省略仓库参数 = 当前目录（在仓库根目录里直接打包）

# repo -> PNG（默认输出 SillyTavern 兼容格式）
ecc build my_character -f png                       # 自动用仓库内置 image_path
ecc build my_character -f png -b character.png      # -b 覆盖默认底图
ecc build my_character -f png -b cover.png --legacy # 同时写 ccv3 + chara chunk
ecc build -f png                                    # 省略仓库参数 = 当前目录

# 校验与信息
ecc validate character.png
ecc info character.json

# 独立世界书（world_book）JSON <-> repo
ecc world-book repo world_book.json -o my_world_book
ecc world-book build my_world_book -o world_book.rebuilt.json
ecc world-book build                                # 省略仓库参数 = 当前目录（在世界书仓库里直接打包）
```

## build 输出格式

`build` **默认输出 SillyTavern 兼容格式**，与酒馆原生导出在以下层面严格对齐：

| 维度 | 对齐内容 |
|---|---|
| 顶层字段顺序 | `name, description, personality, scenario, first_mes, mes_example, creatorcomment, avatar, talkativeness, fav, tags, spec, spec_version, data, create_date` |
| `data` 字段顺序 | `name, description, ..., alternate_greetings, extensions, group_only_greetings, character_book` |
| 世界书 entry | 12 个顶层字段（`id/keys/secondary_keys/comment/content/constant/...`）+ 31 个 extensions 字段（`position/exclude_recursion/display_index/.../ignore_budget`），顺序与酒馆完全一致 |
| `position` 规范 | V2 顶层只允许 `before_char` / `after_char`，精细位置（at_depth/AN/EM 等）由 `extensions.position` 数字承载 |
| 缩进 | 4 空格（与酒馆原生导出一致） |

如需输出本项目内部 V3 格式（`message[]` 数组、`world_book` clean 结构），加 `--internal`。

## 项目初始化（`ecc init`）

`ecc init [name]` 用来**从零开搭一个新角色卡仓库**，避免手写 `_metadata.yaml` / 各字段目录。

其本质等价于对项目内置的「空卡」模板执行一次 `ecc repo`：

- 模板源：`src/空卡.png`（编译后位于 `dist/空卡.png`，随 npm 包一起发布）
- 自动复用 `repo` 全部链路：剥离 metadata chunk → 生成裸图 `<repo>/character.png` → 写入 `image_path` → 复制项目内置 `docs/` → 拆分各字段目录

用法：

```bash
ecc init                          # 生成名为「空卡」的仓库目录
ecc init 我的新卡                 # 用「我的新卡」覆盖 data.name，仓库目录同名
ecc init 我的新卡 -c custom.yaml  # 自定义配置文件路径（不存在时回落到内置默认）
```

生成产物（以 `ecc init 我的新卡` 为例）：

```
我的新卡/
├── _metadata.yaml          # 主元数据（已写好 image_path: character.png）
├── character.png           # 已剥离 metadata chunk 的裸底图
├── docs/                   # 项目内置规范文档（离线查阅字段说明）
├── extensions/             # SillyTavern 角色级扩展 + regex_scripts/
├── message/                # first_mes / alternate_greetings 拆分文件
└── world_book/             # 世界书条目目录
```

下一步即可编辑各字段文件，然后用 `ecc build 我的新卡` 产出最终角色卡 PNG / JSON。

## 默认底图机制（`image_path`）

`repo` 命令在仓库根目录的 `_metadata.yaml` 的 `data.image_path` 写入默认底图路径：

```yaml
data:
  ...
  world_book: my_character\world_book
  image_path: character.png    # 项目内部字段，反向构建时自动忽略
```

- **PNG 输入**：自动剥离 `ccv3` / `chara` 元数据 chunk，裸图保存为 `<repo>/character.png`，`image_path` 设为 `character.png`
- **JSON 输入**：不生成图，`image_path` 留空字符串

`build -f png` 解析底图的优先级：

| 优先级 | 来源 | 行为 |
|---|---|---|
| 1 | **`-b <file>`** | 文件不存在 → **报错** |
| 2 | 仓库 `image_path` 已填值 | 文件不存在 → **报错**（不静默回落，避免用户改了路径却没察觉） |
| 3 | 仓库 `image_path` 为空字符串 | 自动使用项目内置 `src/default.png`（编译后位于 `dist/default.png`） |

总结：**只有"明确不指定底图"时才用默认图；一旦指定了底图但缺失，就一定会报错**。

## 仓库结构（仅保留必要字段）

仓库 YAML 自动剔除以下"原版酒馆角色卡里不存在的冗余字段"：

- 主 `_metadata.yaml`：`nickname/source/creation_date/modification_date/assets/creator_notes_multilingual` 等 V3 占位符
- `world_book/_metadata.yaml`：`description/scan_depth/token_budget/recursive_scanning` 等 null 字段、`extensions: {}` 空对象
- 单条 entry yaml：所有已被 clean 字段表示的 SillyTavern 内部字段（`extensions.position/depth/role/probability/...`），避免双份存储

保留的 `other.extensions` 仅包含 SillyTavern 专属、无 clean 字段对应的扩展字段（`display_index/sticky/cooldown/group_*/match_*/ignore_budget` 等），是反向构建这些字段的唯一数据源。

## 文档

本项目把所有"角色卡仓库 yaml 规范"文档放在 [`src/docs/`](./src/docs/)，编译后会同步到 `dist/docs/`，并在执行 `repo` 时自动复制到用户仓库的 `docs/` 子目录。

| 文件 | 适用范围 |
|---|---|
| [`src/docs/README.md`](./src/docs/README.md) | 索引 + 设计原则 |
| [`src/docs/01_仓库结构总览.md`](./src/docs/01_仓库结构总览.md) | 整体目录结构、主 `_metadata.yaml`、`image_path` 默认底图机制 |
| [`src/docs/02_extensions目录.md`](./src/docs/02_extensions目录.md) | `extensions/_metadata.yaml`（角色级 SillyTavern 扩展） |
| [`src/docs/03_message目录.md`](./src/docs/03_message目录.md) | `message/*.md` 与 `group_only_greetings/` 命名规则与排序 |
| [`src/docs/04_world_book条目.md`](./src/docs/04_world_book条目.md) | `world_book/entries/*.yaml` 全部字段、枚举、`other.extensions` |
