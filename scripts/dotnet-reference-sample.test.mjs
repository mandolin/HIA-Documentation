/**
 * @file
 * @lang zh-CN 自有.NET样本输入契约与双语字段防回退；真实编译/抽取验证另按样本使用入口运行。
 * @lang en Regression checks for first-party .NET sample inputs and bilingual fields, with real compilation/extraction verified through documented sample entries.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {validateHiaProjectConfig, validateHiaProjectManifest} from '../packages/config/dist/index.js';
import {preparePublicReferenceLocaleConfig, preparePublicReferenceSourceConfig} from './public-reference-source.mjs';

// <lang><zh-CN>固定公开owner的显式样本根，测试不扫描WorkZone或业务仓。</zh-CN><en>Fix the public owner's explicit sample root without scanning WorkZone or business repositories.</en></lang>
const sample = fileURLToPath(new URL('../reference/samples/dotnet/', import.meta.url));

for (const locale of ['zh-CN', 'en']) test(`derives an explicit localized reference config for ${locale}`, context => {
  // <lang><zh-CN>派生配置与单文件镜像共享目录，继承同一读取边界。</zh-CN><en>The derived config shares the mirror directory and inherits the same read boundary.</en></lang>
  const fixture = createSourceConfigFixture(context);
  const sourceConfig = preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime);
  const original = fs.readFileSync(sourceConfig, 'utf8');
  const configPath = preparePublicReferenceLocaleConfig(sourceConfig, locale);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.deepEqual(validateHiaProjectConfig(config), []);
  assert.equal(path.dirname(configPath), path.dirname(sourceConfig));
  assert.equal(config.docs.renderer.uiLocale, locale);
  assert.equal(config.docs.renderer.projectLayout, 'split-site');
  assert.deepEqual(config.docs.renderer.informationArchitecture, {contentGrouping: 'entry', loadingStrategy: 'lazy', memberPlacement: 'separate'});
  assert.deepEqual(config.docs.theme, {name: 'default', colors: {accent: '#0047AB'}});
  assert.deepEqual(config.docs.source, JSON.parse(original).docs.source);
  assert.equal(fs.readFileSync(sourceConfig, 'utf8'), original);
});

test('refuses unsupported reference UI locales before writing a config', context => {
  // <lang><zh-CN>闭集沿用实际公开构建的两语言，不通过文件名接受任意路径。</zh-CN><en>Keep the actual build's two-locale set, excluding arbitrary path input.</en></lang>
  const fixture = createSourceConfigFixture(context);
  const sourceConfig = preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime);
  const before = fs.readdirSync(fixture.runtime);
  assert.throws(() => preparePublicReferenceLocaleConfig(sourceConfig, '../unknown'), /Unsupported public reference UI locale/);
  assert.deepEqual(fs.readdirSync(fixture.runtime), before);
});

test('refuses an existing localized config without changing its bytes', context => {
  // <lang><zh-CN>独占运行目录仍拒绝同名覆盖，避免部分失败被后续重试掩盖。</zh-CN><en>Even inside an exclusive runtime, refuse name reuse so retries cannot conceal partial failures.</en></lang>
  const fixture = createSourceConfigFixture(context);
  const sourceConfig = preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime);
  const config = preparePublicReferenceLocaleConfig(sourceConfig, 'en');
  fs.writeFileSync(config, 'existing fixture');
  assert.throws(() => preparePublicReferenceLocaleConfig(sourceConfig, 'en'), {code: 'EEXIST'});
  assert.equal(fs.readFileSync(config, 'utf8'), 'existing fixture');
});

/**
 * @lang zh-CN 在主仓忽略目录创建独占测试owner，清理前核绝对目标仍在该测试根内。
 * @lang en Creates an exclusive test owner in ignored output and checks the absolute cleanup boundary.
 * @param {import('node:test').TestContext} context <lang><zh-CN>当前测试的清理生命周期。</zh-CN><en>Current test cleanup lifecycle.</en></lang>
 * @param {boolean} [withSource=true] <lang><zh-CN>是否创建正常样本，用于越根链接反例。</zh-CN><en>Whether to create the normal sample, omitted for escaping-link counterexamples.</en></lang>
 * @returns {object} <lang><zh-CN>测试根、owner与runtime目录，仅含合成公开正文。</zh-CN><en>Fixture root, owner and runtime containing synthetic public text only.</en></lang>
 */
