"""JavaScript发布归档的实际小夹具与拒绝反例。 Real small JavaScript publication archives and rejection cases."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from prepare_javascript_reference import prepare, digest


class JavaScriptPublicationTests(unittest.TestCase):
    """固定工件身份、完整字段/来源和安全展开边界。 Pin artifact identity, full fields/sources and safe extraction boundaries."""

    def fixture(self, change=None, linked=False):
        """生成真实双语TAR与完整回执，修改器可构造语义冲突。 Produce a real bilingual TAR and full receipt, with mutations for semantic conflicts."""
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        root = Path(scratch.name)
        definition = {'id': 'javascript-api', 'repository': 'mandolin/HIA-Documentation-API-JavaScript', 'base': '/HIA-Documentation-API-JavaScript/', 'path': ''}
        registry = {'packages': ['@hia-doc/demo'], 'sites': [definition]}
        symbol = {'id': 'visible', 'name': 'visible', 'kind': 'function', 'signature': 'visible()', 'i18n': {'fields': {'description': {'localizedText': {'en': 'Public.', 'zh-CN': '公开。'}}}}}
        row = {'identityScope': 'package:demo', 'documentPath': 'native/api.hia.json', 'mapPath': 'native/map.json', 'symbols': 1}
        coordinates = {'start': {'line': 1}, 'end': {'line': 1}}
        source_bytes = b'public source'
        source = {'source': 'HIA/demo/index.mjs', 'sha256': hashlib.sha256(source_bytes).hexdigest(), 'byteLength': len(source_bytes)}
        report = {'sourceRepository': 'mandolin/HIA-Documentation', 'sourceCommit': 'a' * 40, 'registrySha256': 'registry', 'site': definition,
                  'packages': [{'name': '@hia-doc/demo'}], 'rows': [row], 'resources': [], 'dataRows': [], 'fullSources': [source], 'entriesPerLocale': 1, 'bindingsPerLocale': 1}
        files = {'index.html': b'API'}
        for locale in ('zh-CN', 'en'):
            entry = {**symbol, 'identityScope': 'package:demo', 'symbolId': 'visible', 'input': {'path': row['documentPath']}, 'contentPath': 'entry.html', 'noScriptPagePath': 'entry.html', 'noScriptLocalePages': [{'path': 'entry.html'}],
                     'docSourceMap': {'path': row['mapPath'], 'entryId': 'map', 'sourceRange': coordinates}}
            index = {'contract': 'hia-project-navigation-index', 'contractVersion': '0.2.0-draft', 'project': {'id': 'project:hia-javascript-api'}, 'entries': [entry]}
            payload = {'project-index.json': index, 'native/api.hia.json': {'symbols': [symbol]}, 'native/native.hia.json': {'symbols': [symbol]},
                       'native/hia-integration.json': {'contract': 'hia-jsdoc-integration', 'contractVersion': '0.1.0', 'ir': {'nodes': [symbol]}},
                       'native/map.json': {'entries': [{'id': 'map', 'symbolId': 'visible', 'sourceRefs': [{'range': coordinates}]}]},
                       'documentation-ui-locale-completeness.json': {'status': 'complete'}, 'source-files/index.json': {'sources': [{**source, 'path': 'source-files/' + source['source']}]},
                       'package-api-bindings.json': {'bindings': [{'package': '@hia-doc/demo', 'destinations': [{'identityScope': 'package:demo', 'symbolId': 'visible', 'content': 'entry.html', 'page': 'entry.html'}]}]}}
            if change:
                change(payload, report)
            files.update({locale + '/' + name: json.dumps(value).encode() for name, value in payload.items()})
            files[locale + '/entry.html'] = b'Public entry'
            files[locale + '/source-files/' + source['source']] = source_bytes
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

    def test_existing_output(self):
        """现有输出不被失败校验覆盖。 Existing output survives failed validation."""
        args = self.fixture()
        args[3].mkdir()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            prepare(*args)


if __name__ == '__main__':
    unittest.main()
