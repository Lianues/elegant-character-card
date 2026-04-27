/**
 * 正则脚本格式转换：SillyTavern 原生 ↔ 项目内部 friendly 格式。
 *
 * 内部 friendly 字段对齐 st-api-wrapper docs/regexScript/get.md：
 *   id, name, enabled, findRegex, replaceRegex, trimRegex,
 *   targets, view, runOnEdit, macroMode, minDepth, maxDepth, other
 *
 * 原生酒馆字段：
 *   id, scriptName, disabled, runOnEdit, findRegex, replaceString,
 *   trimStrings, placement[number], substituteRegex, minDepth, maxDepth,
 *   markdownOnly, promptOnly
 */

type AnyRecord = Record<string, unknown>;

const PLACEMENT_NUM_TO_TARGET: Record<number, string> = {
  1: "userInput",
  2: "aiOutput",
  3: "slashCommands",
  5: "worldBook",
  6: "reasoning",
};

const TARGET_TO_PLACEMENT_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(PLACEMENT_NUM_TO_TARGET).map(([k, v]) => [v, Number(k)]),
);

const SUBSTITUTE_NUM_TO_MACRO: Record<number, string> = {
  0: "none",
  1: "raw",
  2: "escaped",
};

const MACRO_TO_SUBSTITUTE_NUM: Record<string, number> = {
  none: 0,
  raw: 1,
  escaped: 2,
};

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function pickBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function pickNumOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}
function pickStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * 原生正则脚本对象 → 内部 friendly 对象。
 * 未识别的额外字段会被收集到 `other`，保证往返无损。
 */
export function regexScriptNativeToClean(native: unknown): AnyRecord {
  if (!isRecord(native)) {
    return { other: { _raw: native } };
  }

  const {
    id,
    scriptName,
    disabled,
    runOnEdit,
    findRegex,
    replaceString,
    trimStrings,
    placement,
    substituteRegex,
    minDepth,
    maxDepth,
    markdownOnly,
    promptOnly,
    ...rest
  } = native;

  const targets: string[] = [];
  if (Array.isArray(placement)) {
    for (const p of placement) {
      if (typeof p === "number" && PLACEMENT_NUM_TO_TARGET[p]) {
        targets.push(PLACEMENT_NUM_TO_TARGET[p]);
      }
    }
  }

  const view: string[] = [];
  const md = pickBool(markdownOnly, false);
  const pm = pickBool(promptOnly, false);
  if (md) view.push("user");
  if (pm) view.push("model");

  const macroNum =
    typeof substituteRegex === "number" ? substituteRegex : Number(substituteRegex);
  const macroMode = SUBSTITUTE_NUM_TO_MACRO[macroNum] ?? "none";

  const clean: AnyRecord = {
    id: pickStr(id),
    name: pickStr(scriptName),
    enabled: !pickBool(disabled, false),
    findRegex: pickStr(findRegex),
    replaceRegex: pickStr(replaceString),
    trimRegex: pickStrArr(trimStrings),
    targets,
    view,
    runOnEdit: pickBool(runOnEdit, true),
    macroMode,
    minDepth: pickNumOrNull(minDepth),
    maxDepth: pickNumOrNull(maxDepth),
  };

  // 保留扩展字段（如 disable_when 等），便于无损往返
  if (Object.keys(rest).length > 0) {
    clean.other = rest;
  }

  return clean;
}

/**
 * 内部 friendly 对象 → 原生正则脚本对象（写回酒馆 JSON 用）。
 */
export function regexScriptCleanToNative(clean: unknown): AnyRecord {
  if (!isRecord(clean)) {
    return {};
  }

  const targets = pickStrArr(clean.targets);
  const placement: number[] = [];
  for (const t of targets) {
    const num = TARGET_TO_PLACEMENT_NUM[t];
    if (typeof num === "number") placement.push(num);
  }

  const view = pickStrArr(clean.view);
  const markdownOnly = view.includes("user");
  const promptOnly = view.includes("model");

  const macroMode = pickStr(clean.macroMode, "none");
  const substituteRegex = MACRO_TO_SUBSTITUTE_NUM[macroMode] ?? 0;

  const other = isRecord(clean.other) ? clean.other : {};

  // 严格按酒馆原生字段顺序构建
  const native: AnyRecord = {
    id: pickStr(clean.id),
    scriptName: pickStr(clean.name),
    disabled: clean.enabled === false,
    runOnEdit: pickBool(clean.runOnEdit, true),
    findRegex: pickStr(clean.findRegex),
    replaceString: pickStr(clean.replaceRegex),
    trimStrings: pickStrArr(clean.trimRegex),
    placement,
    substituteRegex,
    minDepth: pickNumOrNull(clean.minDepth),
    maxDepth: pickNumOrNull(clean.maxDepth),
    markdownOnly,
    promptOnly,
    ...other,
  };

  return native;
}

/**
 * 转换 extensions 内的整个 regex_scripts 数组 native → clean。
 * 若不存在或不是数组则原样返回。
 */
export function transformExtensionsRegexScriptsToClean(extensions: unknown): unknown {
  if (!isRecord(extensions)) return extensions;
  const list = extensions.regex_scripts;
  if (!Array.isArray(list)) return extensions;
  return {
    ...extensions,
    regex_scripts: list.map((item) => regexScriptNativeToClean(item)),
  };
}

/**
 * 转换 extensions 内的整个 regex_scripts 数组 clean → native。
 */
export function transformExtensionsRegexScriptsToNative(extensions: unknown): unknown {
  if (!isRecord(extensions)) return extensions;
  const list = extensions.regex_scripts;
  if (!Array.isArray(list)) return extensions;
  return {
    ...extensions,
    regex_scripts: list.map((item) => regexScriptCleanToNative(item)),
  };
}
