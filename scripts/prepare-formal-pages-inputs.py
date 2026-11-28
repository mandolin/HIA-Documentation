
"""准备已冻结归档和正式站点的参考基线。 Prepare frozen archives and the reference baseline for the stable site."""
from base64 import b64encode, b64decode
from hashlib import sha256, sha512
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import json
import shutil
import subprocess
import tarfile

from prepare_pages_recovery import prepare

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ROOT / "reference/formal-pages"
STAGING = ROOT / "dist/formal-inputs"
CONSUMER = STAGING / "consumer"

def gh(route, output=None):
    """从固定 GitHub API 取原始数据。 Read original bytes from the fixed GitHub API."""
    args = ["gh", "api", route]
    if output is None:
        return json.loads(subprocess.check_output(args))
    with output.open("xb") as result:
        subprocess.run(args, stdout=result, check=True)

def digest(data):
    """对原始字节计算 SHA-256。 Compute SHA-256 over original bytes."""
    return sha256(data).hexdigest()

def json_file(path):
    """读经版本固定的 JSON。 Read revision-pinned JSON."""
    return json.loads(path.read_bytes())

def root_tree(repository, commit):
    """查 Git 提交的完整目录树。 Query a Git commit's complete directory tree."""
    tree_sha = gh(f"repos/{repository}/git/commits/{commit}")["tree"]["sha"]
    result = gh(f"repos/{repository}/git/trees/{tree_sha}?recursive=1")
    assert not result["truncated"], repository
    return {row["path"]: row["sha"] for row in result["tree"] if row["type"] == "tree"}

