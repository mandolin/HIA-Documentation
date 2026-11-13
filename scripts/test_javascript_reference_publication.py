"""JavaScript发布归档的实际小夹具与拒绝反例。 Real small JavaScript publication archives and rejection cases."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from prepare_javascript_reference import prepare, digest, project_command_document


class JavaScriptPublicationTests(unittest.TestCase):
    """固定工件身份、完整字段/来源和安全展开边界。 Pin artifact identity, full fields/sources and safe extraction boundaries."""

    def fixture(self, change=None, linked=False, html=False, site_id=None, declared=False, command=False):
        """生成真实双语TAR与完整回执，修改器可构造语义冲突。 Produce a real bilingual TAR and full receipt, with mutations for semantic conflicts."""
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        root = Path(scratch.name)
        # 中文。HTML与既有JavaScript使用同一归档/阅读契约，只选择各自固定站点身份。 English. HTML and existing JavaScript share archive/reading contracts while selecting their respective fixed site identities.
        site_id = site_id or ('html-api' if html else 'javascript-api')
        repository = {'dotnet-api': 'mandolin/HIA-Documentation-API-DotNetDoc', 'css-api': 'mandolin/HIA-Documentation-API-CSS', 'html-api': 'mandolin/HIA-Documentation-API-HTML', 'javascript-api': 'mandolin/HIA-Documentation-API-JavaScript'}[site_id]
        definition = {'id': site_id, 'repository': repository, 'base': '/' + repository.split('/')[1] + '/', 'path': ''}
        registry = {'packages': ['@hia-doc/demo'], 'sites': [definition]}
        symbol = {'id': 'visible', 'name': 'visible', 'kind': 'function', 'signature': 'visible()', 'i18n': {'fields': {'description': {'localizedText': {'en': 'Public.', 'zh-CN': '公开。'}}}}}
        row = {'identityScope': 'package:demo', 'documentPath': 'native/api.hia.json', 'mapPath': 'native/map.json', 'symbols': 1}
        coordinates = {'start': {'line': 1}, 'end': {'line': 1}}
        source_bytes = b'export declare function visible(): void;' if declared else b'public source'
        source = {'source': 'index.d.mts' if declared else 'HIA/demo/index.mjs', 'sha256': hashlib.sha256(source_bytes).hexdigest(), 'byteLength': len(source_bytes)}
        report = {'sourceRepository': 'mandolin/HIA-Documentation', 'sourceCommit': 'a' * 40, 'registrySha256': 'registry', 'site': definition,
                  'packages': [{'name': '@hia-doc/demo'}], 'rows': [row], 'resources': [], 'dataRows': [], 'fullSources': [source], 'entriesPerLocale': 1, 'bindingsPerLocale': 1}
        if command:
            # 中文。单命令与普通API同站，保留独立原件、公开源字节及宿主投影。 English. Keep a command beside ordinary API content with separate native artifacts, public source bytes and host projection.
            self.assertEqual(site_id, 'css-api')
            command_prefix = 'HIA/hia-cssdoc/packages/cssdoc-runner'
            command_source = {'source': command_prefix + '/src/cli.mjs', 'sha256': source['sha256'], 'byteLength': len(source_bytes)}
            model = {'enabled': True, 'model': 'hia-text-i18n', 'modelVersion': '1.0.0', 'defaultLocale': 'zh-CN', 'locales': ['zh-CN', 'en'], 'fields': {
                'description': {'fieldPath': 'description', 'kind': 'text', 'defaultLocale': 'zh-CN', 'localizedText': {'zh-CN': '构建文档。', 'en': 'Build documentation.'}}}}
            declaration = {'id': 'cssdoc', 'executable': 'cssdoc', 'path': [], 'kind': 'command', 'signature': 'cssdoc [options]', 'i18n': model, 'options': [], 'positionals': [], 'displayVersion': {'kind': 'runner', 'value': '1.0.0'}, 'examples': ['cssdoc --help'], 'effects': {'network': 'none'}}
            description = {'contract': 'command-documentation', 'contractVersion': '0.1.0-draft', 'owner': {'packageName': '@hia-doc/cssdoc-runner', 'packageVersion': '1.0.0'}, 'commands': [declaration],
                           'sources': [{'id': 'src/cli.mjs', 'path': 'src/cli.mjs', 'sha256': source['sha256'], 'language': 'javascript'}]}
            command_symbol = {'id': 'command:["@hia-doc/cssdoc-runner","cssdoc"]', 'name': 'cssdoc', 'kind': 'command', 'signature': declaration['signature'], 'i18n': model,
                              'metadata': {'commandDocumentation': {'nativeId': 'cssdoc'}}, 'source': {'definedIn': {'relativePath': 'src/cli.mjs', 'position': {'line': 1}}}}
            # 中文。真实JSON工件没有对象别名，夹具同样经序列化消除共享模型引用。 English. Real JSON artifacts have no object aliases; serialize this fixture to eliminate shared model references as well.
            native_command = json.loads(json.dumps({'schemaVersion': '1.0.0', 'symbols': [command_symbol], 'metadata': {'commandDocumentation': {'artifact': description}}}))
            web_command = project_command_document(native_command, description, command_prefix)
            command_row = {'owner': 'hia-cssdoc', 'package': '@hia-doc/cssdoc-runner', 'version': '1.0.0', 'bins': ['cssdoc'], 'sourcePrefix': command_prefix, 'commands': 1, 'symbols': 1,
                           'documentPath': 'commands/cssdoc/document.hia.json', 'artifacts': [{'path': 'commands/cssdoc/' + name, 'sha256': ''} for name in ('description.json', 'observations.json', 'document.native.hia.json', 'document.hia.json')]}
            report.update(commandRows=[command_row], entriesPerLocale=2)
            report['fullSources'].append(command_source)
        if declared:
            # 中文。声明夹具保留独立的原生0.4工件及逻辑/物理来源归属。 English. Declaration fixtures retain independent native 0.4 artifacts and logical/physical source ownership.
            row = {**row, 'owner': 'demo', 'identityScope': 'declarations:demo', 'extractionPath': 'native/extraction.json', 'bridgePath': 'native/bridge.json'}
            report['rows'] = []
            report['declarations'] = [row]
            report['sourceOrigins'] = {'index.d.mts': 'HIA/demo/index.d.mts'}
        files = {'index.html': b'API'}
        for locale in ('zh-CN', 'en'):
            entry = {**symbol, 'identityScope': row['identityScope'], 'symbolId': 'visible', 'input': {'path': row['documentPath']}, 'contentPath': 'entry.html', 'noScriptPagePath': 'entry.html', 'noScriptLocalePages': [{'path': 'entry.html'}],
                     'docSourceMap': {'path': row['mapPath'], 'entryId': 'map', 'sourceRange': coordinates}}
            index = {'contract': 'hia-project-navigation-index', 'contractVersion': '0.2.0-draft', 'project': {'id': 'project:hia-' + site_id}, 'entries': [entry]}
            payload = {'project-index.json': index, 'native/api.hia.json': {'symbols': [symbol]}, 'native/native.hia.json': {'symbols': [symbol]},
                       'native/hia-integration.json': {'contract': 'hia-jsdoc-integration', 'contractVersion': '0.1.0', 'ir': {'nodes': [symbol]}},
                       'native/map.json': {'entries': [{'id': 'map', 'symbolId': 'visible', 'sourceRefs': [{'range': coordinates}]}]},
                       'documentation-ui-locale-completeness.json': {'status': 'complete'}, 'source-files/index.json': {'sources': [{**source, 'path': 'source-files/' + source['source']}]},
                       'package-api-bindings.json': {'bindings': [{'package': '@hia-doc/demo', 'destinations': [{'identityScope': row['identityScope'], 'symbolId': 'visible', 'content': 'entry.html', 'page': 'entry.html'}]}]}}
            if declared:
                payload['native/api.hia.json']['schemaVersion'] = '0.2.0'
                payload['native/map.json'].update(contract='doc-source-map', contractVersion='1.1.0')
                payload['native/extraction.json'] = {'contract': 'hia-tsdoc-extraction', 'contractVersion': '0.4.0-draft', 'modules': [{'path': 'index.d.mts', 'exports': [{'name': 'visible', 'symbolIds': ['visible']}]}]}
                payload['native/bridge.json'] = {'contract': 'hia-ts-jsdoc-bridge', 'contractVersion': '0.4.0-draft'}
                payload['package-api-bindings.json']['bindings'][0].update(module='index.d.mts', exportName='visible')
            if command:
                payload.update({'commands/adoption.json': {'rows': [command_row]}, 'commands/cssdoc/description.json': description, 'commands/cssdoc/observations.json': [],
                                'commands/cssdoc/document.native.hia.json': native_command, 'commands/cssdoc/document.hia.json': web_command})
                projected_symbol = web_command['symbols'][0]
                payload['project-index.json']['entries'].append({**projected_symbol, 'symbolId': projected_symbol['id'], 'input': {'path': command_row['documentPath']}, 'contentPath': 'entry.html', 'noScriptPagePath': 'entry.html', 'noScriptLocalePages': [{'path': 'entry.html'}],
                                                               'source': {'path': command_prefix + '/src/cli.mjs', 'range': coordinates}})
                payload['source-files/index.json']['sources'].append({**command_source, 'path': 'source-files/' + command_source['source']})
            if change:
                change(payload, report)
            if command:
                for artifact in command_row['artifacts']:
                    if artifact['path'] in payload:
                        artifact['sha256'] = hashlib.sha256(json.dumps(payload[artifact['path']]).encode()).hexdigest()
            files.update({locale + '/' + name: json.dumps(value).encode() for name, value in payload.items()})
            files[locale + '/entry.html'] = b'Public entry'
            files[locale + '/source-files/' + source['source']] = source_bytes
            if command:
                files[locale + '/source-files/' + command_source['source']] = source_bytes
        report['inventory'] = [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in files.items()]
        report['files'] = len(files)
        report['bytes'] = sum(len(data) for data in files.values())
        report_path = root / 'build-report.json'
        report_path.write_text(json.dumps(report), encoding='utf-8')
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w') as bundle:
            for index, (name, data) in enumerate(files.items()):
                member = tarfile.TarInfo(name)
                member.size = len(data)
                if linked and index == 0:
                    member.type = tarfile.SYMTYPE
                    member.linkname = '../outside'
                    member.size = 0
                bundle.addfile(member, io.BytesIO(data))
        archive = root / 'site.tar.gz'
        archive.write_bytes(gzip.compress(raw.getvalue(), mtime=0))
        snapshot = {'site': definition['id'], 'publicationRepository': definition['repository'], 'repository': report['sourceRepository'], 'commit': report['sourceCommit'], 'registrySha256': 'registry',
                    'gzipSha256': digest(archive), 'tarSha256': hashlib.sha256(raw.getvalue()).hexdigest(), 'tarBytes': len(raw.getvalue()), 'reportSha256': digest(report_path), 'files': report['files'], 'bytes': report['bytes']}
        return snapshot, archive, report_path, root / 'site', registry

    def test_valid_archive(self):
        """普通双语归档完整展开。 Expand an ordinary complete bilingual archive."""
        args = self.fixture()
        prepare(*args)
        self.assertTrue((args[3] / 'en/source-files/HIA/demo/index.mjs').is_file())

    def test_command_archive(self):
        """命令与旧API原件在同一真实归档完整消费。 / Consume commands and legacy API originals together in a real archive."""
        args = self.fixture(site_id='css-api', command=True)
        prepare(*args)
        self.assertTrue((args[3] / 'en/commands/cssdoc/document.native.hia.json').is_file())

    def test_command_projection_rejections(self):
        """命令缺项、正文、来源和默认规则漂移均阻断。 / Block missing commands, prose, ownership and rule drift."""
        for change, message in [
            (lambda payload, report: payload['project-index.json']['entries'].pop(), 'Incomplete or duplicate'),
            (lambda payload, report: payload['commands/cssdoc/document.hia.json']['symbols'][0]['i18n']['fields']['command.displayVersion.value']['localizedText'].update(en='9.0.0'), 'website projection'),
            (lambda payload, report: report['commandRows'][0].update(sourcePrefix='HIA/other'), 'source ownership'),
            (lambda payload, report: payload['project-index.json']['entries'][-1].update(signature='wrong()'), 'Command field'),
            (lambda payload, report: payload['commands/cssdoc/document.hia.json']['symbols'][0]['source']['definedIn'].update(relativePath='../private'), 'website projection')
        ]:
            with self.subTest(message=message):
                args = self.fixture(change, site_id='css-api', command=True)
                with self.assertRaisesRegex(ValueError, message):
                    prepare(*args)
                self.assertFalse(args[3].exists())

    def test_field_mismatch(self):
        """摘要一致的错误正文仍被语义检查拒绝。 Reject semantically incorrect fields even with matching archive hashes."""
        args = self.fixture(lambda payload, report: payload['project-index.json']['entries'][0].update(signature='wrong()'))
        with self.assertRaisesRegex(ValueError, 'field changed'):
            prepare(*args)
        self.assertFalse(args[3].exists())

    def test_mapping_mismatch(self):
        """映射身份冲突阻断。 Block mapping identity conflicts."""
        args = self.fixture(lambda payload, report: payload['project-index.json']['entries'][0]['docSourceMap'].update(entryId='wrong'))
        with self.assertRaisesRegex(ValueError, 'mapping changed'):
            prepare(*args)

    def test_source_digest_mismatch(self):
        """完整源清单无法借用其它摘要。 Full-source manifests cannot borrow another digest."""
        args = self.fixture(lambda payload, report: payload['source-files/index.json']['sources'][0].update(sha256='0' * 64))
        with self.assertRaisesRegex(ValueError, 'source manifest'):
            prepare(*args)

    def test_missing_public_binding(self):
        """公开包绑定不得静默遗漏。 Reject missing public package bindings."""
        args = self.fixture(lambda payload, report: payload['package-api-bindings.json'].update(bindings=[]))
        with self.assertRaisesRegex(ValueError, 'package bindings'):
            prepare(*args)

    def test_symlink_archive(self):
        """归档符号链接拒绝展开。 Reject archive symlinks."""
        with self.assertRaisesRegex(ValueError, 'archive member'):
            prepare(*self.fixture(linked=True))

    def test_pinned_identity(self):
        """发布仓、源提交和包范围均固定。 Pin publication repository, source commit and package scope."""
        for key, value in [('publicationRepository', 'other/site'), ('commit', 'b' * 40), ('files', 100001), ('tarBytes', 1)]:
            args = self.fixture()
            args[0][key] = value
            with self.assertRaises(ValueError):
                prepare(*args)

    def test_html_archive(self):
        """HTML固定站点沿同一原生契约完整展开。 Expand the pinned HTML site under the same native contracts."""
        args = self.fixture(html=True)
        prepare(*args)
        self.assertTrue((args[3] / 'en/package-api-bindings.json').is_file())

    def test_html_binding_omission(self):
        """HTML公开绑定同样逐项拒绝遗漏。 Reject omitted HTML public bindings individually."""
        args = self.fixture(lambda payload, report: payload['package-api-bindings.json'].update(bindings=[]), html=True)
        with self.assertRaisesRegex(ValueError, 'package bindings'):
            prepare(*args)

    def test_html_unconfirmed_route(self):
        """HTML固定路径不能替换成任意子分区。 Reject replacing HTML's fixed route with an arbitrary partition."""
        args = self.fixture(html=True)
        args[4]['sites'][0]['path'] = 'html/'
        with self.assertRaisesRegex(ValueError, 'publication route'):
            prepare(*args)

    def test_existing_output(self):
        """现有输出不被失败校验覆盖。 Existing output survives failed validation."""
        args = self.fixture()
        args[3].mkdir()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            prepare(*args)

    def test_css_archive(self):
        """CSS固定站点沿同一原生契约完整展开。 Expand the pinned CSS site under the same native contracts."""
        args = self.fixture(site_id='css-api')
        prepare(*args)
        self.assertTrue((args[3] / 'en/package-api-bindings.json').is_file())

    def test_css_binding_omission(self):
        """CSS公开绑定同样逐项拒绝遗漏。 Reject omitted CSS public bindings individually."""
        args = self.fixture(lambda payload, report: payload['package-api-bindings.json'].update(bindings=[]), site_id='css-api')
        with self.assertRaisesRegex(ValueError, 'package bindings'):
            prepare(*args)

    def test_css_unconfirmed_route(self):
        """CSS固定路径不能替换成任意子分区。 Reject replacing CSS's fixed route with an arbitrary partition."""
        args = self.fixture(site_id='css-api')
        args[4]['sites'][0]['path'] = 'css/'
        with self.assertRaisesRegex(ValueError, 'publication route'):
            prepare(*args)


    def test_dotnet_declaration_archive(self):
        """DotNetDoc保留原声明工件、导出目标及来源。 Preserve original DotNetDoc declaration artifacts, export destinations and source ownership."""
        args = self.fixture(site_id='dotnet-api', declared=True)
        prepare(*args)
        self.assertTrue((args[3] / 'en/source-files/index.d.mts').is_file())

    def test_dotnet_declaration_rejections(self):
        """声明原生身份、绑定及来源冲突全部阻断。 Block declaration native-identity, binding and source conflicts."""
        for change, message in [
            (lambda payload, report: payload['native/extraction.json'].update(contractVersion='0.3.0-draft'), 'declaration artifact'),
            (lambda payload, report: payload['native/bridge.json'].update(contractVersion='0.3.0-draft'), 'declaration artifact'),
            (lambda payload, report: payload['package-api-bindings.json']['bindings'][0].update(destinations=[]), 'binding'),
            (lambda payload, report: payload['package-api-bindings.json']['bindings'][0].update(exportName='wrong'), 'declaration binding'),
            (lambda payload, report: report.update(sourceOrigins={'index.d.mts': 'HIA/other/index.d.mts'}), 'declaration source'),
            (lambda payload, report: report.update(sourceOrigins={}), 'declaration source')
        ]:
            with self.subTest(message=message):
                args = self.fixture(change, site_id='dotnet-api', declared=True)
                with self.assertRaisesRegex(ValueError, message):
                    prepare(*args)
                self.assertFalse(args[3].exists())




if __name__ == '__main__':
    unittest.main()
