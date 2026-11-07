"""Reproduce references from official archives; no business/lead data.
python3 scripts/build-reference-data.py /tmp/leadatlas-cities500.zip /tmp/leadatlas-naics.xlsx
Download URLs, dates, scope and attribution are in src/lib/reference/SOURCES.md.
"""
import sys, json, zipfile, hashlib, unicodedata
from pathlib import Path
from xml.etree import ElementTree as ET
out=Path(__file__).resolve().parents[1]/'src/lib/reference'
out.mkdir(exist_ok=True)
ca={'01':'AB','02':'BC','03':'MB','04':'NB','05':'NL','07':'NS','08':'ON','09':'PE','10':'QC','11':'SK','12':'YT','13':'NT','14':'NU'}
places={}
with zipfile.ZipFile(sys.argv[1]) as z:
    for line in z.read('cities500.txt').decode().splitlines():
        c=line.split('\t')
        if len(c)<19 or c[8] not in ['US','CA'] or c[6]!='P': continue
        region=ca.get(c[10]) if c[8]=='CA' else c[10]
        if not region: continue
        places.setdefault(c[8]+'-'+region,set()).add(c[1])
# Exclude territories not in the product's existing US state/DC scope.
places={k:sorted(v) for k,v in places.items() if not (k.startswith('US-') and k[3:] in ['PR','VI','GU','AS','MP','UM'])}
(out/'cities.json').write_text(json.dumps(places,ensure_ascii=False,separators=(',',':'))+'\n')
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[2]) as z:
    strings=[''.join(s.itertext()) for s in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    categories=[]
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:row',ns):
        cols=[]
        for c in row.findall('s:c',ns):
            v=c.find('s:v',ns)
            text='' if v is None else v.text
            if c.get('t')=='s': text=strings[int(text)]
            cols.append(text)
        # The structure workbook has sequence, code, title, change indicator.
        for i,c in enumerate(cols[:-1]):
            if c and c.isdigit() and len(c)==6 and cols[i+1]:
                categories.append({'id':'naics:2022:'+c,'title':cols[i+1].strip()})
                break
(out/'categories.json').write_text(json.dumps(categories,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'regions':len(places),'places':sum(map(len,places.values())),'categories':len(categories),'sha256':{Path(p).name:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sys.argv[1:]}}))
