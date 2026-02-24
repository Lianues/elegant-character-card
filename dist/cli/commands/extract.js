import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { formatBookForReadableOutput } from "../../core/book/bookFormat.js";
import { loadCardFromPng } from "../../core/card/loadCard.js";
export async function runExtractCommand(input, options) {
    if (!existsSync(input)) {
        throw new Error(`输入文件不存在: ${input}`);
    }
    if (path.extname(input).toLowerCase() !== ".png") {
        throw new Error("extract 仅支持 PNG 输入");
    }
    console.log(`📤 正在提取: ${input}`);
    const { card, upgradedFromV2 } = await loadCardFromPng(input);
    const outputPayload = formatBookForReadableOutput(card);
    const outputPath = options.output ?? `${card.data.name || path.parse(input).name}.json`;
    await writeFile(outputPath, `${JSON.stringify(outputPayload, null, 2)}\n`, "utf-8");
    console.log("✅ 提取成功");
    console.log(`- 角色名: ${card.data.name}`);
    console.log(`- 输出文件: ${outputPath}`);
    if (upgradedFromV2) {
        console.log("- 兼容提示: 输入为 V2，已自动升级为 V3 输出");
    }
}
export function registerExtractCommand(program) {
    program
        .command("extract")
        .description("从 PNG 提取角色卡数据并输出为 JSON")
        .argument("<input>", "输入 PNG 文件")
        .option("-o, --output <file>", "输出 JSON 文件")
        .action(runExtractCommand);
}
