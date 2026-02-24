import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
async function ensureDir(filePath) {
    const dirname = path.dirname(filePath);
    if (!dirname || dirname === ".") {
        return;
    }
    await mkdir(dirname, { recursive: true });
}
export function sanitizeFilename(name) {
    if (!name) {
        return "unnamed";
    }
    const illegalChars = /[\/\\?%*:|"<>.]/g;
    const sanitized = name.replace(illegalChars, "_").replace(/^[ _.]+|[ _.]+$/g, "");
    return sanitized || "unnamed";
}
async function yamlSafeDump(data, filePath) {
    await ensureDir(filePath);
    const yamlText = YAML.stringify(data, {
        indent: 2,
        lineWidth: 0,
        sortMapEntries: false,
    });
    await writeFile(filePath, yamlText, "utf-8");
}
async function safeFileWrite(content, filePath) {
    await ensureDir(filePath);
    await writeFile(filePath, content, "utf-8");
}
function formatWithDotNotation(pattern, data) {
    return pattern.replace(/\{([^}]+)\}/g, (_, placeholder) => {
        if (placeholder.includes(".")) {
            const keys = placeholder.split(".");
            let value = data;
            for (const key of keys) {
                if (!isRecord(value) || !(key in value)) {
                    throw new Error(`Could not find '${placeholder}' in data`);
                }
                value = value[key];
            }
            return sanitizeFilename(String(value));
        }
        if (!(placeholder in data)) {
            throw new Error(`Could not find '${placeholder}' in data`);
        }
        return sanitizeFilename(String(data[placeholder]));
    });
}
function extractFilenameFromPattern(pattern, item) {
    try {
        return formatWithDotNotation(pattern, item);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not extract filename from pattern '${pattern}' with item ${JSON.stringify(item)}. Error: ${message}`);
        return null;
    }
}
async function writeValue(value, filePath, valueType = "string") {
    if (valueType === "string") {
        await safeFileWrite(String(value ?? ""), filePath);
        return;
    }
    await yamlSafeDump(value, filePath);
}
async function readValue(filePath, valueType = "string") {
    if (!existsSync(filePath)) {
        return valueType === "string" ? "" : {};
    }
    const content = await readFile(filePath, "utf-8");
    if (valueType === "string") {
        return content;
    }
    const loaded = YAML.parse(content);
    return loaded ?? {};
}
export async function dumpStringField(content, basePath, filename) {
    if (!content) {
        return;
    }
    const filePath = path.join(basePath, filename);
    await writeValue(content, filePath, "string");
}
async function maybeSplitContentToMarkdown(item, config, valueType, fullPath, yamlFilename) {
    if (!config.split_content_to_md || valueType !== "dict" || !isRecord(item)) {
        return item;
    }
    if (typeof item.content !== "string") {
        return item;
    }
    const contentFilename = `${path.parse(yamlFilename).name}.md`;
    await writeValue(item.content, path.join(fullPath, contentFilename), "string");
    const { content: _content, ...rest } = item;
    return {
        ...rest,
    };
}
async function maybeHydrateMarkdownContent(item, config, valueType, fullPath, yamlFilename) {
    if (!config.split_content_to_md || valueType !== "dict" || !isRecord(item)) {
        return item;
    }
    if (typeof item.content === "string" && !item.content.toLowerCase().endsWith(".md")) {
        return item;
    }
    const candidates = [
        typeof item.content === "string" ? item.content : null,
        `${path.parse(yamlFilename).name}.md`,
    ].filter((name) => !!name);
    const markdownName = candidates.find((name) => existsSync(path.join(fullPath, name)));
    if (!markdownName) {
        return item;
    }
    const markdownPath = path.join(fullPath, markdownName);
    const markdownContent = await readValue(markdownPath, "string");
    return { ...item, content: String(markdownContent ?? "") };
}
export async function dumpArrayField(items, config, basePath, fieldName) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }
    const fullPath = path.join(basePath, fieldName);
    const valueType = config.value_type ?? "string";
    const zfillLength = Math.min(items.length, 3);
    if (config.file_pattern) {
        for (let idx = 0; idx < items.length; idx += 1) {
            const item = items[idx];
            let filename = config.file_pattern;
            if (filename.includes("{idx}")) {
                const indexText = fieldName === "message"
                    ? String(idx)
                    : String(idx + 1).padStart(zfillLength, "0");
                filename = filename.replaceAll("{idx}", indexText);
            }
            if (isRecord(item)) {
                filename =
                    extractFilenameFromPattern(filename, item) ??
                        (valueType === "dict" ? `${idx + 1}.yaml` : `${idx + 1}.md`);
            }
            const outputValue = await maybeSplitContentToMarkdown(item, config, valueType, fullPath, filename);
            const filePath = path.join(fullPath, filename);
            await writeValue(outputValue, filePath, valueType);
        }
        return;
    }
    for (let idx = 0; idx < items.length; idx += 1) {
        const fallbackExt = valueType === "dict" ? "yaml" : "md";
        const indexText = fieldName === "message" ? String(idx) : String(idx + 1);
        const filePath = path.join(fullPath, `${indexText}.${fallbackExt}`);
        await writeValue(items[idx], filePath, valueType);
    }
}
export async function dumpDictField(data, config, basePath, fieldName) {
    if (!isRecord(data) || Object.keys(data).length === 0) {
        return;
    }
    const fullPath = path.join(basePath, fieldName);
    const valueType = config.value_type ?? "string";
    if (config.file_pattern) {
        for (const [key, value] of Object.entries(data)) {
            const filename = config.file_pattern.replaceAll("{key}", key);
            const filePath = path.join(fullPath, filename);
            await writeValue(value, filePath, valueType);
        }
        return;
    }
    await yamlSafeDump(data, path.join(fullPath, "_metadata.yaml"));
}
export async function dumpNestedField(data, config, basePath, fieldName) {
    if (!isRecord(data) || Object.keys(data).length === 0) {
        return;
    }
    const fullPath = path.join(basePath, fieldName);
    const fieldsConfig = config.fields ?? {};
    const modifiedData = { ...data };
    for (const [subFieldName, subFieldConfig] of Object.entries(fieldsConfig)) {
        if (!subFieldConfig.enabled || !(subFieldName in modifiedData)) {
            continue;
        }
        const subFieldData = modifiedData[subFieldName];
        delete modifiedData[subFieldName];
        if (!subFieldData) {
            continue;
        }
        const subFieldType = subFieldConfig.type;
        if (subFieldType === "array") {
            await dumpArrayField(subFieldData, subFieldConfig, fullPath, subFieldName);
            modifiedData[subFieldName] = path.join(fullPath, subFieldName);
        }
        else if (subFieldType === "dict") {
            await dumpDictField(subFieldData, subFieldConfig, fullPath, subFieldName);
            modifiedData[subFieldName] = path.join(fullPath, subFieldName);
        }
        else if (subFieldType === "string") {
            const filename = subFieldConfig.filename ?? `${subFieldName}.md`;
            await dumpStringField(subFieldData, fullPath, filename);
            modifiedData[subFieldName] = path.join(fullPath, filename);
        }
    }
    if (Object.keys(modifiedData).length > 0) {
        await yamlSafeDump(modifiedData, path.join(fullPath, "_metadata.yaml"));
    }
}
export async function handleField(fieldData, fieldType, config, basePath, fieldName, data) {
    if (!fieldData) {
        data[fieldName] = fieldData;
        return;
    }
    if (fieldType === "string") {
        const filename = config.filename ?? `${fieldName}.md`;
        await dumpStringField(fieldData, basePath, filename);
        data[fieldName] = path.join(basePath, filename);
    }
    else if (fieldType === "array") {
        await dumpArrayField(fieldData, config, basePath, fieldName);
        data[fieldName] = path.join(basePath, fieldName);
    }
    else if (fieldType === "dict") {
        await dumpDictField(fieldData, config, basePath, fieldName);
        data[fieldName] = path.join(basePath, fieldName);
    }
    else if (fieldType === "nested") {
        await dumpNestedField(fieldData, config, basePath, fieldName);
        data[fieldName] = path.join(basePath, fieldName);
    }
    else {
        data[fieldName] = fieldData;
    }
}
export async function loadStringField(basePath, filename) {
    const filePath = path.join(basePath, filename);
    const content = await readValue(filePath, "string");
    return String(content || "") || null;
}
export async function loadArrayField(config, basePath, fieldName) {
    const compareArrayFilenames = (a, b) => a.localeCompare(b);
    const fullPath = path.join(basePath, fieldName);
    if (!existsSync(fullPath)) {
        return [];
    }
    const valueType = config.value_type ?? "string";
    const entries = (await readdir(fullPath, { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((filename) => {
        if (valueType !== "dict") {
            return true;
        }
        return filename.endsWith(".yaml") || filename.endsWith(".yml");
    })
        .sort(compareArrayFilenames);
    if (fieldName === "message") {
        const invalid = entries.filter((filename) => !/^\d+\.md$/i.test(filename));
        if (invalid.length > 0) {
            throw new Error(`message 目录仅允许纯数字文件名（如 1.md, 2.md）。发现无效文件: ${invalid.join(", ")}`);
        }
        entries.sort((a, b) => Number(path.parse(a).name) - Number(path.parse(b).name));
    }
    const items = [];
    for (const filename of entries) {
        const rawItem = await readValue(path.join(fullPath, filename), valueType);
        const item = await maybeHydrateMarkdownContent(rawItem, config, valueType, fullPath, filename);
        if (item || valueType === "string") {
            items.push(item);
        }
    }
    return items;
}
export async function loadDictField(config, basePath, fieldName) {
    const fullPath = path.join(basePath, fieldName);
    if (!existsSync(fullPath)) {
        return {};
    }
    const result = {};
    const valueType = config.value_type ?? "string";
    if (config.file_pattern) {
        const entries = (await readdir(fullPath, { withFileTypes: true }))
            .filter((entry) => entry.isFile() && entry.name !== "_metadata.yaml")
            .map((entry) => entry.name);
        for (const filename of entries) {
            let key;
            if (config.file_pattern.endsWith(".md") && filename.endsWith(".md")) {
                key = filename.slice(0, -3);
            }
            else if (config.file_pattern.endsWith(".yaml") && filename.endsWith(".yaml")) {
                key = filename.slice(0, -5);
            }
            else {
                key = path.parse(filename).name;
            }
            result[key] = await readValue(path.join(fullPath, filename), valueType);
        }
        return result;
    }
    const metadataPath = path.join(fullPath, "_metadata.yaml");
    if (!existsSync(metadataPath)) {
        return result;
    }
    const content = await readFile(metadataPath, "utf-8");
    const loaded = YAML.parse(content);
    return isRecord(loaded) ? loaded : result;
}
export async function loadNestedField(config, basePath, fieldName) {
    const fullPath = path.join(basePath, fieldName);
    if (!existsSync(fullPath)) {
        return {};
    }
    let result = {};
    const metadataPath = path.join(fullPath, "_metadata.yaml");
    if (existsSync(metadataPath)) {
        const content = await readFile(metadataPath, "utf-8");
        const loaded = YAML.parse(content);
        if (isRecord(loaded)) {
            result = loaded;
        }
    }
    const fieldsConfig = config.fields ?? {};
    for (const [subFieldName, subFieldConfig] of Object.entries(fieldsConfig)) {
        if (!subFieldConfig.enabled) {
            continue;
        }
        const maybePath = result[subFieldName];
        if (typeof maybePath !== "string" || !maybePath.startsWith(fullPath)) {
            continue;
        }
        if (subFieldConfig.type === "array") {
            result[subFieldName] = await loadArrayField(subFieldConfig, fullPath, subFieldName);
        }
        else if (subFieldConfig.type === "dict") {
            result[subFieldName] = await loadDictField(subFieldConfig, fullPath, subFieldName);
        }
        else if (subFieldConfig.type === "string") {
            const filename = subFieldConfig.filename ?? `${subFieldName}.md`;
            result[subFieldName] = await loadStringField(fullPath, filename);
        }
    }
    return result;
}
