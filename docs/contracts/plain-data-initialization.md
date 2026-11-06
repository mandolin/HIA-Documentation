# Plain Data Initialization

`plain-data-initialization` is an independent `0.1.0-draft` rule for finite
data-initialization traces inside artifact derivation evidence.

```ts
import { readPlainDataInitialization } from "@hia-doc/plugin-sdk/plain-data-initialization";

function inspectInitialization(decodedEvidence: unknown, activityId: string) {
  const result = readPlainDataInitialization(decodedEvidence, activityId);
  if (result.status === "invalid") return result.diagnostics;
  return { value: result.value, links: result.valueLinks, verification: result.verification };
}
```

The reader first takes the generic evidence reader's defensive snapshot. The
selected activity must reference this exact rule and version. Its `details`
payload contains `contract`, `contractVersion`, `entryResourceId`, `steps` and
`result`. The result declares an output `resourceId` and an entry-module
`bindingName`. Relevant derivations must cover that output and every claimed
source resource used by the trace.

## Events

Each event has a contiguous zero-based `sequence` and a `source`. Sources refer
to activity inputs using one-based core ranges with explicit columns,
`endBoundary: "exclusive"` and `columnUnit: "utf16-code-unit"`. Empty anchors
are structurally allowed. File contents and actual source positions require
separate verification.

| Kind | Fields beyond sequence/source/kind | Meaning |
| --- | --- | --- |
| `literal` | `nodeId`, `value` | Allocate a JSON scalar, with numbers limited to exact safe integers |
| `object` | `nodeId`, `properties` | Allocate an ordinary object with unique initial keys and previously allocated value references |
| `array` | `nodeId`, `items` | Allocate a dense array from previously allocated value references |
| `bind` | `nodeId`, `name` | Create one const binding in the source-resource scope |
| `clone` | `nodeId`, `sourceNodeId`, `copies` | Clone a graph using an exact old/new container-identity map |
| `spread` | `nodeId`, `sourceNodeId` | Create a new object/array shell retaining child references |
| `write` | `targetNodeId`, `key`, `valueNodeId` | Replace/add a property on a locally owned unfrozen ordinary object |
| `freeze` | `nodeId` | Shallow-freeze a locally owned container |

Object properties contain `key`, `nodeId` and their own `source`. Clone map
entries contain `fromNodeId` and `toNodeId`. All reachable containers need
exactly one fresh destination identity, including the clone root. Internal
sharing and cycles are preserved during cloning. Cloned containers receive
the actor's ownership and fresh unfrozen property state. Scalar-root clones
use an empty copy map.

Spreading creates an unfrozen shell. Child ownership and freezing follow the
referenced child nodes. Arrays support creation, cloning and shallow spreading;
property writes target ordinary objects. The initial conservative property-key
boundary excludes `__proto__`, `prototype` and `constructor`. Empty keys and
RFC6901 slash/tilde escaping are retained.

## Results And Verification

`replayed` means the declared trace is internally coherent under this rule.
The final const binding is read after all events. `value` is a finite JSON tree
expansion. `valueLinks` retain trace-local node identities, current and original
value sources, overwritten property sources, and transformation sources.
Transformation sources describe the selected node and its direct incoming edge.
Their `transformationSequences` distinguish operations at identical source
positions and deduplicate one event shared by a cloned node and edge. Earlier
ancestor transformations are excluded from values inserted or overwritten later.
Shallow spreading records the copied direct edges while deeper child values
retain their own transformation histories.
Shared containers may appear at multiple pointers with one node identity.
Independent records can use different node names.

The result marks `structure` and `traceSemantics` as true. `artifactBytes`,
`sourceLinks`, `sourceConformance` and `producerAuthenticity` remain false.
Source conformance includes actual expression locations and module execution
order. Replay follows declared ownership and never loads or executes modules.
The original `producer-recorded`/`static-inferred` label is retained.

Unknown operations, identity/version mismatches, forward references, duplicate
identities/bindings, incomplete clone maps, forbidden writes and cyclic final
JSON produce fixed diagnostics without partial output. Limits are 10,000 events
and heap nodes, 20,000 property-edge operations, 200,000 provenance references,
100,000 expanded values, 128 output levels and 2,000,000 pointer UTF16 units.
The generic reader's input snapshot limits also apply.

The schema is available at
`@hia-doc/plugin-sdk/plain-data-initialization.schema.json` and
`@hia-doc/schemas/plain-data-initialization.schema.json`. Its canonical ID is
`https://mandolin.github.io/HIA-Documentation/schemas/plain-data-initialization-0.1.0-draft.schema.json`.

中文说明。规则严格重放已声明的有限数据轨迹，保留容器共享、对象所有权、浅冻结、
常量绑定和字段变更来源。初始属性唯一，覆盖用write表达，clone映射完整且新身份唯一。
最终JSON展开保持有界且无环。轨迹内部通过、实际字节、源码符合性和生产主体信任
分别记录，实际生产记录及独立源码比较通过后才能满足相应组合验收。
变换来源按当前节点与直接边合并，并以事件序号去重和排序。后来插入或覆盖的值
保留自己的来源，浅展开不会将外壳变换归因给更深子值。
