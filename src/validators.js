'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const TRAITS = ['strategy', 'creativity', 'speed', 'social'];
const COLORS = ['#ef476f', '#ffb703', '#06d6a0', '#118ab2', '#9b5de5', '#f77f00', '#2ec4b6', '#e76f51', '#4cc9f0', '#80b918'];

function cleanName(raw, label, max = 30) {
  const v = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (v.length < 2) throw new HttpError(400, `${label}: minim 2 caractere`);
  if (v.length > max) throw new HttpError(400, `${label}: maxim ${max} caractere`);
  return v;
}

function intIn(raw, lo, hi, label) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new HttpError(400, `${label} trebuie să fie între ${lo} și ${hi}`);
  return n;
}

function cleanColor(raw) {
  const v = String(raw ?? '');
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : COLORS[0];
}

function idList(raw, label) {
  if (!Array.isArray(raw)) throw new HttpError(400, `${label}: listă invalidă`);
  const ids = [...new Set(raw.map(Number))];
  if (ids.some((x) => !Number.isInteger(x) || x < 1)) throw new HttpError(400, `${label}: identificatori invalizi`);
  return ids;
}

module.exports = { HttpError, TRAITS, COLORS, cleanName, intIn, cleanColor, idList };
