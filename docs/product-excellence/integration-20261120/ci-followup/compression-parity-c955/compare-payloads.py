import base64,gzip,hashlib,json,pathlib,re,sys,zlib
root=pathlib.Path(r'C:\Users\darsh\AppData\Local\Temp\entelloq-biology-package-audit-c955-af0b9cc2d2644e0e9d7f977a30701859')
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest_re=re.compile(r'(<script id="bioq-manifest" type="application/json">)(.*?)(</script>)',re.S)
deferred_re=re.compile(r'(<script type="application/octet-stream" id="([^"]+)">)(.*?)(</script>)',re.S)
def parse(path):
    raw=path.read_bytes(); text=raw.decode('utf-8')
    m=manifest_re.search(text); manifest=json.loads(m.group(2))
    deferred={m.group(2):m.group(3) for m in deferred_re.finditer(text)}
    decoded={}; compressed={}; headers=set(); decoded_total=0
    def unpack(name, encoded):
        nonlocal decoded_total
        packed=base64.b64decode(encoded); data=gzip.decompress(packed)
        decoded[name]={'bytes':len(data),'sha256':sha(data)}
        compressed[name]={'bytes':len(packed),'sha256':sha(packed)}
        headers.add(packed[:10].hex());decoded_total+=len(data)
        return decoded[name]
    for name,encoded in manifest['pages'].items():manifest['pages'][name]=unpack('page:'+name,encoded)
    for name,entry in manifest['assets'].items():
        encoded=deferred[entry['deferred']] if 'deferred' in entry else entry['data']
        description=unpack('asset:'+name,encoded)
        if 'data' in entry: entry['data']=description
    normalized_manifest=json.dumps(manifest,sort_keys=True,separators=(',',':'),ensure_ascii=True)
    normalized=manifest_re.sub(lambda m:m.group(1)+normalized_manifest+m.group(3),text)
    normalized=deferred_re.sub(lambda m:m.group(1)+sha(gzip.decompress(base64.b64decode(m.group(3))))+m.group(4),normalized)
    return {'path':str(path),'bytes':len(raw),'sha256':sha(raw),'pageCount':len(manifest['pages']),'assetCount':len(manifest['assets']),'deferredCount':len(deferred),'decodedBytes':decoded_total,'gzipHeaders':sorted(headers),'normalizedContainerSha256':sha(normalized.encode()),'decoded':decoded,'compressed':compressed}, normalized
left,ltext=parse(root/'git-python312/index.html');right,rtext=parse(root/'git-python314/index.html')
changed=[name for name in left['decoded'] if left['decoded'][name]!=right['decoded'].get(name)]
compressed_changed=[name for name in left['compressed'] if left['compressed'][name]!=right['compressed'].get(name)]
report={'auditDate':'2026-11-20','commit':'c95528f0d0abb125b3656a8e25aa81f685dc4c0c','scope':'Read-only Git archive exported outside source; no source/branch/index mutation. Three builds write only temporary outputs. Hosted dist was not downloaded; local reconstruction matches its recorded full-file SHA256 exactly.','runtimes':{'CI':'CPython3.15.2 observed in GitHub run44702952067 job136175507786; zlib backend not printed','standardZlibReconstruction':'CPython3.12.14, zlib build/runtime1.3.2','localReconstruction':'CPython3.14.5, zlib build/runtime1.3.1.zlib-ng'},'decodedPayloadsEqual':not changed and left['decoded'].keys()==right['decoded'].keys(),'changedDecodedPayloads':changed,'normalizedContainerEqual':ltext==rtext,'compressedPayloadsChanged':len(compressed_changed),'gzipHeaderFixed':left['gzipHeaders']==right['gzipHeaders'],'artifacts':[left,right],'workingTreeStandardZlibSha256':sha(pathlib.Path(r'C:\Users\darsh\AppData\Local\Temp\entelloq-biology-package-audit-c955-af0b9cc2d2644e0e9d7f977a30701859\working-python312\index.html').read_bytes())}
(root/'compression-parity-evidence.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='artifacts'},indent=2))
for item in (left,right): print(json.dumps({k:v for k,v in item.items() if k not in ('decoded','compressed')},indent=2))
assert report['decodedPayloadsEqual'] and report['normalizedContainerEqual']
assert left['sha256']=='86876591375ba9110bbe4ed4f18aba13a8a833c2eaf6d86ab299c78571f78ee5'
assert right['sha256']=='e8bf0a8e9da95eaef7459de726f544daa26a41d1a938319d19b096a9a72e644e'
