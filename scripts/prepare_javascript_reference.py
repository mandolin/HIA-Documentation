"""核验固定JavaScript参考发布归档及原生/资源/完整源码内容。 Verify pinned JavaScript reference archives and native/resource/full-source contents."""
import gzip
import json
from pathlib import Path
import re
import shutil
import sys
import tarfile
import tempfile
from prepare_resource_reference import require, digest, valid_path


def read(file):
    """按UTF-8读取发布JSON。 Read publication JSON as UTF-8."""
    return json.loads(file.read_text(encoding='utf-8'))


def check_site(site, report, definition):
    """核两语原字段、原生地图、目标及完整源；容量由外层归档门禁核对。 Check both locales' original fields, native maps, targets and complete sources; outer archive guards verify capacity."""
    roots = [definition['path'] + locale for locale in ('zh-CN', 'en')]
    rows = report['rows'] + report['resources'] + report['dataRows']
    for locale in ('zh-CN', 'en'):
        root = site / definition['path'] / locale
        prefix = definition['path'] + locale + '/'
        index = read(root / 'project-index.json')
        require(index['contract'] == 'hia-project-navigation-index' and index['contractVersion'] == '0.2.0-draft'
                and index['project']['id'] == 'project:hia-' + definition['id'], 'Unexpected JavaScript project identity.')
        entries = {(entry.get('identityScope'), entry['symbolId']): entry for entry in index['entries']}
        require(len(entries) == len(index['entries']) == report['entriesPerLocale'], 'Incomplete or duplicate JavaScript entries.')
        require(read(root / 'documentation-ui-locale-completeness.json')['status'] == 'complete', 'Incomplete interface messages.')
        # 中文。原字段、原生工件和映射逐节点匹配，语义核对与归档摘要分别保留。 English. Match original fields, native artifacts and maps per node, retaining semantic checks separately from archive hashes.
        covered = set()
        for row in rows:
            require(valid_path(prefix + row['documentPath'], roots) and valid_path(prefix + row['mapPath'], roots), 'Unsafe native artifact path.')
            document = read(root / row['documentPath'])
            source_map = read(root / row['mapPath'])
            mappings = {mapping['symbolId']: mapping for mapping in source_map['entries'] if mapping.get('symbolId')}
            require(len(document['symbols']) == row['symbols'], 'Unexpected native symbol count.')
            if row in report['rows']:
                native_root = (root / row['documentPath']).parent
                require((native_root / 'native.hia.json').is_file(), 'Missing original core document.')
                integration = read(native_root / 'hia-integration.json')
                require(integration['contract'] == 'hia-jsdoc-integration' and integration['contractVersion'] == '0.1.0', 'Missing native JSDoc integration.')
            for symbol in document['symbols']:
                key = (row['identityScope'], symbol['id'])
                entry = entries.get(key)
                require(entry is not None and key not in covered and entry['input']['path'] == row['documentPath'], 'Missing or duplicate scoped declaration.')
                for field in ('name', 'kind', 'signature', 'summary', 'i18n'):
                    require(entry.get(field) == symbol.get(field), 'Original declaration field changed.')
                require(entry.get('hierarchy', {}).get('parentSymbolId') == symbol.get('parentId'), 'Original hierarchy changed.')
                mapping = mappings.get(symbol['id'])
                require(mapping and entry['docSourceMap']['entryId'] == mapping['id'], 'Original mapping changed.')
                if mapping['sourceRefs']:
                    require(entry['docSourceMap']['sourceRange'] == mapping['sourceRefs'][0]['range'], 'Original source range changed.')
                covered.add(key)
        require(covered == entries.keys(), 'Unaccounted project entries.')
        for entry in entries.values():
            targets = [entry['contentPath'], entry['noScriptPagePath'], *[page['path'] for page in entry['noScriptLocalePages']]]
            source = entry.get('source', {})
            targets.extend(source[key] for key in ('fetchUrl', 'linkUrl') if source.get(key))
            for target in targets:
                route = target.split('#')[0]
                require(valid_path(prefix + route, roots) and (root / route).is_file(), 'Missing or unsafe entry target.')
        expected_sources = [{**source, 'path': 'source-files/' + source['source']} for source in report['fullSources']]
        require(read(root / 'source-files/index.json')['sources'] == expected_sources, 'Unexpected complete-source manifest.')
        for source in expected_sources:
            require(valid_path(prefix + source['path'], roots) and (root / source['path']).stat().st_size == source['byteLength']
                    and digest(root / source['path']) == source['sha256'], 'Complete-source bytes changed.')
        if definition['id'] == 'javascript-api':
            bindings = read(root / 'package-api-bindings.json')['bindings']
            require(len(bindings) == report['bindingsPerLocale']
                    and {binding['package'] for binding in bindings} == {pack['name'] for pack in report['packages']}, 'Incomplete public package bindings.')
            for binding in bindings:
                for destination in binding['destinations']:
                    entry = entries.get((destination['identityScope'], destination['symbolId']))
                    require(entry and entry['contentPath'] == destination['content'] and entry['noScriptPagePath'] == destination['page'], 'Public binding destination changed.')


