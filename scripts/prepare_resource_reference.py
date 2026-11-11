"""核验固定资源发布归档并原子展开。 Verify and atomically unpack a pinned resource-reference archive."""
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile


def require(condition, message):
    """检查公开发布不变量。 Enforce publication invariants."""
    if not condition:
        raise ValueError(message)


def digest(file):
    """逐块计算文件摘要。 Digest file bytes with bounded memory."""
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def valid_path(name, roots):
    """限制为明确语言根或根入口，点文件仅用于固定来源属性。 Bound paths to explicit locale roots and fixed root/source metadata."""
    route = PurePosixPath(name)
    attributes = {root + '/.gitattributes' for root in roots}
    return (name == route.as_posix() and not route.is_absolute() and '..' not in route.parts
            and not any(char in name for char in '\\:%?#')
            and all(not part.startswith('.') or name == '.nojekyll' or name in attributes for part in route.parts)
            and (name in ('index.html', '.nojekyll') or any(name.startswith(root + '/') for root in roots)))


def value_count(value):
    """递归计JSON值，属性名称不作为独立值。 Count JSON values, excluding property names as separate values."""
    if isinstance(value, dict):
        return 1 + sum(value_count(item) for item in value.values())
    if isinstance(value, list):
        return 1 + sum(value_count(item) for item in value)
    return 1


def check_partition(site, part, definition, roots):
    """核双语每个值、原文和来源目标。 Verify every bilingual value, original snapshot and source target."""
    expected_exports = {(item['package'], item['subpath']): item for item in definition['exports']}
    resources = {(item['package'], item['subpath']): item for item in part['resources']}
    require(len(resources) == len(part['resources']) and resources.keys() == expected_exports.keys(), 'Unexpected resource membership.')
    require(sorted(part['sourcePolicy']['paths']) == sorted(item['source'] for item in expected_exports.values())
            and part['sourcePolicy']['maxLines'] == 400 and part['sourcePolicy']['presentation'] == 'fetch', 'Unexpected source policy.')
    for locale in ('zh-CN', 'en'):
        root = site / definition['path'] / locale
        index = json.loads((root / 'project-index.json').read_text(encoding='utf-8'))
        require(index['contract'] == 'hia-project-navigation-index' and index['contractVersion'] == '0.1.0-draft'
                and index['project']['id'] == part['projectId'], 'Unexpected resource index identity.')
        require(part['projectId'] == 'project:hia-resource-' + part['id'], 'Unexpected project identity.')
        require(len(index['entries']) == part['values'] and len({entry['id'] for entry in index['entries']}) == part['values'], 'Incomplete resource index.')
        ui = json.loads((root / 'documentation-ui-locale-completeness.json').read_text(encoding='utf-8'))
        require(ui['contract'] == 'documentation-ui-locale-completeness' and ui['contractVersion'] == '1.0.0' and ui['status'] == 'complete', 'Incomplete interface messages.')
        seen = set()
        for identity, resource in resources.items():
            require(resource['source'] == expected_exports[identity]['source'] and resource['locale'] == 'und', 'Unexpected resource source identity.')
            # 中文。原文和原生文件都受归档摘要保护，这里再核真实JSON值与索引投影。 English. Native bytes are archive-pinned; also check actual JSON values and index projections.
            prefix = resource['prefix']
            require(all(valid_path(definition['path'] + locale + '/' + prefix + '/' + name, roots)
                        for name in ('resource-001.source.json', 'resource-001.hia.json', 'resource-001.doc-source-map.json')), 'Invalid resource artifact path.')
            snapshot = root / prefix / 'resource-001.source.json'
            require(digest(snapshot) == resource['sha256'], 'Unexpected resource snapshot.')
            document = json.loads((root / prefix / 'resource-001.hia.json').read_text(encoding='utf-8'))
            source_map = json.loads((root / prefix / 'resource-001.doc-source-map.json').read_text(encoding='utf-8'))
            require(document['schemaVersion'] == '1.0.0' and document['defaultLocale'] == 'und'
                    and source_map['contract'] == 'doc-source-map' and source_map['contractVersion'] == '1.1.0', 'Unexpected native identities.')
            require(document['metadata']['jsonResource']['sha256'] == resource['sha256']
                    and document['metadata']['jsonResource']['path'] == resource['source'], 'Unexpected original provenance.')
            mapped = {entry['symbolId']: entry for entry in source_map['entries']}
            source_records = {source['id']: source for source in source_map['sources']}
            require(len(mapped) == len(source_map['entries']) == resource['values']
                    and all(source['path'] == resource['source'] and source['sourcesContentPolicy'] == 'none' for source in source_records.values()), 'Unexpected native source map.')
            symbols = {symbol['id']: symbol for symbol in document['symbols']}
            entries = [entry for entry in index['entries'] if entry['input']['path'] == prefix + '/resource-001.hia.json']
            require(len(symbols) == len(document['symbols']) == len(entries) == resource['values']
                    == value_count(json.loads(snapshot.read_bytes())), 'Incomplete resource values.')
            require({entry['symbolId'] for entry in entries} == symbols.keys(), 'Missing resource symbol.')
            require(mapped.keys() == symbols.keys(), 'Missing native source symbol.')
            for entry in entries:
                symbol = symbols[entry['symbolId']]
                require(all(entry.get(key) == symbol.get(key) for key in ('name', 'kind', 'signature'))
                        and entry.get('hierarchy', {}).get('parentSymbolId') == symbol.get('parentId'), 'Altered resource declaration.')
                source = entry['source']
                references = mapped[entry['symbolId']]['sourceRefs']
                require(len(references) == 1 and references[0]['sourceId'] in source_records
                        and references[0]['range'] == symbol['source']['definedIn']['range']
                        and references[0]['rangeConvention'] == {'endBoundary':'exclusive','columnUnit':'utf16-code-unit'}, 'Altered native source range.')
                require(source['path'] == resource['source'] and entry['docSourceMap']['sourcePath'] == resource['source']
                        and entry['docSourceMap']['sourceRange'] == symbol['source']['definedIn']['range'], 'Altered source coordinates.')
                targets = [entry['contentPath'], entry['noScriptPagePath'], *[page['path'] for page in entry['noScriptLocalePages']], entry['docSourceMap']['path'], source['fetchUrl'], source['linkUrl']]
                for target in targets:
                    route = target.split('#')[0]
                    require(valid_path(definition['path'] + locale + '/' + route, roots) and (root / route).is_file(), 'Missing resource target.')
                seen.add(entry['id'])
        require(len(seen) == part['values'], 'Unaccounted resource entries.')


