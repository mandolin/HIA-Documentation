import { readFile } from "node:fs/promises";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export const HIA_PROFILE_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_PROFILE_LAYERS = ["stable", "compat", "bridge", "extension"] as const;
export const HIA_PROFILE_TAG_STATUSES = ["stable", "alias", "deprecated", "reserved", "experimental"] as const;
export const HIA_PROFILE_TAG_SCOPES = ["block", "inline", "file", "region", "directive"] as const;
export const HIA_PROFILE_DIAGNOSTIC_SEVERITIES = ["info", "warning", "error"] as const;
export const HIA_PROFILE_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-0.1.0-draft.schema.json";

export const HIA_PROFILE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROFILE_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "profileId", "profileVersion", "displayName", "layer", "extends", "contracts", "targets", "tags", "rules", "mappings", "diagnostics", "capabilities"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: HIA_PROFILE_SCHEMA_VERSION },
    profileId: {
      type: "string",
      pattern: "^[a-z0-9._-]+$"
    },
    profileVersion: { $ref: "#/$defs/nonEmptyString" },
    displayName: { $ref: "#/$defs/nonEmptyString" },
    layer: { enum: [...HIA_PROFILE_LAYERS] },
    extends: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    contracts: {
      type: "array",
      items: { $ref: "#/$defs/contractRef" }
    },
    targets: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    tags: {
      type: "array",
      items: { $ref: "#/$defs/tag" }
    },
    rules: {
      type: "array",
      items: { $ref: "#/$defs/rule" }
    },
    mappings: {
      type: "array",
      items: { $ref: "#/$defs/mapping" }
    },
    diagnostics: {
      type: "array",
      items: { $ref: "#/$defs/diagnostic" }
    },
    capabilities: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    stringList: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    jsonObject: { type: "object" },
    contractRef: {
      type: "object",
      required: ["name"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" },
        role: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    tag: {
      type: "object",
      required: ["name", "status", "scope", "targets"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        status: { enum: [...HIA_PROFILE_TAG_STATUSES] },
        aliasFor: { $ref: "#/$defs/nonEmptyString" },
        scope: {
          type: "array",
          items: { enum: [...HIA_PROFILE_TAG_SCOPES] }
        },
        targets: { $ref: "#/$defs/stringList" },
        repeatable: { type: "boolean" },
        valueGrammar: { $ref: "#/$defs/nonEmptyString" },
        conflicts: { $ref: "#/$defs/stringList" },
        requires: { $ref: "#/$defs/stringList" },
        mapsTo: { $ref: "#/$defs/jsonObject" },
        diagnostics: { $ref: "#/$defs/stringList" },
        metadata: { $ref: "#/$defs/jsonObject" }
      }
    },
    rule: {
      type: "object",
      required: ["ruleId", "optionsSchema", "messages"],
      additionalProperties: true,
      properties: {
        ruleId: { $ref: "#/$defs/nonEmptyString" },
        category: { $ref: "#/$defs/nonEmptyString" },
        defaultSeverity: { enum: [...HIA_PROFILE_DIAGNOSTIC_SEVERITIES] },
        optionsSchema: { $ref: "#/$defs/jsonObject" },
        appliesTo: { $ref: "#/$defs/stringList" },
        messages: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        fixable: { type: "boolean" },
        hasSuggestions: { type: "boolean" },
        metadata: { $ref: "#/$defs/jsonObject" }
      }
    },
    mapping: {
      type: "object",
      required: ["from", "to"],
      additionalProperties: true,
      properties: {
        from: { $ref: "#/$defs/nonEmptyString" },
        to: { $ref: "#/$defs/nonEmptyString" },
        conditions: { $ref: "#/$defs/stringList" },
        confidence: { $ref: "#/$defs/nonEmptyString" },
        sourcePolicy: { $ref: "#/$defs/nonEmptyString" },
        metadataPolicy: { $ref: "#/$defs/nonEmptyString" },
        diagnostics: { $ref: "#/$defs/stringList" }
      }
    },
    diagnostic: {
      type: "object",
      required: ["code", "severity", "defaultMessage"],
      additionalProperties: true,
      properties: {
        code: { $ref: "#/$defs/nonEmptyString" },
        severity: { enum: [...HIA_PROFILE_DIAGNOSTIC_SEVERITIES] },
        messageKey: { $ref: "#/$defs/nonEmptyString" },
        defaultMessage: { $ref: "#/$defs/nonEmptyString" },
        target: { $ref: "#/$defs/nonEmptyString" },
        relatedLocations: {
          type: "array",
          items: {}
        },
        suggestions: { $ref: "#/$defs/stringList" }
      }
    }
  }
} as const;