def prepare(snapshot, archive, report_path, output, registry=None):
    """固定来源和全部摘要后逐文件展开，任何失败保留先前输出。 Pin source and all digests before per-file extraction, retaining prior output on any failure."""
    registry_path = Path(__file__).resolve().parent.parent / 'reference/javascript-reference-inputs.json'
    if registry is None:
        registry = read(registry_path)
        require(digest(registry_path) == snapshot['registrySha256'], 'Unexpected JavaScript registry revision.')
    definition = next((site for site in registry['sites'] if site['id'] == snapshot['site']), None)
    require(definition and definition['repository'] == snapshot['publicationRepository'], 'Unexpected publication repository.')
    require(definition['path'] == ('' if definition['id'] == 'javascript-api' else 'derivation-evidence/'), 'Unexpected publication route.')
    roots = [definition['path'] + locale for locale in ('zh-CN', 'en')]
    require(not output.exists() and not output.is_symlink(), 'Output already exists.')
    require(0 < snapshot['tarBytes'] <= 2 * 1024**3 and 0 < snapshot['bytes'] <= 1_000_000_000
            and 0 < snapshot['files'] <= 100000, 'Snapshot exceeds publication budget.')
    require(digest(archive) == snapshot['gzipSha256'] and digest(report_path) == snapshot['reportSha256'], 'Snapshot digest mismatch.')
    report = read(report_path)
    require(report['sourceRepository'] == snapshot['repository'] == 'mandolin/HIA-Documentation'
            and report['sourceCommit'] == snapshot['commit'] and re.fullmatch('[0-9a-f]{40}', snapshot['commit'])
            and report['registrySha256'] == snapshot['registrySha256'] and report['site'] == definition, 'Unexpected source or publication identity.')
    require(sorted(pack['name'] for pack in report['packages']) == sorted(registry['packages'])
            and len({pack['name'] for pack in report['packages']}) == len(registry['packages']), 'Unexpected package scope.')
    expected = {item['path']: item for item in report['inventory']}
    require(len(expected) == len(report['inventory']) == snapshot['files'] == report['files']
            and report['bytes'] == snapshot['bytes'] and 'index.html' in expected, 'Unexpected report inventory.')
    with tempfile.TemporaryDirectory(dir=output.parent) as scratch:
        scratch = Path(scratch)
        tar_path = scratch / 'verified.tar'
        with gzip.open(archive, 'rb') as source, tar_path.open('wb') as destination:
            # 中文。限定gzip展开字节，完整TAR哈希通过后才解释成员。 English. Bound gzip expansion and verify the complete TAR digest before interpreting members.
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
                require(name in expected and member.size == expected[name]['bytes'] and member.size <= 32 * 1024**2, 'Unexpected archive file.')
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
        check_site(stage, report, definition)
        stage.rename(output)
    print(f'Validated {len(seen)} JavaScript reference files and {total} bytes at {snapshot["commit"]}.')


if __name__ == '__main__':
    manifest, archive_path, report, output_path = map(Path, sys.argv[1:])
    prepare(read(manifest), archive_path, report, output_path)
