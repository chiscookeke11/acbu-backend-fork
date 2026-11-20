#!/usr/bin/env node
'use strict';

/**
 * Enforces the repository policy for the generated contracts build script.
 *
 * Legacy path contracts/build must not be committed. If the reviewed,
 * minimal replacement exists at contracts/scripts/build.sh, it must stay
 * below the configured size limit and have a matching SHA-256 sidecar.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const LEGACY = 'contracts/build';
const SCRIPT = 'contracts/scripts/build.sh';
const CHECKSUM = 'contracts/scripts/build.sh.sha256';
const MAX_BYTES = Number.parseInt(process.env.CONTRACT_BUILD_MAX_BYTES || '262144', 10);

function fail(message) {
  console.error(`[contract-build-hygiene] ERROR: ${message}`);
  process.exitCode = 1;
}

function isTracked(file) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', file], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
}

if (!Number.isSafeInteger(MAX_BYTES) || MAX_BYTES < 1) {
  fail('CONTRACT_BUILD_MAX_BYTES must be a positive integer.');
  process.exit();
}

const legacyPath = path.join(ROOT, LEGACY);
if (fs.existsSync(legacyPath) || isTracked(LEGACY)) {
  fail(`${LEGACY} is prohibited. Review its contents and move only the minimal, verified build logic to ${SCRIPT}; do not blindly rename an untrusted artifact.`);
}

const scriptPath = path.join(ROOT, SCRIPT);
const checksumPath = path.join(ROOT, CHECKSUM);
if (fs.existsSync(scriptPath)) {
  const stat = fs.statSync(scriptPath);
  if (!stat.isFile()) {
    fail(`${SCRIPT} must be a regular file.`);
  } else {
    if (stat.size > MAX_BYTES) {
      fail(`${SCRIPT} is ${stat.size} bytes; the limit is ${MAX_BYTES} bytes.`);
    }

    if (!fs.existsSync(checksumPath)) {
      fail(`Missing SHA-256 sidecar: ${CHECKSUM}.`);
    } else {
      const expected = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0].toLowerCase();
      const actual = sha256(SCRIPT);
      if (!/^[a-f0-9]{64}$/.test(expected)) {
        fail(`${CHECKSUM} must begin with a 64-character hexadecimal SHA-256 digest.`);
      } else if (expected !== actual) {
        fail(`SHA-256 mismatch for ${SCRIPT}; expected ${expected}, got ${actual}.`);
      } else {
        console.log(`[contract-build-hygiene] SHA-256 verified for ${SCRIPT}.`);
      }
    }
  }
} else if (fs.existsSync(checksumPath)) {
  fail(`${CHECKSUM} exists but ${SCRIPT} is missing.`);
}

if (process.exitCode) {
  console.error('[contract-build-hygiene] Review and verify the build script before committing it.');
} else {
  console.log('[contract-build-hygiene] No legacy contracts/build artifact detected; build-script policy passed.');
}