export type HiaProfileLayer = typeof HIA_PROFILE_LAYERS[number];
export type HiaProfileTagStatus = typeof HIA_PROFILE_TAG_STATUSES[number];
export type HiaProfileTagScope = typeof HIA_PROFILE_TAG_SCOPES[number];
export type HiaProfileDiagnosticSeverity = typeof HIA_PROFILE_DIAGNOSTIC_SEVERITIES[number];
export type HiaProfileJsonObject = Record<string, unknown>;

export interface HiaDocumentationProfile {
  schemaVersion: string;
  profileId: string;
  profileVersion: string;
  displayName: string;
  layer: HiaProfileLayer | string;
  extends: string[];
  contracts: HiaProfileContractRef[];
  targets: string[];
  tags: HiaProfileTagDefinition[];
  rules: HiaProfileRuleDefinition[];
  mappings: HiaProfileMappingDefinition[];
  diagnostics: HiaProfileDiagnosticDefinition[];
  capabilities: HiaProfileJsonObject;
}

export interface HiaProfileContractRef {
  name: string;
  version?: string;
  role?: string;
}

export interface HiaProfileTagDefinition {
  name: string;
  status: HiaProfileTagStatus | string;
  aliasFor?: string;
  scope: string[];
  targets: string[];
  repeatable?: boolean;
  valueGrammar?: string;
  conflicts?: string[];
  requires?: string[];
  mapsTo?: HiaProfileJsonObject;
  diagnostics?: string[];
  metadata?: HiaProfileJsonObject;
}

export interface HiaProfileRuleDefinition {
  ruleId: string;
  category?: string;
  defaultSeverity?: HiaProfileDiagnosticSeverity | string;
  optionsSchema: HiaProfileJsonObject;
  appliesTo?: string[];
  messages: Record<string, string>;
  fixable?: boolean;
  hasSuggestions?: boolean;
  metadata?: HiaProfileJsonObject;
}

export interface HiaProfileMappingDefinition {
  from: string;
  to: string;
  conditions?: string[];
  confidence?: string;
  sourcePolicy?: string;
  metadataPolicy?: string;
  diagnostics?: string[];
}

export interface HiaProfileDiagnosticDefinition {
  code: string;
  severity: HiaProfileDiagnosticSeverity | string;
  messageKey?: string;
  defaultMessage: string;
  target?: string;
  relatedLocations?: unknown[];
  suggestions?: string[];
}

export interface HiaProfileLoadOptions {
  path?: string;
}

export interface HiaLoadedProfile {
  profile: HiaDocumentationProfile;
  diagnostics: HiaDiagnostic[];
  path?: string;
}

export interface HiaProfileSetInput {
  profiles: HiaDocumentationProfile[];
}

export interface HiaProfileSet {
  profiles: Map<string, HiaDocumentationProfile>;
  diagnostics: HiaDiagnostic[];
}

export interface HiaProfileTagQuery {
  profileId: string;
  tagName: string;
  includeAliases?: boolean;
}

export interface HiaResolvedProfileTag {
  profile: HiaDocumentationProfile;
  tag: HiaProfileTagDefinition;
  resolvedTag: HiaProfileTagDefinition;
  aliasChain: string[];
}

export async function loadHiaProfileFromFile(filePath: string): Promise<HiaLoadedProfile> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const profile = isRecord(parsed) ? parsed as unknown as HiaDocumentationProfile : createEmptyInvalidProfile();
    return {
      profile,
      diagnostics: validateHiaProfile(profile, { path: filePath }),
      path: filePath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      profile: createEmptyInvalidProfile(),
      diagnostics: [
        createProfileDiagnostic("HIA_PROFILE_READ_FAILED", `Profile could not be read: ${message}.`, "error", undefined, {
          profilePath: filePath
        })
      ],
      path: filePath
    };
  }
}

