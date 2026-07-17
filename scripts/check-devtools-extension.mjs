import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(rootDir, "apps", "devtools-extension");
const evidencePath = path.join(rootDir, "dist", "devtools-extension-check.json");

const {
  HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE,
  createHiaDevToolsOpenRequestMessage,
  createHiaDevToolsPanelViewModel,
  getHiaDevToolsRelationDetail
} = await import(pathToFileURL(path.join(extensionRoot, "panel-core.js")).href);

await main();

/**
 * 校验 HIA DevTools unpacked extension shell 的静态 manifest 和 payload view model。
 * Validate the HIA DevTools unpacked extension shell manifest and payload view model.
 */
async function main() {
  const manifest = JSON.parse(await readFile(path.join(extensionRoot, "manifest.json"), "utf8"));
  const devtoolsHtml = await readFile(path.join(extensionRoot, "devtools.html"), "utf8");
  const panelHtml = await readFile(path.join(extensionRoot, "panel.html"), "utf8");
  const panel = createHiaDevToolsPanelViewModel(createFixturePayload());
  const detail = getHiaDevToolsRelationDetail(panel, "documents-source:entry:api->source:src/api.ts");
  const message = createHiaDevToolsOpenRequestMessage(detail?.openRequests[0], {
    relationId: detail?.relation.id
  });

  assert.equal(manifest.manifest_version, 3, "DevTools extension must use Manifest V3.");
  assert.equal(manifest.devtools_page, "devtools.html", "Manifest must declare a local devtools_page.");
  assert.deepEqual(manifest.permissions, [], "DevTools shell must not request permissions in the first slice.");
  assert.deepEqual(manifest.host_permissions, [], "DevTools shell must not request host permissions in the first slice.");
  assert.match(devtoolsHtml, /<script src="\.\/devtools\.js"><\/script>/u, "DevTools page must load a local script.");
  assert.match(panelHtml, /<script type="module" src="\.\/panel\.js"><\/script>/u, "Panel page must load a local module script.");
  assert.equal(panel.summary.entryCount, 1, "Fixture entry count must be preserved.");
  assert.equal(panel.summary.relationCount, 1, "Fixture relation count must be preserved.");
  assert.equal(detail?.fromLabel, "API", "Relation detail must resolve the from node label.");
  assert.equal(detail?.toLabel, "src/api.ts", "Relation detail must resolve the to node path.");
  assert.equal(message.type, HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE, "Open request message type must match the browser-panel contract.");
  assert.equal(message.metadata.relationId, "documents-source:entry:api->source:src/api.ts", "Open request message must retain relation metadata.");

  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify({
    contract: "hia-devtools-extension-check",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    extension: {
      devtoolsPage: manifest.devtools_page,
      manifestVersion: manifest.manifest_version,
      permissions: manifest.permissions,
      hostPermissions: manifest.host_permissions
    },
    panel: {
      entryCount: panel.summary.entryCount,
      relationCount: panel.summary.relationCount,
      relationNodeCount: panel.summary.relationNodeCount,
      openRequestType: message.type
    }
  }, null, 2)}\n`, "utf8");
  console.log(`DevTools extension check passed at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

function createFixturePayload() {
  return {
    summary: {
      entryCount: 1,
      linkedEntryCount: 1,
      relationCount: 1,
      relationNodeCount: 2
    },
    entries: [
      {
        id: "entry:api",
        kind: "symbol",
        label: "API",
        openRequests: []
      }
    ],
    relationGraph: {
      nodes: [
        {
          id: "entry:api",
          kind: "entry",
          label: "API"
        },
        {
          id: "source:src/api.ts",
          kind: "source",
          label: "src/api.ts",
          path: "src/api.ts"
        }
      ],
      relations: [
        {
          from: "entry:api",
          id: "documents-source:entry:api->source:src/api.ts",
          kind: "documents-source",
          label: "Source: src/api.ts",
          openRequests: [
            {
              kind: "original-source",
              label: "Open source src/api.ts:1",
              target: {
                path: "src/api.ts",
                position: {
                  line: 1
                }
              },
              type: "hia.openSource"
            }
          ],
          to: "source:src/api.ts"
        }
      ]
    }
  };
}
