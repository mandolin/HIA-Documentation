"""核验JavaScript源码工具包（含HTML、CSS与DotNetDoc工具）的固定原生API归档、资源和完整源码。 Verify pinned native API archives, resources and complete sources for JavaScript-source tool packages, including HTML, CSS and DotNetDoc tools."""
import gzip
import json
from pathlib import Path
import re
import shutil
import sys
import tarfile
import tempfile
import copy
from prepare_resource_reference import require, digest, valid_path


def read(file):
    """按UTF-8读取发布JSON。 Read publication JSON as UTF-8."""
    return json.loads(file.read_text(encoding='utf-8'))


def command_facts(model, prefix, value):
    """独立重建命令事实字段，原本地化正文保持。 / Independently reconstruct command fact fields, retaining localized prose."""
    if isinstance(value, (dict, list)):
        root = prefix in ('command', 'parameter')
        if not root and isinstance(value, dict) and value.get('i18n'):
            for name, field in value['i18n']['fields'].items():
                key = prefix + '.' + name
                require(key not in model['fields'], 'Command field collision.')
                model['fields'][key] = {**copy.deepcopy(field), 'fieldPath': key}
        for name, item in (value.items() if isinstance(value, dict) else enumerate(value)):
            if name in ('i18n', 'evidence') or (root and name in ('id', 'executable', 'path', 'kind', 'signature', 'options', 'positionals')):
                continue
            command_facts(model, prefix + '.' + str(name), item)
        return
    require(prefix not in model['fields'], 'Command field collision.')
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    model['fields'][prefix] = {'fieldPath': prefix, 'kind': 'text', 'defaultLocale': model['defaultLocale'], 'localizedText': {locale: text for locale in model['locales']}}


def project_command_document(native, description, source_prefix):
    """独立核宿主投影仅限定路径并附加原契约事实。 / Independently check that host projection qualifies paths and adds existing contract facts."""
    document = copy.deepcopy(native)
    for symbol in document['symbols']:
        source = symbol['source']['definedIn']
        source['relativePath'] = source_prefix + '/' + source['relativePath']
        identity = symbol['metadata']['commandDocumentation']
        command = next((item for item in description['commands'] if item['id'] == identity.get('commandId', identity['nativeId'])), None)
        require(command is not None, 'Unknown native command identity.')
        parameter = next((item for item in command['options'] + command['positionals'] if item['id'] == identity['nativeId'] and item['kind'] == identity['kind']), None) if 'commandId' in identity else None
        require('commandId' not in identity or parameter is not None, 'Unknown command parameter identity.')
        command_facts(symbol['i18n'], 'command.owner', description['owner'])
        command_facts(symbol['i18n'], 'parameter' if parameter is not None else 'command', parameter if parameter is not None else command)
        if parameter is None:
            for item in command['options'] + command['positionals']:
                key = 'parameters.' + ('--' if item['kind'] == 'option' else '') + item['name'] + '.summary'
                require(key not in symbol['i18n']['fields'], 'Command parameter field collision.')
                symbol['i18n']['fields'][key] = {**copy.deepcopy(item['i18n']['fields']['description']), 'fieldPath': key}
    return document