export function validateHiaProfile(value: unknown, options: HiaProfileLoadOptions = {}): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  const targetPrefix = options.path;

  if (!isRecord(value)) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_INVALID", "Documentation profile must be a JSON object.", "error", targetPrefix));
    return diagnostics;
  }

  validateRequiredString(value, "schemaVersion", diagnostics, targetPrefix);
  validateRequiredString(value, "profileId", diagnostics, targetPrefix);
  validateRequiredString(value, "profileVersion", diagnostics, targetPrefix);
  validateRequiredString(value, "displayName", diagnostics, targetPrefix);
  validateRequiredArray(value, "extends", diagnostics, targetPrefix);
  validateRequiredArray(value, "contracts", diagnostics, targetPrefix);
  validateRequiredArray(value, "targets", diagnostics, targetPrefix);
  validateRequiredArray(value, "tags", diagnostics, targetPrefix);
  validateRequiredArray(value, "rules", diagnostics, targetPrefix);
  validateRequiredArray(value, "mappings", diagnostics, targetPrefix);
  validateRequiredArray(value, "diagnostics", diagnostics, targetPrefix);

  if (typeof value.schemaVersion === "string" && value.schemaVersion !== HIA_PROFILE_SCHEMA_VERSION) {
    diagnostics.push(createProfileDiagnostic(
      "HIA_PROFILE_SCHEMA_UNSUPPORTED",
      `Unsupported documentation profile schemaVersion: ${value.schemaVersion}.`,
      "error",
      joinTarget(targetPrefix, "schemaVersion")
    ));
  }

  if (typeof value.profileId === "string" && !/^[a-z0-9._-]+$/.test(value.profileId)) {
    diagnostics.push(createProfileDiagnostic(
      "HIA_PROFILE_ID_INVALID",
      `Documentation profile id is invalid: ${value.profileId}.`,
      "error",
      joinTarget(targetPrefix, "profileId")
    ));
  }

  validateRequiredEnum(value, "layer", HIA_PROFILE_LAYERS, diagnostics, targetPrefix);

  if (!isRecord(value.capabilities)) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "capabilities must be an object.", "error", joinTarget(targetPrefix, "capabilities")));
  }

  validateProfileTags(value.tags, diagnostics, targetPrefix);
  validateProfileRules(value.rules, diagnostics, targetPrefix);
  validateProfileMappings(value.mappings, diagnostics, targetPrefix);
  validateProfileDiagnostics(value.diagnostics, diagnostics, targetPrefix);

  return diagnostics;
}

export function createHiaProfileSet(input: HiaProfileSetInput): HiaProfileSet {
  const profiles = new Map<string, HiaDocumentationProfile>();
  const diagnostics: HiaDiagnostic[] = [];

  for (const profile of input.profiles) {
    const profileDiagnostics = validateHiaProfile(profile);
    diagnostics.push(...profileDiagnostics);

    if (profile.profileId && profiles.has(profile.profileId)) {
      diagnostics.push(createProfileDiagnostic(
        "HIA_PROFILE_DUPLICATE_ID",
        `Duplicate documentation profile id: ${profile.profileId}.`,
        "error",
        profile.profileId
      ));
      continue;
    }

    if (profile.profileId) {
      profiles.set(profile.profileId, profile);
    }
  }

  for (const profile of profiles.values()) {
    for (const parentId of profile.extends) {
      if (!profiles.has(parentId)) {
        diagnostics.push(createProfileDiagnostic(
          "HIA_PROFILE_EXTENDS_UNKNOWN",
          `Documentation profile "${profile.profileId}" extends unknown profile "${parentId}".`,
          "error",
          profile.profileId,
          { profileId: profile.profileId, parentId }
        ));
      }
    }

    diagnostics.push(...validateProfileReferences(profile, profiles));
  }

  return {
    profiles,
    diagnostics
  };
}

export function hasProfileErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function getHiaProfile(profileSet: HiaProfileSet, profileId: string): HiaDocumentationProfile | undefined {
  return profileSet.profiles.get(profileId);
}

export function listHiaProfileIds(profileSet: HiaProfileSet): string[] {
  return [...profileSet.profiles.keys()].sort();
}

