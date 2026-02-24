import { writeFile } from "node:fs/promises";
import YAML from "yaml";
import { DEFAULT_CONFIG } from "../../constants/defaultConfig.js";
export async function runInitConfigCommand(options) {
    const outputPath = options.output ?? "config.yaml";
    const content = YAML.stringify(DEFAULT_CONFIG, {
        indent: 2,
        lineWidth: 0,
        sortMapEntries: false,
    });
    await writeFile(outputPath, content, "utf-8");
    console.log("✅ 默认配置已生成");
    console.log(`- 输出文件: ${outputPath}`);
}
export function registerInitConfigCommand(program) {
    program
        .command("init-config")
        .description("生成默认配置文件")
        .option("-o, --output <file>", "输出配置文件名", "config.yaml")
        .action(runInitConfigCommand);
}