def prepare(snapshot, archive, report_path, output, registry=None):
    """先核来源、边界、压缩/TAR/每文件摘要，再展开到独占暂存并提交。 Verify source, boundaries and all digests before atomically publishing an exclusive stage."""
    registry_path = Path(__file__).resolve().parent.parent / 'reference/resource-reference-partitions.json'
    if registry is None:
        registry = json.loads(registry_path.read_text(encoding='utf-8'))
        require(digest(registry_path) == snapshot['registrySha256'], 'Unexpected registry revision.')
    site = next((item for item in registry['sites'] if item['id'] == snapshot['site']), None)
    require(site and site['repository'] == snapshot['publicationRepository'], 'Unexpected publication repository.')
    definitions = [next(part for part in registry['partitions'] if part['id'] == identity) for identity in site['partitions']]
    require(all(re.fullmatch(r'(?:[a-z0-9]+(?:-[a-z0-9]+)*/)+', part['path']) for part in definitions), 'Invalid publication roots.')
    roots = [part['path'] + locale for part in definitions for locale in ('zh-CN', 'en')]
    require(not output.exists() and not output.is_symlink(), 'Output already exists.')
    require(0 < snapshot['tarBytes'] <= 2 * 1024**3 and 0 < snapshot['bytes'] <= 1_000_000_000
            and 0 < snapshot['files'] <= 100000, 'Snapshot exceeds publication budget.')
    require(digest(archive) == snapshot['gzipSha256'] and digest(report_path) == snapshot['reportSha256'], 'Snapshot digest mismatch.')
    report = json.loads(report_path.read_text(encoding='utf-8'))
    require(report['sourceRepository'] == snapshot['repository'] == 'mandolin/HIA-Documentation'
            and report['sourceCommit'] == snapshot['commit'] and re.fullmatch('[0-9a-f]{40}', snapshot['commit'])
            and report['registrySha256'] == snapshot['registrySha256'] and report['site'] == site, 'Unexpected source revision or site.')
    require([part['id'] for part in report['partitions']] == site['partitions'], 'Unexpected partition scope.')
    expected = {item['path']: item for item in report['inventory']}
    require(len(expected) == len(report['inventory']) == snapshot['files'] == report['files']
            and report['bytes'] == snapshot['bytes'] and 'index.html' in expected, 'Unexpected report inventory.')
    with tempfile.TemporaryDirectory(dir=output.parent) as scratch:
        scratch = Path(scratch)
        tar_path = scratch / 'verified.tar'
        with gzip.open(archive, 'rb') as source, tar_path.open('wb') as destination:
            # 中文。固定展开预算限制gzip膨胀，随后再核完整TAR摘要。 English. Bound gzip expansion before verifying the complete TAR digest.
            remaining = snapshot['tarBytes']
            while remaining:
                block = source.read(min(remaining, 1024**2))
                require(block, 'Truncated snapshot.')
                destination.write(block)
                remaining -= len(block)
            require(not source.read(1), 'Expanded snapshot exceeds its declaration.')
        require(digest(tar_path) == snapshot['tarSha256'], 'TAR digest mismatch.')
        stage = scratch / 'site'
        stage.mkdir()
        seen = set()
        total = 0
        with tarfile.open(tar_path, 'r:') as bundle:
            for member in bundle:
                name = member.name
                require(valid_path(name, roots) and member.isfile() and name not in seen, 'Invalid or duplicate archive member.')
                require(name in expected and member.size == expected[name]['bytes'] and member.size <= 32*1024**2, 'Unexpected archive file.')
                target = stage / name
                target.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(member) as source, target.open('xb') as destination:
                    shutil.copyfileobj(source, destination)
                require(digest(target) == expected[name]['sha256'], 'Published file digest mismatch.')
                if name.endswith('/.gitattributes'):
                    require(target.read_bytes() == b'sources/*.txt -text\n', 'Unexpected source attributes.')
                seen.add(name)
                total += member.size
        require(seen == expected.keys() and total == snapshot['bytes'], 'Incomplete snapshot.')
        for part, definition in zip(report['partitions'], definitions, strict=True):
            require(part['path'] == definition['path'], 'Unexpected partition route.')
            check_partition(stage, part, definition, roots)
        stage.rename(output)
    print(f'Validated {len(seen)} resource files and {total} bytes at {snapshot["commit"]}.')


if __name__ == '__main__':
    manifest, archive_path, report, output_path = map(Path, sys.argv[1:])
    prepare(json.loads(manifest.read_text(encoding='utf-8')), archive_path, report, output_path)
