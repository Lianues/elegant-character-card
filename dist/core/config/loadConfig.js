import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { DEFAULT_CONFIG } from "../../constants/defaultConfig.js";
function cloneDefaultConfig() {
    return structuredClone(DEFAULT_CONFIG);
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function getUserFieldsConfig(input) {
    if (!isRecord(input)) {
        return null;
    }
    const repositorize = input.repositorize;
    if (!isRecord(repositorize)) {
        return null;
    }
    const fields = repositorize.fields;
    if (!isRecord(fields)) {
        return null;
    }
    return fields;
}
/**
 * 读取 YAML 配置，并按 Python 版本逻辑做合并（仅覆盖 repositorize.fields）。
 */
export async function loadConfig(configPath = "config.yaml") {
    const result = cloneDefaultConfig();
    if (!existsSync(configPath)) {
        return result;
    }
    try {
        const content = await readFile(configPath, "utf-8");
        const parsed = YAML.parse(content) ?? {};
        const userFields = getUserFieldsConfig(parsed);
        if (userFields) {
            Object.assign(result.repositorize.fields, userFields);
        }
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to load config from ${configPath}: ${message}`);
        return result;
    }
}
