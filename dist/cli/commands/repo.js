import { existsSync } from "node:fs";
import path from "node:path";
import { loadCardFromFile } from "../../core/card/loadCard.js";
import { repositorize } from "../../core/repository/repositorize.js";
export async function runRepoCommand(input, options) {
    if (!existsSync(input)) {
        throw new Error(`输入文件不存在: ${input}`);
    }
    const ext = path.extname(input).toLowerCase();
    if (ext !== ".png" && ext !== ".json") {
        throw new Error("repo 输入必须是 PNG 或 JSON 文件");
    }
    console.log(`📁 正在仓库化: ${input}`);
    const { card, upgradedFromV2 } = await loadCardFromFile(input);
    const configPath = options.config ?? "config.yaml";
    // PNG 输入时把原图传给 repositorize 以便提取/清洗为仓库根目录的裸图
    const sourceImagePath = ext === ".png" ? input : undefined;
    const repoPath = await repositorize(card, configPath, sourceImagePath);
    console.log("✅ 仓库化成功");
    console.log(`- 角色名: ${card.data.name}`);
    console.log(`- 仓库目录: ${repoPath}`);
    console.log(`- 配置文件: ${configPath}`);
    console.log(`- 规范文档: ${path.join(repoPath, "docs")}（已自动复制项目内置 docs/）`);
    if (sourceImagePath) {
        console.log(`- 默认底图: ${path.join(repoPath, "character.png")}（已剥离 metadata chunk）`);
    }
    else {
        console.log("- 默认底图: 无（输入是 JSON，image_path 留空）");
    }
    if (upgradedFromV2) {
        console.log("- 兼容提示: 输入为 V2，已自动升级为 V3 再仓库化");
    }
}
export function registerRepoCommand(program) {
    program
        .command("repo")
        .description("将角色卡转换为仓库化目录结构")
        .argument("<input>", "输入 PNG 或 JSON 文件")
        .option("-c, --config <file>", "配置文件路径", "config.yaml")
        .action(runRepoCommand);
}