def prepare_inputs():
    """成组核冻结、宿主摘要、消费者锁和发布参考来源。 Verify freeze, hosted hashes, consumer lock and reference sources as one cohort."""
    identity = json_file(INPUTS / "identity.json")
    frozen_path = ROOT / "release/stable-publication.json"
    assert digest(frozen_path.read_bytes()) == identity["freezeSha256"]
    frozen = json_file(frozen_path)
    approval = json_file(ROOT / "release/stable-authorization.json")
    assert approval["publicationApproved"] is False and approval["approvedWave"] is None
    registry = json_file(ROOT / "release/prerelease-candidate.json")
    lock_path = INPUTS / "package-lock.json"
    assert digest(lock_path.read_bytes()) == identity["consumerLockSha256"]
    lock = json_file(lock_path)
    archives = CONSUMER / "archives"
    archives.mkdir(parents=True)
    for name in ("package.json", "package-lock.json"):
        shutil.copyfile(INPUTS / name, CONSUMER / name)

    # <lang><zh-CN>先锁定最近成功的预览站字节，再用独立兼容工件配对。</zh-CN><en>Pin the successful preview bytes before pairing with the independent compatibility artifact.</en></lang>
    repo = "mandolin/HIA-Documentation"
    run = gh(f"repos/{repo}/actions/runs/{identity['baseRun']}")
    asset = gh(f"repos/{repo}/actions/artifacts/{identity['baseArtifact']}")
    assert run["head_sha"] == identity["baseCommit"]
    assert asset["digest"] == "sha256:" + identity["baseZipSha256"]
    base_zip = STAGING / "pages-base.zip"
    gh(f"repos/{repo}/actions/artifacts/{asset['id']}/zip", base_zip)
    base = STAGING / "base"
    base_proof = prepare(run, asset, base_zip, STAGING / "base.tar", base)
    ref_path = base / "reference-build.json"
    assert digest(ref_path.read_bytes()) == identity["referenceBuildSha256"]
    current_refs = {row["repository"]: row["commit"] for row in json_file(ref_path)["sources"]}
    before = {row["repository"]: row for row in registry["owners"]}

    # <lang><zh-CN>逐份把托管 ZIP 和 npm 包文件固定到同一份锁，禁止重新打包代替。</zh-CN><en>Bind every hosted ZIP and npm package to the same lock, without substituting repacked files.</en></lang>
    packs = []
    member_count = 0
    for owner in frozen["owners"]:
        repository = owner["repository"]
        source = owner["sourceCommit"]
        artifact = owner["artifactId"]
        locator = gh(f"repos/{repository}/actions/artifacts/{artifact}")
        assert not locator["expired"] and locator["workflow_run"]["id"] == owner["runId"]
        assert locator["workflow_run"]["head_sha"] == owner["buildCommit"]
        assert locator["digest"] == "sha256:" + owner["artifactSha256"]
        bundle = STAGING / f"{artifact}.zip"
        gh(f"repos/{repository}/actions/artifacts/{artifact}/zip", bundle)
        assert digest(bundle.read_bytes()) == owner["artifactSha256"]
        input_owner = before[repository]
        assert input_owner["sourceCommit"] == source
        source_ref = current_refs.get(repository)
        if source_ref is not None:
            frozen_tree = root_tree(repository, source)
            live_tree = root_tree(repository, source_ref)
        with ZipFile(bundle) as archive:
            assert archive.testzip() is None
            assert sorted(archive.namelist()) == sorted(["stable-preflight-receipt.json", *(x["file"] for x in owner["archives"])])
            frozen_receipt = json.loads(archive.read("stable-preflight-receipt.json"))
            assert frozen_receipt["sourceCommit"] == source and frozen_receipt["repository"] == repository
            for row in owner["archives"]:
                name, file = row["name"], row["file"]
                data = archive.read(file)
                assert len(data) == row["bytes"] and digest(data) == row["sha256"]
                assert "sha512-" + b64encode(sha512(data).digest()).decode() == row["integrity"]
                descriptor = lock["packages"]["node_modules/" + name]
                assert descriptor["version"] == "1.0.0" and descriptor["resolved"] == "file:archives/" + file and descriptor["integrity"] == row["integrity"]
                with tarfile.open(fileobj=BytesIO(data), mode="r:gz") as tar:
                    manifest = json.load(tar.extractfile("package/package.json"))
                    assert manifest["name"] == name and manifest["version"] == "1.0.0"
                    member_count += len(tar.getmembers())
                with (archives / file).open("xb") as output:
                    output.write(data)
                package = next(it for it in input_owner["packages"] if it["name"] == name)
                if source_ref is not None:
                    path = package["path"]
                    assert frozen_tree[path] == live_tree[path], name
                packs.append({"package": name, "repository": repository, "commit": source, "artifact": artifact,
                              "sha256": row["sha256"], "integrity": row["integrity"], "referenceSource": source_ref})
    assert len({row["package"] for row in packs}) == 45 and member_count == 767
    assert sum(row["referenceSource"] is not None for row in packs) == 43

    # <lang><zh-CN>样本取冻结主题提交，并与原站授权片段摘要比对。</zh-CN><en>Take the sample from the frozen theme commit and match the previously authorized source digest.</en></lang>
    standalone = json_file(base / "jsdoc/publication.json")
    source = standalone["source"]
    theme = next(p for p in packs if p["package"] == "@mandolin/jsdoc-theme-hia")
    assert source["commit"] == theme["commit"] and source["repository"] == theme["repository"]
    sample = b64decode(gh(f"repos/{source['repository']}/contents/{source['path']}?ref={source['commit']}")["content"])
    assert digest(sample) == source["sha256"]
    location = STAGING / "native-source" / source["path"]
    location.parent.mkdir(parents=True)
    location.write_bytes(sample)
    receipt = {"base": base_proof, "archives": packs, "archiveMembers": member_count, "freezeSha256": identity["freezeSha256"],
               "consumerLockSha256": identity["consumerLockSha256"], "sourceSample": source}
    (STAGING / "input-receipt.json").write_text(json.dumps(receipt, indent=2)+"\n", encoding="utf-8")
    print("Verified 45 archives and 43 retained reference source trees.")

if __name__ == "__main__":
    prepare_inputs()
