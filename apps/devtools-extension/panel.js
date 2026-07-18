import {
  createHiaDevToolsInspectedWindowBridgeExpression,
  createHiaDevToolsOpenRequestMessage,
  createHiaDevToolsPanelViewModel,
  getHiaDevToolsRelationDetail
} from "./panel-core.js";

const state = {
  model: createHiaDevToolsPanelViewModel(undefined),
  selectedRelationId: ""
};

const elements = {
  detail: document.querySelector("[data-hia-detail]"),
  fileInput: document.querySelector("[data-hia-payload-file]"),
  openLog: document.querySelector("[data-hia-open-log]"),
  relationList: document.querySelector("[data-hia-relation-list]"),
  summary: document.querySelector("[data-hia-summary]")
};

elements.fileInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  await loadPayloadText(await file.text());
});

window.addEventListener("message", (event) => {
  if (event.data?.source === "hia-devtools-page" && event.data?.type === "hia.devtools.ready") {
    renderOpenLog(`DevTools tab ${event.data.inspectedTabId ?? "unknown"} ready.`);
  }
});

await loadDefaultPayload();
render();

async function loadDefaultPayload() {
  try {
    const response = await fetch("./browser-panel-payload.json", {
      cache: "no-store"
    });

    if (response.ok) {
      await loadPayloadText(await response.text());
    }
  } catch {
    renderOpenLog("Load a browser-panel-payload.json file.");
  }
}

async function loadPayloadText(text) {
  try {
    const payload = JSON.parse(text);
    state.model = createHiaDevToolsPanelViewModel(payload);
    state.selectedRelationId = state.model.relations[0]?.id ?? "";
    render();
  } catch (error) {
    renderOpenLog(`Payload parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function render() {
  renderSummary();
  renderRelations();
  renderDetail();
}

function renderSummary() {
  const metrics = [
    ["Entries", state.model.summary.entryCount],
    ["Linked", state.model.summary.linkedEntryCount],
    ["Relations", state.model.summary.relationCount],
    ["Nodes", state.model.summary.relationNodeCount]
  ];

  elements.summary.replaceChildren(...metrics.map(([label, value]) => {
    const metric = document.createElement("div");
    metric.className = "metric";
    metric.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong>`;
    return metric;
  }));
}

function renderRelations() {
  if (state.model.relations.length === 0) {
    elements.relationList.replaceChildren(emptyElement("No relations loaded."));
    return;
  }

  elements.relationList.replaceChildren(...state.model.relations.map((relation) => {
    const button = document.createElement("button");
    button.className = "relation-button";
    button.type = "button";
    button.setAttribute("aria-selected", String(relation.id === state.selectedRelationId));
    button.innerHTML = `<strong>${escapeHtml(relation.label)}</strong><span>${escapeHtml(relation.kind)}</span>`;
    button.addEventListener("click", () => {
      state.selectedRelationId = relation.id;
      render();
    });
    return button;
  }));
}

function renderDetail() {
  const detail = getHiaDevToolsRelationDetail(state.model, state.selectedRelationId);

  if (!detail) {
    elements.detail.replaceChildren(emptyElement("Select a relation."));
    return;
  }

  const article = document.createElement("section");
  const requestButtons = detail.openRequests.length > 0
    ? detail.openRequests.map((request, index) => createOpenRequestButton(request, detail.relation.id, index))
    : [emptyElement("No open requests.")];

  article.innerHTML = `
    <h2>${escapeHtml(detail.relation.label)}</h2>
    <dl class="kv">
      <dt>Kind</dt><dd>${escapeHtml(detail.relation.kind)}</dd>
      <dt>From</dt><dd>${escapeHtml(detail.fromLabel)}</dd>
      <dt>To</dt><dd>${escapeHtml(detail.toLabel)}</dd>
      <dt>ID</dt><dd>${escapeHtml(detail.relation.id)}</dd>
    </dl>
  `;

  const openList = document.createElement("div");
  openList.className = "open-list";
  openList.replaceChildren(...requestButtons);
  article.append(openList);
  elements.detail.replaceChildren(article);
}

function createOpenRequestButton(request, relationId, index) {
  const button = document.createElement("button");
  const requestType = typeof request?.type === "string" ? request.type : `request-${index + 1}`;

  button.type = "button";
  button.textContent = requestType;
  button.addEventListener("click", () => {
    const message = createHiaDevToolsOpenRequestMessage(request, {
      relationId
    });

    window.postMessage(message, window.location.origin);
    renderOpenLog(`${message.type}: ${requestType}; local message emitted.`);
    dispatchOpenRequestToInspectedWindow(message, requestType);
  });
  return button;
}

function dispatchOpenRequestToInspectedWindow(message, requestType) {
  const inspectedWindow = globalThis.chrome?.devtools?.inspectedWindow;

  if (!inspectedWindow?.eval) {
    renderOpenLog(`${message.type}: ${requestType}; inspectedWindow bridge unavailable.`);
    return;
  }

  inspectedWindow.eval(createHiaDevToolsInspectedWindowBridgeExpression(message), (result, exceptionInfo) => {
    if (exceptionInfo?.isException || exceptionInfo?.isError) {
      renderOpenLog(`${message.type}: ${requestType}; inspectedWindow bridge failed: ${formatBridgeException(exceptionInfo)}`);
      return;
    }

    const status = typeof result?.status === "string" ? result.status : "dispatched";
    renderOpenLog(`${message.type}: ${requestType}; inspectedWindow bridge ${status}.`);
  });
}

function renderOpenLog(message) {
  elements.openLog.textContent = message;
}

function emptyElement(message) {
  const element = document.createElement("p");

  element.className = "empty";
  element.textContent = message;
  return element;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatBridgeException(exceptionInfo) {
  if (typeof exceptionInfo?.description === "string" && exceptionInfo.description.length > 0) {
    return exceptionInfo.description;
  }

  if (typeof exceptionInfo?.value === "string" && exceptionInfo.value.length > 0) {
    return exceptionInfo.value;
  }

  return "unknown bridge error";
}