def check_command_rows(root, report, definition, entries):
    """按已确认owner站核命令原件、来源、投影及覆盖，旧报告缺省为空。 / Check native commands, sources, projections and coverage under confirmed owner sites, defaulting to empty for legacy reports."""
    rows = report.get('commandRows', [])
    if not rows:
        return set()
    owners = {'javascript-api': ('hia-jsdoc', 'jsdoc-runner', ['hia-jsdoc']), 'html-api': ('hia-htmdoc', 'htmdoc-runner', ['htmdoc', 'htmdoc-handoff']), 'css-api': ('hia-cssdoc', 'cssdoc-runner', ['cssdoc']), 'dotnet-api': ('hia-dotnetdoc', 'dotnetdoc-runner', ['hia-dotnetdoc', 'dotnetdoc'])}
    require(definition['id'] in owners and len(rows) == 1, 'Unexpected command publication owner.')
    owner, runner, bins = owners[definition['id']]
    require(read(root / 'commands/adoption.json')['rows'] == rows, 'Command adoption record changed.')
    row = rows[0]
    source_prefix = 'HIA/' + owner + '/packages/' + runner
    require(row['owner'] == owner and row['package'] == '@hia-doc/' + runner and row['sourcePrefix'] == source_prefix and row['bins'] == bins, 'Command source ownership changed.')
    token = {'javascript-api': 'hia-jsdoc', 'html-api': 'htmdoc', 'css-api': 'cssdoc', 'dotnet-api': 'dotnetdoc'}[definition['id']]
    base = 'commands/' + token
    require(row['documentPath'] == base + '/document.hia.json'
            and sorted(artifact['path'] for artifact in row['artifacts']) == sorted(base + '/' + name for name in ('description.json', 'observations.json', 'document.native.hia.json', 'document.hia.json')), 'Unsafe command artifact selection.')
    # 中文。原工件通过明确清单和归档摘要绑定，命令不使用伪造的普通地图。 English. Explicit inventories and archive digests bind native artifacts; commands do not invent ordinary source maps.
    for artifact in row['artifacts']:
        file = root / artifact['path']
        require(file.is_file() and digest(file) == artifact['sha256'], 'Command artifact bytes changed.')
    directory = (root / row['documentPath']).parent
    description = read(directory / 'description.json')
    native = read(directory / 'document.native.hia.json')
    document = read(root / row['documentPath'])
    require(description['contract'] == 'command-documentation' and description['contractVersion'] == '0.1.0-draft' and description['owner'] == {'packageName': row['package'], 'packageVersion': row['version']}, 'Unexpected command description identity.')
    require(native['metadata']['commandDocumentation']['artifact'] == description, 'Native command description changed.')
    require(native['schemaVersion'] == '1.0.0', 'Unexpected native command document version.')
    require(len(description['commands']) == row['commands'] and len(document['symbols']) == row['symbols'], 'Incomplete command coverage.')
    require(sorted({command['executable'] for command in description['commands']}) == sorted(bins), 'Command invocation inventory changed.')
    for source in description['sources']:
        require(valid_path('en/' + source_prefix + '/' + source['path'], ['en']), 'Unsafe command source path.')
        require(any(item['source'] == source_prefix + '/' + source['path'] and item['sha256'] == source['sha256'] for item in report['fullSources']), 'Command source digest is missing.')
    require(project_command_document(native, description, source_prefix) == document, 'Command website projection changed.')
    covered = set()
    for symbol in document['symbols']:
        key = (None, symbol['id'])
        entry = entries.get(key)
        require(entry is not None and key not in covered and entry['input']['path'] == row['documentPath'], 'Missing or duplicate command entry.')
        for field in ('name', 'kind', 'signature', 'summary', 'i18n'):
            require(entry.get(field) == symbol.get(field), 'Command field changed.')
        require(entry.get('hierarchy', {}).get('parentSymbolId') == symbol.get('parentId'), 'Command hierarchy changed.')
        require(entry['source']['path'] == symbol['source']['definedIn']['relativePath'] and entry['source']['range']['start']['line'] == symbol['source']['definedIn']['position']['line'], 'Command source anchor changed.')
        covered.add(key)
    return covered


