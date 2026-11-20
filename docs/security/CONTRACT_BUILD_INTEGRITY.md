# Contracts Build Script Integrity Policy (W11-INC-009)

## Current repository state

At the time this policy was added, the `dev` branch of this fork contains no `contracts/` directory and no tracked `contracts/build` artifact. Consequently, this change does not fabricate a replacement build script or claim to have audited a 3.9 MB upstream artifact that is not present in this checkout.

## Required layout

If contract build logic is needed in this repository, keep only the minimal, human-reviewable shell script at:

```text
contracts/scripts/build.sh
contracts/scripts/build.sh.sha256
```

Do not commit generated WASM, binary output, bundled dependencies, opaque payloads, or a large generated executable at `contracts/build`.

Before introducing a build script:

1. Inspect the complete source and history from a trusted checkout.
2. Confirm the script is text, explain every command, and remove unnecessary logic.
3. Review every external download and pin dependencies or tool versions.
4. Keep the script at or below 256 KiB unless maintainers explicitly review and change the CI threshold.
5. Generate the SHA-256 sidecar from the exact reviewed script bytes:

   ```bash
   sha256sum contracts/scripts/build.sh > contracts/scripts/build.sh.sha256
   ```

6. Commit the script and checksum together. Regenerate the checksum whenever the script changes.

## CI enforcement

`scripts/ci/check-contract-build-hygiene.js` rejects the legacy `contracts/build` path, enforces the size limit on the replacement, and verifies its SHA-256 sidecar. The check runs in CI on pushes and pull requests.

The checksum establishes integrity relative to the committed sidecar; it does not establish that a script is safe. Code review and trusted provenance remain mandatory.
