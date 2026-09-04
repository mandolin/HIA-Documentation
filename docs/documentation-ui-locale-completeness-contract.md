# Documentation UI Locale Completeness Contract

`documentation-ui-locale-completeness@0.1.0-draft` is a renderer-neutral contract and gate for documentation UI chrome.
It is owned by `@hia-doc/core` and distributed as a Draft 2020-12 JSON Schema by `@hia-doc/schemas`.

## Separate Locale Scopes

`contentLocales` describe documentation content. `uiLocales` describe the interface language that must pass the gate. A
surface declares its content locale, while the evaluator independently expands every surface, required execution mode, and
UI locale. UI selection is caller-explicit: the contract never infers it from content, the operating system, browser state,
environment variables, files, or the network.

Language tags use a bounded BCP-47-shaped profile and compare case-insensitively. The first explicit spelling is retained in
the report. This draft does not claim CLDR locale matching conformance.

## Stable Messages And Placeholders

Each UI string has a stable, non-localized `messageId` and an exact placeholder-name set. Bundles supply public plain text in
memory. The evaluator recognizes only non-executable `{name}` placeholders and requires exact set parity in every locale.
Translation text is deliberately absent from the wire report; only bundle identity, locale, message identity, resolution, and
placeholder status are serialized.

## Surfaces, Modes, And Accessibility

Every surface is evaluated in both `interactive` and `no-script` modes. Requirements bind a stable message to a surface,
mode, state, and one of these channels:

- `visible-text`;
- `accessible-name`;
- `status-message` when the surface exposes status updates.

Every mode must cover visible text and accessible names. Each UI locale also declares a programmatic document language and
language-of-parts set whose union covers both the content and UI locales. These are owner declarations, not proof of actual
DOM attributes or accessibility-tree behavior; renderer adoption must verify that mapping separately.

## Fallback And Completeness

Fallback is explicit, ordered, bundle-backed, and acyclic. Resolution records `exact`, `declared-fallback`, or `missing`.
Required-message completeness in this draft is stricter than ordinary resource fallback: only `exact` counts as covered.
A fallback hit remains observable but makes the report incomplete. This prevents a language switch with residual default-
language chrome from passing the gate.

## Privacy, Validation, And Compatibility

The report contains no message text, content/source body, absolute path, credential, personal identity, private message, or
runtime-environment data. Markup-like bundle text is refused; renderers must not treat translations as executable HTML.
Diagnostics use stable codes and structural paths without echoing source text.

`evaluateDocumentationUiLocaleCompleteness()` is pure and returns a deeply frozen complete/incomplete report or a public-safe
refusal. `validateDocumentationUiLocaleCompletenessReport()` validates closed-world shape, references, the full
surface × mode × UI-locale matrix, counts, privacy, and compatibility. Draft consumers must match contract and version
exactly; unknown properties and channels are rejected, and migrations must be explicit pure operations.