def check_site(site, report, definition):
    """核两语原字段、原生地图、目标及完整源；容量由外层归档门禁核对。 Check both locales' original fields, native maps, targets and complete sources; outer archive guards verify capacity."""
    roots = [definition['path'] + locale for locale in ('zh-CN', 'en')]
    declarations = report.get('declarations', [])
    rows = report['rows'] + report['resources'] + report['dataRows'] + declarations
    for locale in ('zh-CN', 'en'):
        root = site / definition['path'] / locale
        prefix = definition['path'] + locale + '/'
        index = read(root / 'project-index.json')
        require(index['contract'] == 'hia-project-navigation-index' and index['contractVersion'] == '0.2.0-draft'
                and index['project']['id'] == 'project:hia-' + definition['id'], 'Unexpected native API project identity.')
        entries = {(entry.get('identityScope'), entry['symbolId']): entry for entry in index['entries']}
        require(len(entries) == len(index['entries']) == report['entriesPerLocale'], 'Incomplete or duplicate native API entries.')
        require(read(root / 'documentation-ui-locale-completeness.json')['status'] == 'complete', 'Incomplete interface messages.')
        # 中文。原字段、原生工件和映射逐节点匹配，语义核对与归档摘要分别保留。 English. Match original fields, native artifacts and maps per node, retaining semantic checks separately from archive hashes.
        covered = set()
        # 中文。原声明导出单独关联到其作用域和模块，防止只核条目数量而丢失类型入口。 English. Associate original declaration exports by scope/module so entry counts cannot conceal missing type entry points.
        declaration_exports = {}
        origins = report.get('sourceOrigins', {})
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
            if row in declarations:
                for key in ('extractionPath', 'bridgePath'):
                    require(valid_path(prefix + row[key], roots), 'Unsafe declaration artifact path.')
                extraction = read(root / row['extractionPath'])
                bridge = read(root / row['bridgePath'])
                require(extraction.get('contract') == 'hia-tsdoc-extraction' and extraction.get('contractVersion') == '0.4.0-draft'
                        and bridge.get('contract') == 'hia-ts-jsdoc-bridge' and bridge.get('contractVersion') == '0.4.0-draft'
                        and document.get('schemaVersion') == '0.2.0' and source_map.get('contract') == 'doc-source-map'
                        and source_map.get('contractVersion') == '1.1.0', 'Unexpected declaration artifact identity.')
                symbols = {symbol['id'] for symbol in document['symbols']}
                for module in extraction['modules']:
                    require(origins.get(module['path']) == 'HIA/' + row['owner'] + '/' + module['path'], 'Unexpected declaration source ownership.')
                    for binding in module['exports']:
                        key = (row['identityScope'], module['path'], binding['name'])
                        require(key not in declaration_exports and binding['symbolIds'] and set(binding['symbolIds']) <= symbols, 'Invalid original declaration binding.')
                        declaration_exports[key] = set(binding['symbolIds'])
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
                if row in declarations and entry.get('source', {}).get('path'):
                    require(origins.get(entry['source']['path']) == 'HIA/' + row['owner'] + '/' + entry['source']['path'], 'Unexpected declaration source ownership.')
                covered.add(key)
        command_entries = check_command_rows(root, report, definition, entries)
        require(not covered.intersection(command_entries), 'Duplicate command coverage.')
        covered.update(command_entries)
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
        # 中文。逻辑源码别名必须在已核完整源清单中，并准确属于本声明owner。 English. Logical source aliases must occur in the verified complete-source manifest and exactly belong to a declaration owner.
        source_names = {source['source'] for source in report['fullSources']}
        for alias, original in origins.items():
            require(alias in source_names and valid_path(prefix + 'source-files/' + alias, roots)
                    and any(original == 'HIA/' + row['owner'] + '/' + alias for row in declarations), 'Unexpected declaration source ownership.')
        if definition['id'] in ('javascript-api', 'html-api', 'css-api', 'dotnet-api'):
            bindings = read(root / 'package-api-bindings.json')['bindings']
            require(len(bindings) == report['bindingsPerLocale']
                    and {binding['package'] for binding in bindings} == {pack['name'] for pack in report['packages']}, 'Incomplete public package bindings.')
            covered_exports = set()
            for binding in bindings:
                require(binding['destinations'], 'Empty public binding destinations.')
                for destination in binding['destinations']:
                    entry = entries.get((destination['identityScope'], destination['symbolId']))
                    require(entry and entry['contentPath'] == destination['content'] and entry['noScriptPagePath'] == destination['page'], 'Public binding destination changed.')
                for scope in {destination['identityScope'] for destination in binding['destinations']} & {row['identityScope'] for row in declarations}:
                    key = (scope, binding.get('module'), binding.get('exportName'))
                    actual = [destination['symbolId'] for destination in binding['destinations'] if destination['identityScope'] == scope]
                    require(key in declaration_exports and len(actual) == len(set(actual)) and set(actual) == declaration_exports[key], 'Original declaration binding changed.')
                    covered_exports.add(key)
            require(covered_exports == declaration_exports.keys(), 'Incomplete original declaration bindings.')


def prepare(snapshot, archive, report_path, output, registry=None):
    """固定来源和全部摘要后逐文件展开，任何失败保留先前输出。 Pin source and all digests before per-file extraction, retaining prior output on any failure."""
    # 中文。HTML/CSS选择各自已确认独立清单，既有JavaScript/证据入口继续读取原清单；实际原字节必须匹配固定摘要。 English. HTML/CSS select their confirmed independent registries; existing JavaScript/evidence entries retain their registry, with exact bytes pinned by digest.
    registry_name = {'html-api': 'html-reference-inputs.json', 'css-api': 'css-reference-inputs.json', 'dotnet-api': 'dotnet-reference-inputs.json'}.get(snapshot['site'], 'javascript-reference-inputs.json')
    registry_path = Path(__file__).resolve().parent.parent / 'reference' / registry_name
    if registry is None:
        registry = read(registry_path)
        require(digest(registry_path) == snapshot['registrySha256'], 'Unexpected native API registry revision.')
    definition = next((site for site in registry['sites'] if site['id'] == snapshot['site']), None)
    require(definition and definition['repository'] == snapshot['publicationRepository'], 'Unexpected publication repository.')
    require(definition['path'] == ('' if definition['id'] in ('javascript-api', 'html-api', 'css-api', 'dotnet-api') else 'derivation-evidence/'), 'Unexpected publication route.')
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
    print(f'Validated {len(seen)} native API reference files and {total} bytes at {snapshot["commit"]}.')


if __name__ == '__main__':
    manifest, archive_path, report, output_path = map(Path, sys.argv[1:])
    prepare(read(manifest), archive_path, report, output_path)
