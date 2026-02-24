#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "../constants/version.js";
import { registerCommands } from "./registry.js";
async function main() {
    const program = new Command();
    program
        .name("elegant-character-card")
        .description("Elegant Character Card CLI (TypeScript, CLI-only)")
        .version(VERSION);
    registerCommands(program);
    if (process.argv.length <= 2) {
        console.log("✨ Elegant Character Card CLI（仅命令行版本）");
        program.outputHelp();
        return;
    }
    await program.parseAsync(process.argv);
}
process.on("SIGINT", () => {
    console.error("⚠️  操作已取消");
    process.exit(130);
});
main().catch((error) => {
    if (error instanceof Error) {
        console.error(`❌ ${error.message}`);
    }
    else {
        console.error("❌ 未知错误");
    }
    process.exit(1);
});
