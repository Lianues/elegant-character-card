/**
 * 在导出 payload 顶层最前面插入 contributors 标记，标识本次输出
 * 由 elegant-character-card 工具链处理过。
 *
 * - 数组形式：方便未来追加多个贡献者（不破坏既有值）
 * - 若 payload 已存在 contributors 数组，则在前面插入项目名（去重）
 * - 若已存在但不是数组，则保留原值不动
 *
 * 适用三类导出：
 *   1) build → SillyTavern 兼容 JSON（顶层 name/description/.../data）
 *   2) build → 项目内部 V3（顶层 spec/spec_version/data）
 *   3) extract → 内部 V3 JSON
 *
 * 写入 PNG 时的 metadata 走的是 build 的 JSON 串，因此自动包含。
 */

const PROJECT_TAG = "elegant-character-card";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function withContributorsHeader<T>(payload: T): T {
  if (!isRecord(payload)) {
    return payload;
  }

  const existing = (payload as AnyRecord).contributors;

  let contributors: string[];
  if (Array.isArray(existing)) {
    const others = existing.filter(
      (item): item is string => typeof item === "string" && item !== PROJECT_TAG,
    );
    contributors = [PROJECT_TAG, ...others];
  } else if (existing === undefined || existing === null) {
    contributors = [PROJECT_TAG];
  } else {
    // 已有非数组形式的 contributors（罕见）：保持原值不动，避免破坏外部约定
    return payload;
  }

  // 重新构造，确保 contributors 出现在最前
  const { contributors: _drop, ...rest } = payload as AnyRecord;
  return { contributors, ...rest } as T;
}
