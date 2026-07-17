# HIA Documentation DevTools

Local unpacked Chrome DevTools panel shell for HIA `browser-panel-payload.json` files.

## Usage

1. Build or generate a HIA browser panel payload with `hia browser panel`.
2. Open `chrome://extensions`, enable developer mode, and load this directory as an unpacked extension.
3. Open DevTools and select the **HIA** panel.
4. Load a `browser-panel-payload.json` file.

The panel renders relation graph summaries and emits structured `hia.browserPanel.openRequest` messages for later host integration. It does not run producers, scan source files, or parse generated HTML.
