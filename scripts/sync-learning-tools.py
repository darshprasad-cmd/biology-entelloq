"""Build local runtime assets from pinned learning-tools-source modules.

Copy this builder into either host's scripts directory. It does not install
packages, fetch assets, remove files or change existing app source slots.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def runtime_files(source, module):
    if module == "physics":
        return [source / name for name in ("index.html", "style.css", "tools.mjs", "core.mjs", "THIRD-PARTY-NOTICES.md")] + sorted((source / "vendor").rglob("*"), key=lambda path: path.as_posix())
    if module == "learning":
        manifest = json.loads((source / "asset-manifest.json").read_text(encoding="utf-8"))
        return [source / entry["path"] for entry in manifest["assets"]] + [source / "asset-manifest.json"]
    return [source / "index.html"] + sorted((source / "dist").rglob("*"), key=lambda path: path.as_posix()) + [p for p in sorted(source.glob("*NOTIC*"), key=lambda path: path.as_posix()) if p.is_file()]

def entry(data, module, biology):
    if not biology or module == "physics":
        return data
    text = data.decode("utf-8")
    # Source pages have independent directories. The portable Biology shell
    # serves virtual documents from a common base, so author explicit paths.
    def absolute(match):
        prefix, quote, value = match.groups()
        if re.match(r"(?:[a-z]+:|/|#)", value, re.I):
            return match.group(0)
        return prefix + quote + "/assets/learning-tools/" + module + "/" + value.removeprefix("./") + quote
    text = re.sub(r"(\b(?:src|href)=)(['\"])([^'\"]+)\2", absolute, text)
    bootstrap = """<script>
(function(){
  var virtual=!!window.BioqPackage;
  var base=(virtual?'https://biology.entelloq.com/__single__/':'/')+'assets/learning-tools/';
  if(MODULE==='learning'){
    var paths={worker:base+'learning/semantic-worker.js',mjs:base+'learning/runtime/ort-wasm-simd-threaded.jsep.mjs',wasm:base+'learning/runtime/ort-wasm-simd-threaded.jsep.wasm'};
    window.ENTELLOQ_LEARNING_ASSETS=paths;
    if(virtual){
      var urls=new Set();
      window.ENTELLOQ_LEARNING_PREPARE_ASSETS=async function(signal){
        var prepared={},types={worker:'text/javascript',mjs:'text/javascript',wasm:'application/wasm'};
        function release(){for(var key of Object.keys(prepared)){URL.revokeObjectURL(prepared[key]);urls.delete(prepared[key]);}signal.removeEventListener('abort',release);}
        signal.addEventListener('abort',release,{once:true});
        try{for(var key of Object.keys(paths)){var response=await fetch(paths[key],{signal:signal});if(!response.ok)throw Error('A local runtime asset is unavailable.');var blob=new Blob([await response.arrayBuffer()],{type:types[key]});if(signal.aborted)throw new DOMException('Cancelled','AbortError');var url=URL.createObjectURL(blob);urls.add(url);prepared[key]=url;}return prepared;}
        catch(error){release();throw error;}
      };
      addEventListener('pagehide',function(event){if(!event.persisted){urls.forEach(function(url){URL.revokeObjectURL(url);});urls.clear();}});
    }
  }else if(MODULE==='biology'&&virtual){
    var volume=document.getElementById('volume-library');if(volume)volume.setAttribute('src',base+'biology/dist/volume.js');
  }
})();
</script>""".replace("MODULE", json.dumps(module))
    marker = '<script src="/assets/learning-tools/' + module + '/'
    position = text.find(marker)
    if position < 0:
        raise ValueError("Entry script boundary not found for " + module)
    return (text[:position] + bootstrap + text[position:]).encode("utf-8")

def render(root=ROOT):
    biology = (root / "app.html").is_file()
    manifest = {"schema": 1, "subject": "biology" if biology else "physics", "modules": {}}
    for module in ("biology" if biology else "physics", "learning"):
        source = root / "learning-tools-source" / module
        if not source.is_dir():
            continue
        files = []
        for path in runtime_files(source, module):
            if not path.is_file():
                continue
            relative = path.relative_to(source)
            target = root / "assets/learning-tools" / module / relative
            data = path.read_bytes()
            if relative.as_posix() == "index.html":
                data = entry(data, module, biology)
            files.append({"path": target.relative_to(root).as_posix(), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
            yield target, data
        manifest["modules"][module] = files
    if not manifest["modules"]:
        raise ValueError("No learning-tool sources found")
    yield root / "assets/learning-tools/manifest.json", (json.dumps(manifest, indent=2) + "\n").encode()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for target, data in render():
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                parser.exit(1, "Learning-tool runtime differs: " + str(target) + "\n")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print("Learning-tool source/runtime parity verified." if args.check else "Built local learning-tool runtime assets.")