function createSourceConfigFixture(context, withSource = true) {
  // <lang><zh-CN>临时根固定落在主仓dist内，每测试独占，避免互相覆盖。</zh-CN><en>Keep each exclusive fixture inside the owning repository's dist.</en></lang>
  const outputRoot = fileURLToPath(new URL('../dist/', import.meta.url));
  fs.mkdirSync(outputRoot, {recursive: true});
  const root = fs.mkdtempSync(path.join(outputRoot, 'source-config-test-'));
  const owner = path.join(root, 'owner');
  const runtime = path.join(owner, 'dist/runtime');
  fs.mkdirSync(runtime, {recursive: true});
  fs.mkdirSync(path.join(owner, 'reference/samples'), {recursive: true});
  if (withSource) {
    fs.mkdirSync(path.join(owner, 'reference/samples/dotnet'));
    fs.writeFileSync(path.join(owner, 'reference/samples/dotnet/Envelope.cs'), '// 中文样本。 English sample.\npublic class Envelope {}\n');
  }
  context.after(() => {
    // <lang><zh-CN>仅删除明确验证位于测试输出根内的本次独占目录。</zh-CN><en>Remove only this exclusive directory after checking its containment in the test output root.</en></lang>
    const relative = path.relative(outputRoot, path.resolve(root));
    assert(relative.startsWith('source-config-test-') && !relative.includes(path.sep) && !path.isAbsolute(relative));
    fs.rmSync(root, {recursive: true, force: true});
  });
  return {root, owner, runtime};
}

test('stages only the authorized file with valid relative source configuration', context => {
  // <lang><zh-CN>真实主仓根的其它文件不进入镜像，源字节完整保留。</zh-CN><en>Exclude other owner files from the mirror and retain exact source bytes.</en></lang>
  const fixture = createSourceConfigFixture(context);
  fs.writeFileSync(path.join(fixture.owner, 'unselected.txt'), 'unselected fixture text');
  const configPath = preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.deepEqual(validateHiaProjectConfig(config), []);
  assert.deepEqual(config.docs.source, {presentation: 'fetch', publicAssetPolicy: 'explicit-public', localRoot: 'source-root', maxLines: 400});
  assert.deepEqual(fs.readFileSync(path.join(fixture.runtime, 'source-root/reference/samples/dotnet/Envelope.cs')), fs.readFileSync(path.join(fixture.owner, 'reference/samples/dotnet/Envelope.cs')));
  assert(!fs.existsSync(path.join(fixture.runtime, 'source-root/unselected.txt')));
  assert(!fs.readFileSync(configPath, 'utf8').includes(fixture.owner));
});

test('rejects an authorized source path redirected outside its owner', context => {
  // <lang><zh-CN>目录链接模拟越根来源，所有目标都仍属于本次合成测试根。</zh-CN><en>A directory link simulates an escaping source; all targets remain synthetic fixture-owned files.</en></lang>
  const fixture = createSourceConfigFixture(context, false);
  const outside = path.join(fixture.root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'Envelope.cs'), 'outside fixture text');
  fs.symlinkSync(outside, path.join(fixture.owner, 'reference/samples/dotnet'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime), /source escapes/);
  assert(!fs.existsSync(path.join(fixture.runtime, 'source-root')));
});

test('refuses to reuse or overwrite an existing source staging directory', context => {
  // <lang><zh-CN>已有内容必须保留，由runtime生命周期的拥有者管理。</zh-CN><en>Preserve existing content for the owner of the runtime lifecycle.</en></lang>
  const fixture = createSourceConfigFixture(context);
  fs.mkdirSync(path.join(fixture.runtime, 'source-root'));
  const marker = path.join(fixture.runtime, 'source-root/previous.txt');
  fs.writeFileSync(marker, 'previous staging');
  assert.throws(() => preparePublicReferenceSourceConfig(fixture.owner, fixture.runtime), {code: 'EEXIST'});
  assert.equal(fs.readFileSync(marker, 'utf8'), 'previous staging');
});

