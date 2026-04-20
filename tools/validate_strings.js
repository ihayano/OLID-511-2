#!/usr/bin/env node
/* eslint-disable no-console */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STRINGS_PATH = path.join(ROOT, "content", "strings.json");
const SCRIPT_PATH = path.join(ROOT, "script.js");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function flatten(obj, prefix, out) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, next, out);
    } else {
      out.add(next);
      if (Array.isArray(value)) {
        value.forEach((_, idx) => out.add(`${next}.${idx}`));
      }
    }
  }
  return out;
}

function loadStringKeys() {
  let raw;
  try {
    raw = fs.readFileSync(STRINGS_PATH, "utf8");
  } catch (err) {
    die(`Could not read ${STRINGS_PATH}: ${err.message}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    die(`Invalid JSON in ${STRINGS_PATH}: ${err.message}`);
  }
  return flatten(data, "", new Set());
}

function loadScript() {
  try {
    return fs.readFileSync(SCRIPT_PATH, "utf8");
  } catch (err) {
    die(`Could not read ${SCRIPT_PATH}: ${err.message}`);
  }
  return "";
}

function collectTCalls(source) {
  const calls = [];
  const re = /\bt\(\s*(["'])([^"'\n]+)\1/g;
  let match;
  while ((match = re.exec(source))) {
    calls.push({ key: match[2], index: match.index });
  }
  return calls;
}

function lineColOf(source, index) {
  const before = source.slice(0, index);
  const line = before.split(/\n/).length;
  const lastNl = before.lastIndexOf("\n");
  const col = index - (lastNl + 1) + 1;
  return { line, col };
}

const NARRATION_HELPERS = [
  "typeLine",
  "typeBlock",
  "promptChoice",
  "setLocation",
  "addNode",
];

const STATUS_CODE_ALLOWLIST = new Set([
  "pending",
  "deployed",
  "weak",
  "skipped",
  "failed",
  "unknown",
]);

function checkHardcodedNarration(source) {
  const issues = [];
  const lines = source.split(/\n/);
  const helperRe = new RegExp(`\\b(${NARRATION_HELPERS.join("|")})\\s*\\(`);
  const literalRe = /"((?:[^"\\]|\\.){2,})"|'((?:[^'\\]|\\.){2,})'/g;

  lines.forEach((line, idx) => {
    if (!helperRe.test(line)) return;
    const lineNo = idx + 1;
    const stripped = line
      .replace(/\bt\(\s*(["'])[^"'\n]+\1\s*(?:,[^)]*)?\)/g, "t(_)")
      .replace(/\bt\(\s*`[^`\n]+`\s*(?:,[^)]*)?\)/g, "t(_)");
    literalRe.lastIndex = 0;
    let m;
    while ((m = literalRe.exec(stripped))) {
      const raw = m[1] || m[2];
      if (!raw) continue;
      if (STATUS_CODE_ALLOWLIST.has(raw)) continue;
      if (/^(system|success|warn|alert|prompt)$/.test(raw)) continue;
      if (/^\s*$/.test(raw)) continue;
      if (/^[a-z_]+$/.test(raw) && raw.length <= 24) continue;
      issues.push({
        line: lineNo,
        col: m.index + 1,
        text: raw.length > 80 ? `${raw.slice(0, 77)}...` : raw,
      });
    }
  });
  return issues;
}

function main() {
  const keys = loadStringKeys();
  const source = loadScript();
  const calls = collectTCalls(source);

  const missing = [];
  for (const { key, index } of calls) {
    if (!keys.has(key)) {
      missing.push({ key, ...lineColOf(source, index) });
    }
  }

  const narrationIssues = checkHardcodedNarration(source);

  let hadErrors = false;

  console.log(`Loaded ${keys.size} string keys from content/strings.json`);
  console.log(`Found ${calls.length} t(...) call sites in script.js`);

  if (missing.length) {
    hadErrors = true;
    console.error(`\nMissing string keys (${missing.length}):`);
    for (const m of missing) {
      console.error(`  script.js:${m.line}:${m.col}  t("${m.key}")`);
    }
  } else {
    console.log("All t(...) keys resolve.");
  }

  if (narrationIssues.length) {
    hadErrors = true;
    console.error(
      `\nPossible hardcoded narration strings in narration helpers ` +
        `(${narrationIssues.length}):`
    );
    for (const issue of narrationIssues) {
      console.error(`  script.js:${issue.line}:${issue.col}  "${issue.text}"`);
    }
    console.error(
      "\nIf a flagged string is intentional (control-flow value, CSS class, etc.), " +
        "extend the allowlist in tools/validate_strings.js."
    );
  } else {
    console.log("No suspicious hardcoded narration detected.");
  }

  if (hadErrors) {
    process.exit(1);
  }
}

main();
