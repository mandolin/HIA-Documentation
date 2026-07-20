# HIA Documentation DevTools

Local unpacked Chrome DevTools panel shell for HIA `browser-panel-payload.json` files.

## Usage

1. Build or generate a HIA browser panel payload with `hia browser panel`.
2. Open `chrome://extensions`, enable developer mode, and load this directory as an unpacked extension.
3. Open DevTools and select the **HIA** panel.
4. Load a `browser-panel-payload.json` file.

The panel renders relation graph summaries, read-only documentation review items, and structured `hia.browserPanel.openRequest` messages for later host integration. It does not run producers, scan source files, parse generated HTML, or write target files.

## Bridge Candidate

When a relation open-request button is clicked, the panel emits the local `hia.browserPanel.openRequest` window message and then tries a zero-permission inspected-page bridge through `chrome.devtools.inspectedWindow.eval`. The inspected page receives a `hia:devtools-open-request` `CustomEvent` whose `detail` contains the `hia-devtools-open-request-bridge@0.1.0-draft` envelope.

The first bridge slice does not install a content script, request host permissions, read private source files, or trust data returned from the inspected page.

## Review Surface

The panel can consume a direct `hia-documentation-review-payload`, an AI authoring evidence file with `result.reviewPayload`, or a browser panel payload with `reviewPayload`. Review items show risk, quality counts, draft text, and edit candidate preview metadata. Apply remains disabled until a later human-approved apply contract is implemented.