test('rejects a source runtime outside the owning repository', context => {
  // <lang><zh-CN>越根写入在创建镜像前拒绝，避免把授权根变成任意输出根。</zh-CN><en>Reject escaping writes before mirror creation instead of accepting an arbitrary output root.</en></lang>
  const fixture = createSourceConfigFixture(context);
  const outside = path.join(fixture.root, 'outside-runtime');
  fs.mkdirSync(outside);
  assert.throws(() => preparePublicReferenceSourceConfig(fixture.owner, outside), /runtime escapes/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('accepts the .NET sample renderer configuration with explicit source publication', () => {
  // <lang><zh-CN>真实配置由既有配置读者验证，公开许可与样本根须分别明确。</zh-CN><en>Validate the real config with the existing reader and keep publication policy and sample root explicit.</en></lang>
  const config = JSON.parse(fs.readFileSync(path.join(sample, 'hia.config.json'), 'utf8'));
  assert.deepEqual(validateHiaProjectConfig(config), []);
  assert.equal(config.docs.source.publicAssetPolicy, 'explicit-public');
  assert.equal(config.docs.source.localRoot, '.');
  assert.equal(config.docs.theme.colors.accent, '#0047AB');
});

test('accepts the exact project manifest and references the actual XML-derived artifact', () => {
  // <lang><zh-CN>样本与45工具包API范围分开，XML派生路径与编译程序集名必须一致。</zh-CN><en>Keep the sample separate from 45 tool-package APIs and align XML-derived paths with the compiled assembly.</en></lang>
  const manifest = JSON.parse(fs.readFileSync(path.join(sample, 'hia.project.json'), 'utf8'));
  assert.deepEqual(validateHiaProjectManifest(manifest), []);
  assert.equal(manifest.inputs.length, 1);
  assert.equal(manifest.inputs[0].path, 'dist/dotnetdoc/bin/Release/net10.0/HiaDocumentationSample.hia.json');
  assert.equal(manifest.inputs[0].kind, 'hia-document');
});

test('retains independent Chinese and English XML documentation for every sample field', () => {
  // <lang><zh-CN>这里只核固定样本的注释槽位，不将正则检查声称为通用C#解析器或语言质量验收。</zh-CN><en>Check this fixed sample's comment slots without claiming general C# parsing or language-quality acceptance.</en></lang>
  const source = fs.readFileSync(path.join(sample, 'Envelope.cs'), 'utf8').replace(/^\s*\/\/\/ ?/gm, '');
  const fields = [...source.matchAll(/<(summary|remarks|typeparam|param|returns|exception)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)];
  assert.equal(fields.length, 7);
  for (const field of fields) {
    assert.match(field[2], /<zh-CN>[\s\S]+<\/zh-CN>/);
    assert.match(field[2], /<en>[\s\S]+<\/en>/);
  }
});

test('limits extraction to the first-party XML and C# inputs with current schemas', () => {
  // <lang><zh-CN>源码和工程均为本样本明确列举的文件，派生XML仅在真实编译后验证存在。</zh-CN><en>Source and project are explicitly listed sample files; generated XML existence is checked only after real compilation.</en></lang>
  const config = JSON.parse(fs.readFileSync(path.join(sample, 'dotnetdoc.config.json'), 'utf8'));
  const project = fs.readFileSync(path.join(sample, 'HiaDocumentationSample.csproj'), 'utf8');
  assert.equal(config.schemaVersion, '1.0.0');
  assert.equal(config.options.writeDocSourceMapArtifact, true);
  assert.deepEqual(config.inputs.map(input => input.kind), ['dotnet-xml-doc', 'dotnet-csharp-source']);
  assert(config.inputs.every(input => input.projectPath === 'HiaDocumentationSample.csproj'));
  assert.match(project, /<GenerateDocumentationFile>true<\/GenerateDocumentationFile>/);
  assert.match(project, /<TargetFramework>net10\.0<\/TargetFramework>/);
  assert.doesNotMatch(project, /<PackageReference\b/);
  assert(fs.existsSync(path.join(sample, config.inputs[1].path)));
});

test('includes the compiled first-party .NET sample in the public producer allowlist', () => {
  // <lang><zh-CN>源码归主仓，提取器来自单独.NET仓；只读取一个编译XML输入避免声明重复。</zh-CN><en>The main repository owns the sample while the .NET repository owns extraction; one compiled XML input avoids duplicate declarations.</en></lang>
  const definition = JSON.parse(fs.readFileSync(new URL('../reference/public-reference-build.definition.json', import.meta.url), 'utf8'));
  assert(definition.sources.some(source => source.id === 'hia-dotnetdoc' && source.repository === 'mandolin/hia-dotnetdoc' && source.workspace === 'source'));
  const producer = definition.producers.find(item => item.id === 'main-repo-dotnet-sample');
  assert(producer);
  assert.equal(producer.sourceId, 'main-repo');
  assert.equal(producer.moduleSourceId, 'hia-dotnetdoc');
  assert.equal(producer.inputs.length, 1);
  assert.equal(producer.inputs[0].kind, 'dotnet-xml-doc');
  assert.equal(producer.inputs[0].path, 'reference/samples/dotnet/bin/Release/net10.0/HiaDocumentationSample.xml');
  assert.equal(producer.inputs[0].projectPath, 'reference/samples/dotnet/HiaDocumentationSample.csproj');
  assert.equal(producer.options.writeDocSourceMapArtifact, true);
  assert.equal(definition.acceptance.requiredProducerCount, definition.producers.length);
  assert.equal(definition.acceptance.minimumEntryCounts.dotnet, 2);
});

test('requires both canonical .NET declarations and installs the SDK in public build workflows', () => {
  // <lang><zh-CN>显式ID防止只有总数量通过；两条实际生产工作流都必须取得SDK和领域生产器。</zh-CN><en>Explicit IDs prevent count-only acceptance; both production workflows must acquire the SDK and domain producer.</en></lang>
  const definition = JSON.parse(fs.readFileSync(new URL('../reference/public-reference-build.definition.json', import.meta.url), 'utf8'));
  for (const id of ['hia-document:dotnet-t-hiadocumentationsample.envelope-1', 'hia-document:dotnet-m-hiadocumentationsample.envelope-1.formatlabel-system.string']) {
    assert(definition.acceptance.requiredEntryIds.includes(id));
  }
  for (const name of ['public-reference-build.yml', 'schema-pages.yml']) {
    const workflow = fs.readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
    assert.match(workflow, /uses: actions\/setup-dotnet@v5/);
    assert.match(workflow, /dotnet-version: 10\.0\.x/);
    assert.match(workflow, /repository: mandolin\/hia-dotnetdoc/);
    assert.match(workflow, /path: reference\/sources\/hia-dotnetdoc/);
  }
});
