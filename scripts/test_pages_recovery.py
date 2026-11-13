"""恢复输入的可信来源与归档拒绝反例。 / Trusted-source and archive rejection regressions for recovery."""
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile
from prepare_pages_recovery import prepare


class RecoveryTests(unittest.TestCase):
    """每个测试独立使用临时小工件。 / Use an isolated small artifact for each test."""
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root=Path(self.directory.name)
        self.run={'id':12,'head_sha':'a'*40,'head_branch':'main','repository':{'id':1,'full_name':'mandolin/HIA-Documentation'},'head_repository':{'full_name':'mandolin/HIA-Documentation'},'path':'.github/workflows/schema-pages.yml','status':'completed','conclusion':'success'}

    def fixture(self,extra=None):
        """生成完整最小ZIP和绑定的平台元数据。 / Generate a complete minimal ZIP and bound platform metadata."""
        files={'index.html':b'<h1>Original</h1>','versions.json':json.dumps({'contract':'hia-reference-version-index','contractVersion':'0.1.0-draft'}).encode(),'reference-pages.json':b'{}','reference-build.json':json.dumps({'contract':'hia-public-reference-build','privacy':{'status':'pass','sourcesContentPolicy':'none'},'sources':[{'repository':'mandolin/HIA-Documentation','commit':'a'*40}]}).encode()}
        tar_path=self.root/'input.tar'
        with tarfile.open(tar_path,'w') as bundle:
            for name,data in files.items():
                item=tarfile.TarInfo(name);item.size=len(data);bundle.addfile(item,io.BytesIO(data))
            if extra:
                bundle.addfile(extra)
        archive=self.root/'input.zip'
        with zipfile.ZipFile(archive,'w') as bundle:
            bundle.write(tar_path,'artifact.tar')
        artifact={'id':33,'name':'github-pages','expired':False,'size_in_bytes':archive.stat().st_size,'digest':'sha256:'+hashlib.sha256(archive.read_bytes()).hexdigest(),'workflow_run':{'id':12,'head_sha':'a'*40,'head_branch':'main','repository_id':1,'head_repository_id':1}}
        return artifact,archive

    def execute(self,artifact,archive):
        """使用独立输出调用正式入口。 / Call the production entry with isolated outputs."""
        return prepare(self.run,artifact,archive,self.root/'retained.tar',self.root/'site')

    def test_complete_original(self):
        artifact,archive=self.fixture();result=self.execute(artifact,archive)
        self.assertEqual(result['files'],4)
        self.assertEqual((self.root/'retained.tar').read_bytes(),(self.root/'input.tar').read_bytes())

    def test_reject_repository(self):
        artifact,archive=self.fixture();self.run['repository']['full_name']='other/repository'
        with self.assertRaisesRegex(ValueError,'repository'):self.execute(artifact,archive)

    def test_reject_failed_or_recursive_run(self):
        artifact,archive=self.fixture();self.run['path']='.github/workflows/restore-pages.yml'
        with self.assertRaisesRegex(ValueError,'successful'):self.execute(artifact,archive)

    def test_reject_wrong_artifact_run(self):
        artifact,archive=self.fixture();artifact['workflow_run']['id']=999
        with self.assertRaisesRegex(ValueError,'source'):self.execute(artifact,archive)

    def test_reject_corrupt_zip_digest(self):
        artifact,archive=self.fixture();artifact['digest']='sha256:'+'0'*64
        with self.assertRaisesRegex(ValueError,'digest'):self.execute(artifact,archive)

    def test_reject_symlink(self):
        member=tarfile.TarInfo('escape');member.type=tarfile.SYMTYPE;member.linkname='../private'
        artifact,archive=self.fixture(member)
        with self.assertRaisesRegex(ValueError,'ordinary'):self.execute(artifact,archive)

    def test_reject_parent_path(self):
        member=tarfile.TarInfo('../escape');member.size=0
        artifact,archive=self.fixture(member)
        with self.assertRaisesRegex(ValueError,'Unsafe'):self.execute(artifact,archive)


if __name__=='__main__':
    unittest.main()
