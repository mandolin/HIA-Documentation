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

// <lang><zh-CN>固定公开owner的显式样本根，测试不扫描WorkZone或业务仓。</zh-CN><en>Fix the public owner's explicit sample root without scanning WorkZone or business repositories.</en></lang>
const sample = fileURLToPath(new URL('../reference/samples/dotnet/', import.meta.url));

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
