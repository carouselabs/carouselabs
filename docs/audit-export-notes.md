# PNG export responsiveness hardening - 2026-10-01

- Baseline supplied by the root audit: production public tap/hold tool, PNG fixture public/images/msedge_GxpOUT38VY.png, feedback 41.8 ms, completion 1083.1 ms, maximum observed main-thread event-loop gap 1038.8 ms (audit-artifacts/before-export-interaction.json). This is a local interaction measurement, not field INP.
- Moved the existing UPNG 256-color PNG quantization/encoding into a native bundled module Worker. Pixel composition and canvas reads remain on the main thread; the expensive encoder no longer runs there. RGBA input and PNG output ArrayBuffers are transferred, avoiding an extra full-buffer structured clone.
- Worker success, encode error, startup/transfer error, deserialization error, cancellation, and a 30-second timeout all terminate the worker and release listeners/timers. Errors remain visible to the existing export UI; there is no silent format, quality, or main-thread fallback.
- exportTapHoldImage accepts an optional sixth AbortSignal. It rejects already-canceled work and checks cancellation again before downloading PNG or WebP. The parent canvas controller owns cancellation on replacement/unmount. WebP native toBlob cannot be forcibly canceled, but a canceled export cannot download afterward.
- Preserved PNG dimensions and UPNG.encode(..., 256) semantics. The regression fixture compares exact encoded bytes to the previous algorithm and verifies decoded dimensions/alpha. The existing PNG-8 quantization may alter colors; this change does not introduce additional quantization.

Files: components/tools/ExportEngine.ts, components/tools/pngEncoder.ts, components/tools/pngEncoder.worker.ts, tests/png-encoder.test.ts, tests/png-encoder-worker.test.ts.

Verification on Windows / Node 24.16.0:

- npx vitest run tests/png-encoder.test.ts tests/png-encoder-worker.test.ts: PASS, 2 files / 12 tests.
- npx eslint components/tools/ExportEngine.ts components/tools/pngEncoder.ts components/tools/pngEncoder.worker.ts tests/png-encoder.test.ts tests/png-encoder-worker.test.ts: PASS, no errors or warnings.
- npm run typecheck: PASS.
- Production bundling, actual worker loading, downloadable PNG validation, and comparable after-interaction measurements are covered by the root audit's final browser/build pass; do not infer those outcomes from unit tests.

No new dependencies, database changes, production actions, or external calls. Rollback is a code-only rollback to the earlier export implementation. Output pixel count still scales with source aspect ratio; general decoded pixel/aspect-ratio resource limits remain follow-up work.
