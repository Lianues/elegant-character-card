export type FieldType = "string" | "array" | "dict" | "nested";

export interface FieldConfig {
  enabled: boolean;
  type: FieldType;
  filename?: string;
  file_pattern?: string;
  value_type?: string;
  split_content_to_md?: boolean;
  fields?: Record<string, FieldConfig>;
}

export interface RepositorizeConfig {
  enabled: boolean;
  type: "nested";
  fields: Record<string, FieldConfig>;
}

export interface AppConfig {
  repositorize: RepositorizeConfig;
}