export function listHiaProfileTags(profileSet: HiaProfileSet, profileId: string, options: { includeInherited?: boolean } = {}): HiaProfileTagDefinition[] {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return [];
  }

  const tags = options.includeInherited
    ? collectInheritedTags(profile, profileSet.profiles)
    : [...profile.tags];

  return tags.sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveHiaProfileTag(profileSet: HiaProfileSet, query: HiaProfileTagQuery): HiaResolvedProfileTag | undefined {
  const profile = getHiaProfile(profileSet, query.profileId);
  if (!profile) {
    return undefined;
  }

  const tag = findTagInProfileTree(profile, profileSet.profiles, query.tagName);
  if (!tag) {
    return undefined;
  }

  const aliasChain: string[] = [];
  let resolvedTag = tag;
  const seen = new Set<string>();

  while (resolvedTag.aliasFor) {
    if (seen.has(resolvedTag.name)) {
      break;
    }

    seen.add(resolvedTag.name);
    aliasChain.push(resolvedTag.name);
    const next = findTagInProfileTree(profile, profileSet.profiles, resolvedTag.aliasFor);
    if (!next) {
      break;
    }
    resolvedTag = next;
  }

  if (!query.includeAliases && aliasChain.length > 0) {
    return undefined;
  }

  return {
    profile,
    tag,
    resolvedTag,
    aliasChain
  };
}

export function getHiaProfileRule(profileSet: HiaProfileSet, profileId: string, ruleId: string): HiaProfileRuleDefinition | undefined {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return undefined;
  }
  return collectInheritedRules(profile, profileSet.profiles).find((rule) => rule.ruleId === ruleId);
}

export function getHiaProfileDiagnostic(profileSet: HiaProfileSet, profileId: string, code: string): HiaProfileDiagnosticDefinition | undefined {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return undefined;
  }
  return collectInheritedDiagnostics(profile, profileSet.profiles).find((diagnostic) => diagnostic.code === code);
}

function validateProfileTags(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  const names = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `tags.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_TAG_INVALID", "Profile tag entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "name", diagnostics, target);
    validateRequiredEnum(item, "status", HIA_PROFILE_TAG_STATUSES, diagnostics, target);
    validateRequiredArray(item, "scope", diagnostics, target);
    validateRequiredArray(item, "targets", diagnostics, target);

    if (typeof item.name === "string") {
      if (names.has(item.name)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_TAG_DUPLICATE", `Duplicate profile tag: ${item.name}.`, "error", joinTarget(target, "name")));
      }
      names.add(item.name);
    }

    if (item.status === "alias" && typeof item.aliasFor !== "string") {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_ALIAS_TARGET_MISSING", `Alias tag "${String(item.name)}" must define aliasFor.`, "error", joinTarget(target, "aliasFor")));
    }
  });
}

function validateProfileRules(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  const ids = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `rules.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_INVALID", "Profile rule entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "ruleId", diagnostics, target);
    validateRequiredObject(item, "optionsSchema", diagnostics, target);
    validateRequiredObject(item, "messages", diagnostics, target);

    if (typeof item.ruleId === "string") {
      if (ids.has(item.ruleId)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_DUPLICATE", `Duplicate profile rule: ${item.ruleId}.`, "error", joinTarget(target, "ruleId")));
      }
      ids.add(item.ruleId);
    }

    if (isRecord(item.messages) && typeof item.messages.default !== "string") {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_MESSAGE_MISSING", `Rule "${String(item.ruleId)}" must define messages.default.`, "error", joinTarget(target, "messages.default")));
    }
  });
}

function validateProfileMappings(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `mappings.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_MAPPING_INVALID", "Profile mapping entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "from", diagnostics, target);
    validateRequiredString(item, "to", diagnostics, target);
  });
}

function validateProfileDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  const codes = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `diagnostics.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_DIAGNOSTIC_INVALID", "Profile diagnostic entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "code", diagnostics, target);
    validateRequiredString(item, "defaultMessage", diagnostics, target);
    validateRequiredEnum(item, "severity", HIA_PROFILE_DIAGNOSTIC_SEVERITIES, diagnostics, target);

    if (typeof item.code === "string") {
      if (codes.has(item.code)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_DIAGNOSTIC_DUPLICATE", `Duplicate profile diagnostic: ${item.code}.`, "error", joinTarget(target, "code")));
      }
      codes.add(item.code);
    }
  });
}

