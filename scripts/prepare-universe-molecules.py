"""Derive compact offline coordinate data from local wwPDB 4HHB and 1BNA files.

No network or new dependency. Run with the two downloaded PDB paths. Only the
marked machine-generated constant in stage_molecular.js is replaced. Coordinates
stay in Angstroms; runtime rendering only applies rigid transforms/uniform scale.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def atoms(text):
    out = []
    for line in text.splitlines():
        if line[:6].strip() not in ('ATOM', 'HETATM') or line[16] not in (' ', 'A'):
            continue
        out.append(dict(serial=int(line[6:11]), name=line[12:16].strip(),
                        residue=line[17:20].strip(), chain=line[21], number=int(line[22:26]),
                        element=line[76:78].strip().title(),
                        xyz=[float(line[n:n+8]) for n in (30, 38, 46)]))
    return out


def derive(hb_path, dna_path):
    hb_raw, dna_raw = hb_path.read_bytes(), dna_path.read_bytes()
    hb_text, dna_text = hb_raw.decode(), dna_raw.decode()
    hb_atoms, dna_atoms = atoms(hb_text), atoms(dna_text)
    chains = []
    for chain, expected in zip('ABCD', (141, 146, 141, 146)):
        ca = [a for a in hb_atoms if a['chain'] == chain and a['name'] == 'CA' and a['residue'] != 'HEM']
        heme = [a for a in hb_atoms if a['chain'] == chain and a['residue'] == 'HEM']
        assert len(ca) == expected and len(heme) == 43, (chain, len(ca), len(heme))
        serials = {a['serial']: i for i, a in enumerate(heme)}
        bonds = set()
        for line in hb_text.splitlines():
            if line.startswith('CONECT'):
                ids = [int(line[i:i+5]) for i in range(6, len(line), 5) if line[i:i+5].strip()]
                for other in ids[1:]:
                    if ids[0] in serials and other in serials:
                        bonds.add(tuple(sorted((serials[ids[0]], serials[other]))))
        assert len(bonds) >= 45, (chain, len(bonds))
        chains.append(dict(id=chain, ca=[[a['number'], *a['xyz']] for a in ca],
                           heme=[[a['name'], a['element'], *a['xyz']] for a in heme], bonds=sorted(bonds)))
    dna = [a for a in dna_atoms if a['residue'] in ('DA', 'DT', 'DC', 'DG')]
    assert len(dna) == 486, len(dna)
    return dict(protein=dict(pdb='4HHB', sha256=hashlib.sha256(hb_raw).hexdigest(), chains=chains),
                dna=dict(pdb='1BNA', sha256=hashlib.sha256(dna_raw).hexdigest(),
                         atoms=[[a['chain'], a['number'], a['residue'], a['name'], a['element'], *a['xyz']] for a in dna]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('haemoglobin', type=Path)
    parser.add_argument('dna', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = derive(args.haemoglobin, args.dna)
    body = 'const MOL_STRUCTURES = ' + json.dumps(data, separators=(',', ':')) + ';'
    target = ROOT / 'src/universe/stage_molecular.js'
    before = target.read_text(encoding='utf-8')
    pattern = r'(?<=// BEGIN DERIVED PDB COORDINATES\n)[\s\S]*?(?=\n// END DERIVED PDB COORDINATES)'
    after, n = re.subn(pattern, lambda _: body, before)
    assert n == 1, 'Missing or duplicate generated-coordinate slot'
    if args.check:
        assert before == after, 'Molecular coordinate data is out of sync'
    elif before != after:
        target.write_text(after, encoding='utf-8', newline='\n')
    print('4HHB: four complete C-alpha chains / four hemes; 1BNA: 24 DNA residues / 486 heavy atoms.')


if __name__ == '__main__':
    main()
