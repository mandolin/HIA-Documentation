"""资源发布归档的真实小型夹具及拒绝反例。 Real small archives and rejection cases for resource publication."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from prepare_resource_reference import prepare, digest


class ResourcePublicationTests(unittest.TestCase):
    """测试归档与清单不变量，完整站点另走正常生成。 Test archive/registry invariants, with full sites checked through normal generation."""

    def fixture(self, change=None, linked=False):
        """生成双语原生文档/来源和完整TAR。 Generate bilingual native documents, sources and a complete TAR."""
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        root = Path(scratch.name)
        definition = {
            'id': 'demo', 'site': 'core', 'path': 'schemas/demo/',
            'exports': [{
                'package': '@hia-doc/demo', 'subpath': './a.json',
                'source': 'packages/demo/dist/a.json'
            }]
        }
        site = {
            'id': 'core',
            'repository': 'mandolin/HIA-Documentation-Resources-Core',
            'base': '/HIA-Documentation-Resources-Core/',
            'defaultPartition': 'demo', 'partitions': ['demo']
        }
        registry = {'sites':[site],'partitions':[definition]}
        source = definition['exports'][0]['source']
        prefix = 'package-resources/demo/a.json'
        sha = hashlib.sha256(b'{}').hexdigest()
        coordinates = {'start':{'line':1,'column':1},'end':{'line':1,'column':3}}
        symbol = {'id':'json:demo','name':'demo','kind':'json-object','signature':'{}','source':{'definedIn':{'range':coordinates}}}
        resource = {'package':'@hia-doc/demo','subpath':'./a.json','source':source,'prefix':prefix,'sha256':sha,'locale':'und','values':1}
        part = {
            'id': 'demo', 'path': definition['path'],
            'projectId': 'project:hia-resource-demo',
            'resources': [resource], 'values': 1,
            'sourcePolicy': {'paths':[source], 'maxLines':400, 'presentation':'fetch'}
        }
        files = {'index.html':b'Resource reference'}
        for locale in ('zh-CN','en'):
            base = definition['path']+locale+'/'
            entry = {
                'id': 'entry:demo', 'symbolId': symbol['id'],
                'name': symbol['name'], 'kind': symbol['kind'], 'signature': '{}',
                'input': {'path':prefix+'/resource-001.hia.json'},
                'contentPath': 'entry.html', 'noScriptPagePath': 'entry.html',
                'noScriptLocalePages': [{'path':'entry.html'}],
                'docSourceMap': {
                    'path': prefix+'/resource-001.doc-source-map.json',
                    'sourcePath': source, 'sourceRange': coordinates
                },
                'source': {
                    'path': source, 'fetchUrl': 'sources/a.txt',
                    'linkUrl': 'sources/a.html#L1'
                }
            }
            document = {'schemaVersion':'1.0.0','defaultLocale':'und','metadata':{'jsonResource':{'path':source,'sha256':sha}},'symbols':[symbol]}
            index = {'contract':'hia-project-navigation-index','contractVersion':'0.1.0-draft','project':{'id':part['projectId']},'entries':[entry]}
            source_map = {
                'contract': 'doc-source-map',
                'contractVersion': '1.1.0',
                'sources': [{'id':'source:demo','path':source,'sourcesContentPolicy':'none'}],
                'entries': [{
                    'symbolId': symbol['id'],
                    'sourceRefs': [{
                        'sourceId': 'source:demo',
                        'range': coordinates,
                        'rangeConvention': {'endBoundary':'exclusive','columnUnit':'utf16-code-unit'}
                    }]
                }]
            }
            files.update({
                base+'project-index.json': json.dumps(index).encode(),
                base+'documentation-ui-locale-completeness.json': b'{"contract":"documentation-ui-locale-completeness","contractVersion":"1.0.0","status":"complete"}',
                base+prefix+'/resource-001.hia.json': json.dumps(document).encode(),
                base+prefix+'/resource-001.doc-source-map.json': json.dumps(source_map).encode(),
                base+prefix+'/resource-001.source.json': b'{}',
                base+'entry.html': b'Entry',
                base+'sources/a.txt': b'{}',
                base+'sources/a.html': b'<span id="L1">{}</span>'
            })
        if change:
            change(files,part)
        archive = root/'site.tar'
        with tarfile.open(archive,'w') as bundle:
            for name,body in files.items():
                member = tarfile.TarInfo(name)
                member.size = len(body)
                if linked and name == 'index.html':
                    member.type = tarfile.SYMTYPE
                    member.linkname = '/outside'
                bundle.addfile(member,io.BytesIO(body))
        packed = root/'site.tar.gz'
        with archive.open('rb') as original,gzip.open(packed,'wb') as target:
            target.write(original.read())
        report = {
            'sourceRepository': 'mandolin/HIA-Documentation',
            'sourceCommit': 'a'*40, 'registrySha256': 'b'*64,
            'site': site, 'partitions': [part], 'files': len(files),
            'bytes': sum(map(len,files.values())),
            'inventory': [
                {'path':name, 'bytes':len(body), 'sha256':hashlib.sha256(body).hexdigest()}
                for name,body in files.items()
            ]
        }
        report_path = root/'report.json'
        report_path.write_text(json.dumps(report),encoding='utf-8')
        snapshot = {
            'site': 'core', 'publicationRepository': site['repository'],
            'repository': report['sourceRepository'], 'commit': report['sourceCommit'],
            'registrySha256': report['registrySha256'],
            'files': report['files'], 'bytes': report['bytes'],
            'gzipSha256': digest(packed), 'tarSha256': digest(archive),
            'tarBytes': archive.stat().st_size, 'reportSha256': digest(report_path)
        }
        return snapshot,packed,report_path,root/'output',registry

    def test_valid(self):
        """有效双语归档完整展开。 Extract a complete valid bilingual archive."""
        prepare(*self.fixture())

    def test_unknown_member(self):
        """未声明资源导出拒绝。 Reject an undeclared resource export."""
        args=self.fixture(change=lambda files,part:part['resources'][0].update(subpath='./other.json'))
        with self.assertRaisesRegex(ValueError,'membership'):
            prepare(*args)
        self.assertFalse(args[3].exists())

    def test_missing_source(self):
        """缺真实来源目标拒绝。 Reject a missing real source target."""
        args=self.fixture(change=lambda files,part:files.pop('schemas/demo/en/sources/a.txt'))
        with self.assertRaisesRegex(ValueError,'target'):
            prepare(*args)

    def test_private_path(self):
        """越界或未计划路径拒绝。 Reject escaping or unplanned paths."""
        for name in ['../outside','other/file','schemas/demo/en/.secret']:
            with self.subTest(name=name):
                args=self.fixture(change=lambda files,part:files.update({name:b'rejected'}))
                with self.assertRaisesRegex(ValueError,'archive member'):
                    prepare(*args)

    def test_link(self):
        """符号链接归档拒绝。 Reject symlink archive members."""
        with self.assertRaisesRegex(ValueError,'archive member'):
            prepare(*self.fixture(linked=True))

    def test_resource_artifact_escape(self):
        """资源记录的越界在读取前拒绝。 Reject resource-record escapes before reading files."""
        args=self.fixture(change=lambda files,part:part['resources'][0].update(prefix='../../outside'))
        with self.assertRaisesRegex(ValueError,'artifact path'):
            prepare(*args)

    def test_root_entry_required(self):
        """缺发布根入口拒绝。 Reject a missing publication root entry."""
        args=self.fixture(change=lambda files,part:files.pop('index.html'))
        with self.assertRaisesRegex(ValueError,'inventory'):
            prepare(*args)

    def test_source_attributes(self):
        """来源属性只允许固定字节。 Require fixed source-attribute bytes."""
        args=self.fixture(change=lambda files,part:files.update({'schemas/demo/en/.gitattributes':b'* text\n'}))
        with self.assertRaisesRegex(ValueError,'source attributes'):
            prepare(*args)

    def test_changed_snapshot(self):
        """归档或报告摘要变更拒绝。 Reject changed archive or report digests."""
        for key in ['gzipSha256','reportSha256','tarSha256']:
            args=self.fixture()
            args[0][key]='0'*64
            with self.assertRaisesRegex(ValueError,'digest mismatch'):
                prepare(*args)

    def test_invalid_scope_and_budget(self):
        """错误站点及容量拒绝。 Reject wrong sites and capacity limits."""
        for key,value in [('site','unknown'),('publicationRepository','mandolin/other'),('bytes',1_000_000_001),('files',100001),('tarBytes',2*1024**3+1)]:
            args=self.fixture()
            args[0][key]=value
            with self.assertRaises(ValueError):
                prepare(*args)


if __name__ == '__main__':
    unittest.main()