function validateProfileReferences(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  for (const tag of profile.tags) {
    if (tag.aliasFor && !findTagInProfileTree(profile, profiles, tag.aliasFor)) {
      diagnostics.push(createProfileDiagnostic(
        "HIA_PROFILE_ALIAS_TARGET_UNKNOWN",
        `Alias tag "${tag.name}" points to unknown tag "${tag.aliasFor}".`,
        "error",
        `${profile.profileId}.tags.${tag.name}`,
        { profileId: profile.profileId, tagName: tag.name, aliasFor: tag.aliasFor }
      ));
    }
  }

  for (const mapping of profile.mappings) {
    for (const code of mapping.diagnostics ?? []) {
      if (!findDiagnosticInProfileTree(profile, profiles, code)) {
        diagnostics.push(createProfileDiagnostic(
          "HIA_PROFILE_MAPPING_DIAGNOSTIC_UNKNOWN",
          `Profile mapping references unknown diagnostic "${code}".`,
          "warning",
          `${profile.profileId}.mappings.${mapping.from}`,
          { profileId: profile.profileId, diagnosticCode: code }
        ));
      }
    }
  }

  return diagnostics;
}

function collectInheritedTags(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, seen = new Set<string>()): HiaProfileTagDefinition[] {
  if (seen.has(profile.profileId)) {
    return [];
  }

  seen.add(profile.profileId);
  const tags: HiaProfileTagDefinition[] = [];

  for (const parentId of profile.extends) {
    const parent = profiles.get(parentId);
    if (parent) {
      tags.push(...collectInheritedTags(parent, profiles, seen));
    }
  }

  tags.push(...profile.tags);
  return dedupeByName(tags);
}

function collectInheritedRules(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, seen = new Set<string>()): HiaProfileRuleDefinition[] {
  if (seen.has(profile.profileId)) {
    return [];
  }

  seen.add(profile.profileId);
  const rules: HiaProfileRuleDefinition[] = [];

  for (const parentId of profile.extends) {
    const parent = profiles.get(parentId);
    if (parent) {
      rules.push(...collectInheritedRules(parent, profiles, seen));
    }
  }

  rules.push(...profile.rules);
  return dedupeById(rules, "ruleId");
}

function collectInheritedDiagnostics(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, seen = new Set<string>()): HiaProfileDiagnosticDefinition[] {
  if (seen.has(profile.profileId)) {
    return [];
  }

  seen.add(profile.profileId);
  const diagnostics: HiaProfileDiagnosticDefinition[] = [];

  for (const parentId of profile.extends) {
    const parent = profiles.get(parentId);
    if (parent) {
      diagnostics.push(...collectInheritedDiagnostics(parent, profiles, seen));
    }
  }

  diagnostics.push(...profile.diagnostics);
  return dedupeById(diagnostics, "code");
}

function findTagInProfileTree(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, tagName: string, seen = new Set<string>()): HiaProfileTagDefinition | undefined {
  if (seen.has(profile.profileId)) {
    return undefined;
  }

  seen.add(profile.profileId);
  const local = profile.tags.find((tag) => tag.name === tagName);
  if (local) {
    return local;
  }

  for (const parentId of profile.extends) {
    const parent = profiles.get(parentId);
    const found = parent ? findTagInProfileTree(parent, profiles, tagName, seen) : undefined;
    if (found) {
      return found;
    }
  }

  return undefined;
}

function findDiagnosticInProfileTree(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, code: string): HiaProfileDiagnosticDefinition | undefined {
  return collectInheritedDiagnostics(profile, profiles).find((diagnostic) => diagnostic.code === code);
}

function validateRequiredString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = record[field];
  if (typeof value !== "string" || value.length === 0) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

function validateRequiredArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = record[field];
  if (!Array.isArray(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
  }
}

function validateRequiredObject(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = record[field];
  if (!isRecord(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be an object.`, "error", targetPath));
  }
}

function validateRequiredEnum(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix?: string
): void {
  const value = record[field];
  if (typeof value !== "string" || !allowed.includes(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be one of: ${allowed.join(", ")}.`, "error", targetPath));
  }
}

function createProfileDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function createEmptyInvalidProfile(): HiaDocumentationProfile {
  return {
    schemaVersion: "",
    profileId: "",
    profileVersion: "",
    displayName: "",
    layer: "stable",
    extends: [],
    contracts: [],
    targets: [],
    tags: [],
    rules: [],
    mappings: [],
    diagnostics: [],
    capabilities: {}
  };
}

function joinTarget(prefix: string | undefined, field: string): string {
  return prefix ? `${prefix}.${field}` : field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const result = new Map<string, T>();
  for (const item of items) {
    result.set(item.name, item);
  }
  return [...result.values()];
}

function dedupeById<T extends Record<K, string>, K extends keyof T>(items: T[], key: K): T[] {
  const result = new Map<string, T>();
  for (const item of items) {
    result.set(item[key], item);
  }
  return [...result.values()];
}
