"""校验同仓成功Pages工件并原样保留TAR用于恢复。 / Verify a successful same-repository Pages artifact and preserve its TAR for recovery."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile
import zipfile


def require(condition, message):
    """固定说明拒绝无效输入。 / Reject invalid input with a fixed message."""
    if not condition:
        raise ValueError(message)


def digest(file):
    """流式核原始字节。 / Hash original bytes with bounded memory."""
    with file.open('rb') as stream:
        return hashlib.file_digest(stream,'sha256').hexdigest()


def prepare(run, artifact, archive, tar_output, output):
    """严格核来源、平台ZIP和普通TAR，原TAR用于重新上传；不执行归档内容。 / Verify origin, platform ZIP, and regular TAR members; retain the original TAR for re-upload without executing archive contents."""
    # <lang><zh-CN>只接受本仓main上正常Pages工作流的成功运行，恢复工作流不能形成来源递归。</zh-CN><en>Accept only successful normal Pages runs on this repository's main branch, excluding recursive restoration sources.</en></lang>
    require(run.get('repository',{}).get('full_name')=='mandolin/HIA-Documentation' and run.get('head_repository',{}).get('full_name')=='mandolin/HIA-Documentation','Unexpected recovery repository.')
    require(run.get('head_branch')=='main' and run.get('path')=='.github/workflows/schema-pages.yml' and run.get('status')=='completed' and run.get('conclusion')=='success','Recovery requires a successful main Pages run.')
    require(isinstance(run.get('id'),int) and re.fullmatch('[0-9a-f]{40}',run.get('head_sha','')),'Invalid recovery source identity.')
    source=artifact.get('workflow_run',{})
    require(artifact.get('name')=='github-pages' and artifact.get('expired') is False and source.get('id')==run['id'] and source.get('head_sha')==run['head_sha'],'Artifact source does not match the selected run.')
    require(source.get('repository_id')==run['repository']['id'] and source.get('head_repository_id')==run['repository']['id'] and source.get('head_branch')=='main','Artifact repository or branch mismatch.')
    require(isinstance(artifact.get('size_in_bytes'),int) and 0<artifact['size_in_bytes']<=2*1024**3,'Artifact ZIP exceeds budget.')
    require(archive.stat().st_size==artifact['size_in_bytes'] and artifact.get('digest')=='sha256:'+digest(archive),'Platform artifact digest mismatch.')
    require(not output.exists() and not output.is_symlink() and not tar_output.exists(),'Recovery output already exists.')
    output.parent.mkdir(parents=True,exist_ok=True)
    tar_output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as zipped:
        require(zipped.namelist()==['artifact.tar'] and zipped.getinfo('artifact.tar').file_size<=2*1024**3,'Unexpected ZIP members or TAR budget.')
        require(zipped.testzip() is None,'Artifact ZIP CRC mismatch.')
        with zipped.open('artifact.tar') as source_stream,tar_output.open('xb') as target:
            shutil.copyfileobj(source_stream,target)
    # <lang><zh-CN>验证结束才原子提升输出目录，失败不会留下可发布的半站。</zh-CN><en>Promote the output directory atomically after verification, keeping failed partial sites unpublished.</en></lang>
    with tempfile.TemporaryDirectory(prefix='pages-recovery-',dir=output.parent) as scratch:
        stage=Path(scratch)/'site'
        stage.mkdir()
        files={}
        total=0
        with tarfile.open(tar_output,'r:') as bundle:
            for member in bundle:
                name=member.name.removeprefix('./')
                if member.isdir() and name in ['','.']:
                    continue
                route=PurePosixPath(name)
                require(name==route.as_posix() and not route.is_absolute() and '..' not in route.parts and not any(char in name for char in '\\:%?#'),'Unsafe recovery archive path.')
                require(all(not part.startswith('.') or part=='.nojekyll' for part in route.parts),'Unexpected hidden recovery path.')
                if member.isdir():
                    continue
                require(member.isfile() and name not in files and 0<=member.size<=32*1024**2,'Recovery requires unique ordinary bounded files.')
                total+=member.size
                require(len(files)<100000 and total<=1_000_000_000,'Expanded recovery site exceeds budget.')
                files[name]=member
            require({'index.html','versions.json','reference-build.json','reference-pages.json'}.issubset(files),'Missing recovery publication metadata.')
            provenance=json.load(bundle.extractfile(files['reference-build.json']))
            require(provenance.get('contract')=='hia-public-reference-build' and provenance.get('privacy',{}).get('status')=='pass' and provenance['privacy'].get('sourcesContentPolicy')=='none','Invalid recovery source policy.')
            require(any(item.get('repository')=='mandolin/HIA-Documentation' and item.get('commit')==run['head_sha'] for item in provenance.get('sources',[])),'Recovered source does not match the selected run.')
            index=json.load(bundle.extractfile(files['versions.json']))
            require((index.get('contract'),index.get('contractVersion')) in [('hia-reference-version-index','0.1.0-draft'),('hia-site-version-index','2.0.0')],'Unknown recovered root identity.')
            if index['contract']=='hia-site-version-index':
                require('official-site.json' in files,'Missing recovered official report.')
                report=json.load(bundle.extractfile(files['official-site.json']))
                require(report.get('format') in ['hia-official-site-composition-report@0.2.0','hia-official-site-composition-report@0.3.0'] and report.get('privacy',{}).get('status')=='pass','Invalid recovered official report.')
            for name,member in files.items():
                target=stage/name
                target.parent.mkdir(parents=True,exist_ok=True)
                with bundle.extractfile(member) as source_stream,target.open('xb') as destination:
                    shutil.copyfileobj(source_stream,destination)
        stage.rename(output)
    return {'run':run['id'],'sourceCommit':run['head_sha'],'artifact':artifact['id'],'platformZipSha256':digest(archive),'tarSha256':digest(tar_output),'tarBytes':tar_output.stat().st_size,'files':len(files),'bytes':total,'rootContract':index['contract']}


if __name__=='__main__':
    run_file,artifact_file,archive_file,tar_file,output_dir=map(Path,sys.argv[1:])
    print(json.dumps(prepare(json.loads(run_file.read_text()),json.loads(artifact_file.read_text()),archive_file,tar_file,output_dir)))
