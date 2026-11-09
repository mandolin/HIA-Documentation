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
