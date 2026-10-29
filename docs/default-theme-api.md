# Default theme API

`@hia-doc/theme-default` returns in-memory assets and metadata. It performs no
filesystem writes, network requests or theme-provider discovery. Its package
version is independent of `documentation-portal-theme@0.1.0-draft`; the theme
contract remains an exact-version draft.

## Functions

| Export | Input and result | Ownership and limits |
| --- | --- | --- |
| `getDefaultThemeAssets(options = {})` | CSS first, JavaScript second; each record has `path`, `contents`, `contentType` | Fresh array and records; strings are immutable values. Defaults use `assets/hia-default.css` / `.js` and UTF-8 CSS / JavaScript MIME types. No I/O. |
| `getDefaultDocumentationPortalThemeReference()` | `contract`, `contractVersion`, `name`, `colorSchemePolicy`, `disclosure` | A fresh five-field record; no tokens, source text, credentials or persisted preferences. |
| `getPortalThemeSkinCatalog()` | Ordered Classic, Graphite, Lumen capability records | Fresh array, records, `capabilities` and `supportedSchemes` arrays. `tokenContract` is an exact `name@version`; no CSS selectors or color values. |
| `getPortalThemeSkinLabel(skinId)` | Bilingual built-in skin label | Known identities have exact labels; unknown identities use the existing Classic fallback. No discovery or provider loading. |
| `getPortalThemeSchemeLabel(scheme)` | Bilingual label for typed `dark`, `light`, `system` | A typed lookup, without runtime validation or an unknown-input fallback. Validate external values before calling. |

## Brand-color input

```js
import { getDefaultThemeAssets } from "@hia-doc/theme-default";

const files = getDefaultThemeAssets({ colors: { accent: "#0f4f82" } });
// The caller owns writing these records to a permitted output directory.
```

`colors` must be an own, enumerable data property. Omission, an own `undefined`,
or an empty color record preserves default bytes; inherited `colors` is ignored.
The color record must have `Object.prototype` or a null prototype. Every own
key, including hidden keys and symbols, is checked: only known, enumerable data
tokens with literal `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA` strings are admitted.
Whitespace, CSS fragments, `url()`, `var()` and object coercion are not accepted.
Hex letter casing is preserved. Unknown top-level options are not consumed.

Ordinary option/token accessors are rejected without invoking their getters.
Invalid colors or reflection failures throw a `TypeError` with the fixed message
`HIA_THEME_COLORS_INVALID: Brand colors require known semantic names and literal hex values.`
The error does not echo input names, values or underlying exceptions. Proxy
reflection may execute traps; this API is not a sandbox for hostile JavaScript.

Overrides append rules to a new CSS string; JavaScript and shared defaults stay
unchanged. The caller must review contrast for the chosen scheme. See
[shared assets and branding](shared-theme-assets.md) for configuration, CSS token
names and explicit asset-writer ownership.

## Constants and types

| Exports | Meaning |
| --- | --- |
| `DOCUMENTATION_PORTAL_THEME_CONTRACT`, `DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION` | Exact draft identity; no implicit future-version compatibility. |
| `DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES` | The fourteen allowed semantic names, in declaration order. |
| `PORTAL_THEME_SKIN_IDS`, `PORTAL_THEME_SCHEMES` | Closed built-in identities and supported selection modes. |
| `DEFAULT_DOCUMENTATION_PORTAL_THEME` | Default metadata, light/dark tokens, legacy aliases, disclosure, compatibility and privacy declarations. |
| `DEFAULT_THEME_CSS_PATH`, `DEFAULT_THEME_JS_PATH` | Fixed relative output paths. |
| `DEFAULT_THEME_CSS`, `DEFAULT_THEME_JS` | Default resource strings; browser script runs only when the host serves and loads it. |
| `DocumentationPortalThemeColorTokenName`, `DocumentationPortalThemeColorTokens` | Allowed token-name union and readonly complete color record. |
| `PortalThemeSkinId`, `PortalThemeScheme` | Closed skin / selection-mode unions. |
| `PortalThemeSkinCapability` | `skinId`, `tokenContract`, `supportedSchemes`, `capabilities`. |
| `DocumentationPortalThemeReference` | The five metadata fields listed above. |
| `DocumentationPortalThemeContract` | Reference plus `colorSchemes`, `tokens`, `legacyAliases`, `disclosurePolicy`, `compatibility`, `privacy`. |
| `HiaThemeAsset`, `HiaThemeAssetOptions` | Asset record and optional brand-color map. |

Exported object/array constants are shared and **must not be mutated**. Their
TypeScript readonly / `as const` annotations do not freeze JavaScript objects at
runtime. Use the copy-returning functions above or make your own copies for local
changes. Adding runtime deep freezing would be a separate compatibility change.

Theme metadata declares privacy boundaries; it does not sanitize unrelated host
data or authorize publishing source code. Theme preferences are browser-local
and do not enter metadata references. Native disclosure, no-script behavior,
forced colors, print rules and responsive layout remain described in the
[package guide](../packages/theme-default/README.md).

中文摘要：本页区分纯内存 API、返回副本与共享只读常量。颜色只接受安全数据属性和十六进制字面量；
普通 getter 不执行，Proxy 反射不提供沙箱保证。scheme 标签入口要求调用方先校验类型；主题草案身份、
包版本和正式版资格分别管理。
