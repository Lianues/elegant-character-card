# Elegant Character Card（优美角色卡）

这是 **Elegant Character Card** 的 TypeScript + npm CLI 工程（CLI-only 版本）。

## 当前进度

- ✅ 完成工程骨架
- ✅ 完成核心命令注册（`extract` / `repo` / `build` / `validate` / `info` / `init-config`）
- ✅ 完成 CCV2/CCV3 schema、V2→V3 升级、PNG 元数据读写
- ✅ 完成配置驱动的 `repo/build` 链路（`string/array/dict/nested`）
- ✅ 世界书字段统一（`character_book -> world_book`，`alternate_greetings -> message`）
- ✅ 完成命令执行逻辑与测试（当前 15 个测试全部通过）

## 使用

```bash
npm install
npm run build
node dist/cli/index.js --help
```

或开发模式：

```bash
npm run dev -- --help
```

## 命令示例

```bash
# 生成默认配置
node dist/cli/index.js init-config

# PNG -> JSON
node dist/cli/index.js extract character.png

# PNG/JSON -> repo
node dist/cli/index.js repo character.png
node dist/cli/index.js repo character.json

# repo -> JSON / PNG
node dist/cli/index.js build my_character -f json
node dist/cli/index.js build my_character -f png -b character.png --legacy

# 校验与信息
node dist/cli/index.js validate character.png
node dist/cli/index.js info character.json

# 独立世界书（world_book）JSON <-> repo
node dist/cli/index.js world-book repo world_book.json -o my_world_book
node dist/cli/index.js world-book build my_world_book -o world_book.rebuilt.json
```

## 文档

- 世界书字段说明：[`README_世界书字段.md`](./README_世界书字段.md)
- message 顺序说明：[`README_message顺序说明.md`](./README_message顺序说明.md)
