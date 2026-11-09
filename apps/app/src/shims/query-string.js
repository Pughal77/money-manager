"use strict";

function parse(input) {
  const result = Object.create(null);
  if (typeof input !== "string") return result;
  const trimmed = input.trim().replace(/^[?#&]/, "");
  if (!trimmed) return result;

  const params = new URLSearchParams(trimmed);
  for (const key of params.keys()) {
    const all = params.getAll(key);
    result[key] = all.length > 1 ? all : all[0];
  }
  return result;
}

function stringify(object, options) {
  if (!object || typeof object !== "object") return "";
  const keys = Object.keys(object);
  if (!options || options.sort !== false) {
    keys.sort();
  }
  const parts = [];
  for (const key of keys) {
    const value = object[key];
    if (value === undefined) continue;
    if (value === null) {
      parts.push(encodeURIComponent(key));
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined) continue;
        if (item === null) {
          parts.push(encodeURIComponent(key));
        } else {
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
          );
        }
      }
      continue;
    }
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  }
  return parts.join("&");
}

module.exports = {
  parse,
  stringify,
  default: { parse, stringify },
};
