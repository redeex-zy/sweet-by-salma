"""Set absolute Open Graph URLs after website deployment. Usage:
python tools/set-live-domain.py https://your-real-site.netlify.app
Run from project root, then redeploy entire folder.
"""
import re,sys
from pathlib import Path
from urllib.parse import urlparse
if len(sys.argv)!=2:
    raise SystemExit("Usage: python tools/set-live-domain.py https://your-real-site.example")
url=sys.argv[1].rstrip('/')
p=urlparse(url)
if p.scheme!='https' or not p.netloc or p.username or p.password or p.query or p.fragment or p.path not in ('','/'):
    raise SystemExit('Provide a clean HTTPS domain, e.g. https://sweet-by-salma.netlify.app')
f=Path(__file__).resolve().parents[1]/'index.html'
s=f.read_text(encoding='utf-8')
for prop,file in [('og:image','social-preview.jpg'),('twitter:image','social-preview.jpg')]:
    s=re.sub(r'(<meta (?:property|name)="'+re.escape(prop)+r'" content=")[^"]*("\s*/>)',lambda m:m.group(1)+url+'/'+file+m.group(2),s)
s=re.sub(r'  <link rel="canonical" href="[^"]*"\s*/>\n','',s)
s=re.sub(r'  <meta property="og:url" content="[^"]*"\s*/>\n','',s)
s=s.replace('  <title>',
    '  <link rel="canonical" href="'+url+'/" />\n'
    '  <meta property="og:url" content="'+url+'/" />\n  <title>',1)
f.write_text(s,encoding='utf-8')
print('Set social preview URLs to:',url+'/social-preview.jpg')
print('Now redeploy the entire folder.')
