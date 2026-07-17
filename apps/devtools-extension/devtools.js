(function registerHiaDevToolsPanel() {
  const PANEL_NAME = "HIA";
  const PANEL_PAGE = "panel.html";

  chrome.devtools.panels.create(PANEL_NAME, "", PANEL_PAGE, (panel) => {
    panel.onShown.addListener((panelWindow) => {
      panelWindow.postMessage({
        inspectedTabId: chrome.devtools.inspectedWindow.tabId,
        source: "hia-devtools-page",
        type: "hia.devtools.ready"
      }, "*");
    });
  });
}());
