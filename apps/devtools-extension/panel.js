import {
  createHiaDevToolsInspectedWindowBridgeExpression,
  createHiaDevToolsOpenRequestMessage,
  createHiaDevToolsPanelViewModel,
  getHiaDevToolsReviewDetail,
  getHiaDevToolsRelationDetail
} from "./panel-core.js";

const state = {
  model: createHiaDevToolsPanelViewModel(undefined),
  selectedRelationId: "",
  selectedReviewItemId: "",
  selectedView: "relations"
};

const elements = {
  detail: document.querySelector("[data-hia-detail]"),
  fileInput: document.querySelector("[data-hia-payload-file]"),
  list: document.querySelector("[data-hia-list]"),
  openLog: document.querySelector("[data-hia-open-log]"),
  summary: document.querySelector("[data-hia-summary]"),
  viewTabs: Array.from(document.querySelectorAll("[data-hia-view-tab]"))
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
    state.selectedReviewItemId = state.model.review.items[0]?.id ?? "";
    state.selectedView = state.model.relations.length === 0 && state.model.review.items.length > 0 ? "review" : state.selectedView;
    render();
  } catch (error) {
    renderOpenLog(`Payload parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function render() {
  renderSummary();
  renderTabs();
  renderNavigation();
  renderDetail();
}

function renderSummary() {
  const metrics = [
    ["Entries", state.model.summary.entryCount],
    ["Relations", state.model.summary.relationCount],
    ["Review", state.model.review.summary.itemCount],
    ["Drafts", state.model.review.draftCount],
    ["Apply Inputs", state.model.review.applyPreview.hostCheckPreflightCount]
  ];

  elements.summary.replaceChildren(...metrics.map(([label, value]) => {
    const metric = document.createElement("div");
    metric.className = "metric";
    metric.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong>`;
    return metric;
  }));
}

function renderTabs() {
  for (const tab of elements.viewTabs) {
    const view = tab.getAttribute("data-hia-view-tab") || "relations";
    tab.setAttribute("aria-selected", String(view === state.selectedView));
    tab.onclick = () => {
      state.selectedView = view;
      render();
    };
  }
}

function renderNavigation() {
  if (state.selectedView === "review") {
    renderReviewItems();
    return;
  }

  renderRelations();
}

function renderRelations() {
  if (state.model.relations.length === 0) {
    elements.list.replaceChildren(emptyElement("No relations loaded."));
    return;
  }

  elements.list.replaceChildren(...state.model.relations.map((relation) => {
    const button = document.createElement("button");
    button.className = "list-button";
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

function renderReviewItems() {
  if (state.model.review.items.length === 0) {
    elements.list.replaceChildren(emptyElement("No review items loaded."));
    return;
  }

  elements.list.replaceChildren(...state.model.review.items.map((item) => {
    const button = document.createElement("button");
    button.className = "list-button";
    button.type = "button";
    button.setAttribute("aria-selected", String(item.id === state.selectedReviewItemId));
    button.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.kind)} · ${escapeHtml(item.status)} · ${escapeHtml(item.riskLevel)}</span>`;
    button.addEventListener("click", () => {
      state.selectedReviewItemId = item.id;
      render();
    });
    return button;
  }));
}

function renderDetail() {
  if (state.selectedView === "review") {
    renderReviewDetail();
    return;
  }

  renderRelationDetail();
}

function renderRelationDetail() {
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

function renderReviewDetail() {
  const item = getHiaDevToolsReviewDetail(state.model, state.selectedReviewItemId);

  if (!item) {
    elements.detail.replaceChildren(emptyElement("Select a review item."));
    return;
  }

  const article = document.createElement("section");
  const actions = document.createElement("div");
  const preview = document.createElement("pre");

  actions.className = "open-list";
  actions.replaceChildren(
    createReviewActionButton("Copy draft", item.draftText, "draft"),
    createReviewActionButton("Copy proposal id", item.proposalId, "proposal id")
  );
  preview.className = "candidate-preview";
  preview.textContent = formatReviewCandidatePreview(item);

  article.innerHTML = `
    <h2>${escapeHtml(item.title)}</h2>
    <dl class="kv">
      <dt>Kind</dt><dd>${escapeHtml(item.kind)}</dd>
      <dt>Status</dt><dd>${escapeHtml(item.status)}</dd>
      <dt>Risk</dt><dd>${escapeHtml(item.riskLevel)}</dd>
      <dt>Target</dt><dd>${escapeHtml(item.targetLabel)}</dd>
      <dt>Proposal</dt><dd>${escapeHtml(item.proposalId)}</dd>
      <dt>Quality</dt><dd>${escapeHtml(`pass:${item.quality.pass} warning:${item.quality.warning} blocked:${item.quality.blocked}`)}</dd>
      <dt>Candidate</dt><dd>${escapeHtml(`${item.editCandidate.status} / ${item.editCandidate.kind}`)}</dd>
      <dt>Diff</dt><dd>${escapeHtml(`${item.editCandidate.diffPreview.status} / ${item.editCandidate.diffPreview.targetKind} / operations:${item.editCandidate.diffPreview.operationCount}`)}</dd>
      <dt>Preflight</dt><dd>${escapeHtml(`${item.editCandidate.applyPreflight.status} / conflict:${item.editCandidate.applyPreflight.conflictStatus}`)}</dd>
      <dt>Apply</dt><dd>disabled</dd>
    </dl>
  `;
  article.append(actions, preview);
  elements.detail.replaceChildren(article);
}

function formatReviewCandidatePreview(item) {
  const lines = [
    item.editCandidate.previewText || item.draftText || "Preview text unavailable.",
    "",
    `Diff preview: ${item.editCandidate.diffPreview.status} / ${item.editCandidate.diffPreview.targetKind}`,
    `Executable: ${item.editCandidate.diffPreview.executable ? "yes" : "no"}`,
    `Requires file read: ${item.editCandidate.diffPreview.requiresFileRead ? "yes" : "no"}`,
    `Requires conflict check: ${item.editCandidate.diffPreview.requiresConflictCheck ? "yes" : "no"}`,
    `Apply preflight: ${item.editCandidate.applyPreflight.status}`,
    `Preflight target files: ${item.editCandidate.applyPreflight.targetFileCount}`,
    `Preflight rollback: ${item.editCandidate.applyPreflight.rollbackStrategy}${item.editCandidate.applyPreflight.rollbackRecordRequired ? " (record required)" : ""}`
  ];

  for (const operation of item.editCandidate.diffPreview.operations) {
    lines.push(`Operation: ${operation.op}`);
    lines.push(`Target: ${operation.path || "not included"} ${operation.pointer || ""}`.trim());
  }

  return lines.join("\n");
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

function createReviewActionButton(label, value, kind) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.disabled = typeof value !== "string" || value.length === 0;
  button.addEventListener("click", async () => {
    if (typeof value !== "string" || value.length === 0) {
      renderOpenLog(`Review ${kind} unavailable.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      renderOpenLog(`Review ${kind} copied.`);
    } catch {
      renderOpenLog(`Review ${kind}: ${value}`);
    }
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
