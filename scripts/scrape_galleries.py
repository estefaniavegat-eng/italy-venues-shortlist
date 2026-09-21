"""Scrape 4-8 gallery images per venue from official sites."""
import json, os, re, time, urllib.parse
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path('/workspace/italy-venues-site')
DATA = ROOT / 'data' / 'venues.json'
GALLERY = ROOT / 'assets' / 'galleries'
COVERS = ROOT / 'assets' / 'covers'

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,it;q=0.8',
})

CANDIDATES = {
  'villa-pozzolo': [
    'https://villapozzolo.com/gallery/',
    'https://villapozzolo.com/weddings/',
    'https://villapozzolo.com/the-villa/',
    'https://villapozzolo.com/',
  ],
  'villa-lena': [
    'https://www.villa-lena.it/celebrate-with-us/weddings/',
    'https://www.villa-lena.it/the-estate/',
    'https://www.villa-lena.it/gallery/',
    'https://www.villa-lena.it/',
  ],
  'castello-di-gargonza': [
    'https://gargonza.it/en/weddings-in-tuscany/',
    'https://gargonza.it/weddings/',
    'https://gargonza.it/en/',
    'https://gargonza.it/',
  ],
  'villa-paola': [
    'https://www.villapaolatropea.it/en/weddings/',
    'https://www.villapaolatropea.it/en/the-villa/',
    'https://www.villapaolatropea.it/en/gallery/',
    'https://www.villapaolatropea.it/en/',
  ],
  'hotel-bellevue-syrene': [
    'https://www.bellevue.it/en/weddings-in-sorrento',
    'https://www.bellevue.it/en/weddings-sorrento',
    'https://www.bellevue.it/en/gallery-hotel-sorrento',
    'https://www.bellevue.it/en/',
  ],
  'parco-dei-principi-di-sorrento': [
    'https://www.hotelparcoprincipi.com/en/events.html',
    'https://www.hotelparcoprincipi.com/en/gallery.html',
    'https://www.hotelparcoprincipi.com/en/hotel.html',
    'https://www.hotelparcoprincipi.com/en/',
    'https://www.hotelparcoprincipi.com/',
  ],
  'castello-di-spessa': [
    'https://www.castellodispessa.it/en/weddings/',
    'https://castellodispessa.it/en/weddings/',
    'https://www.castellodispessa.it/en/photo-gallery/',
    'https://www.castellodispessa.it/',
  ],
  'villa-catignano': [
    'https://www.villacatignano.it/weddings-events.html',
    'https://www.villacatignano.it/photo-gallery.html',
    'https://www.villacatignano.it/gallery.html',
    'https://www.villacatignano.it/',
  ],
  'borgo-castelvecchi': [
    'https://www.castelvecchi.com/',
    'https://www.castelvecchi.com/en/',
    'https://www.castelvecchi.com/language/en/home-page-english/',
  ],
  'casale-de-pasquinelli': [
    'https://www.casaledepasquinelli.it/weddings',
    'https://www.casaledepasquinelli.it/gallery',
    'https://www.casaledepasquinelli.it/the-estate',
    'https://www.casaledepasquinelli.it/',
  ],
  'antico-borgo-san-lorenzo': [
    'https://www.anticoborgosanlorenzo.it/en/weddings/',
    'https://www.anticoborgosanlorenzo.it/en/gallery/',
    'https://www.anticoborgosanlorenzo.it/en/the-borgo/',
    'https://www.anticoborgosanlorenzo.it/en/',
  ],
  'villa-sermolli': [
    'https://villa-sermolli.com/weddings/',
    'https://villa-sermolli.com/gallery/',
    'https://villa-sermolli.com/the-villa/',
    'https://villa-sermolli.com/',
  ],
  'villa-poggio-bartoli': [
    'https://www.villapoggiobartoli.it/en/weddings/',
    'https://www.villapoggiobartoli.it/en/gallery/',
    'https://www.villapoggiobartoli.it/en/the-villa/',
    'https://www.villapoggiobartoli.it/en/home-eng/',
  ],
  'spao-borgo-san-pietro': [
    'https://www.spao.it/weddings',
    'https://www.spao.it/gallery',
    'https://www.spao.it/the-borgo',
    'https://www.spao.it/',
  ],
  'monastero-santa-margherita': [
    'https://monasterosantamargherita.com/matrimoni/',
    'https://monasterosantamargherita.com/weddings/',
    'https://monasterosantamargherita.com/gli-spazi/',
    'https://monasterosantamargherita.com/gallery/',
    'https://monasterosantamargherita.com/',
  ],
  'villa-arvedi': [
    'https://www.villarvedi.it/i-matrimoni/',
    'https://www.villarvedi.it/galleria/',
    'https://www.villarvedi.it/la-villa/',
    'https://www.villarvedi.it/',
  ],
}

IMG_EXT = re.compile(r'\.(jpe?g|png|webp|avif)(\?|$)', re.I)
SKIP = re.compile(r'(logo|icon|sprite|favicon|pixel|tracking|1x1|blank|placeholder|avatar|button|badge|flag|\.svg)', re.I)
UNSPLASH = re.compile(r'unsplash\.com', re.I)

def abs_url(base, url):
    if not url: return None
    url = url.strip().strip('"\'')
    if url.startswith('//'): url = 'https:' + url
    if url.startswith('data:'): return None
    return urllib.parse.urljoin(base, url)

def extract_imgs(html, base):
    soup = BeautifulSoup(html, 'lxml')
    found = []
    for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
        u = abs_url(base, meta.get('content'))
        if u: found.append(u)
    for img in soup.find_all('img'):
        for attr in ('src', 'data-src', 'data-lazy-src', 'data-original', 'data-full', 'data-zoom-image'):
            u = abs_url(base, img.get(attr))
            if u: found.append(u)
        srcset = img.get('srcset') or img.get('data-srcset') or ''
        for part in srcset.split(','):
            part = part.strip().split(' ')[0]
            u = abs_url(base, part)
            if u: found.append(u)
    for el in soup.select('[style*="background"]'):
        m = re.search(r'url\([\'"]?([^\'")]+)', el.get('style',''))
        if m:
            u = abs_url(base, m.group(1))
            if u: found.append(u)
    for a in soup.find_all('a', href=True):
        if IMG_EXT.search(a['href']):
            u = abs_url(base, a['href'])
            if u: found.append(u)
    # JSON-LD / embedded URLs
    for m in re.finditer(r'https?://[^\"\'\s<>]+?\.(?:jpe?g|png|webp)', html, re.I):
        found.append(m.group(0).replace('\\/', '/'))

    cleaned = []
    seen = set()
    for u in found:
        if not u or UNSPLASH.search(u) or SKIP.search(u): continue
        if not IMG_EXT.search(u) and not re.search(r'(wp-content|/images?/|/uploads?/|/media/|/galleries?/)', u, re.I):
            continue
        key = re.sub(r'-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp))', '', u, flags=re.I)
        key = key.split('?')[0]
        if key in seen: continue
        seen.add(key)
        u2 = re.sub(r'-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp))', '', u, flags=re.I)
        cleaned.append(u2)
    return cleaned

def fetch(url, timeout=25):
    try:
        r = SESSION.get(url, timeout=timeout, allow_redirects=True)
        if r.status_code >= 400: return None, r.status_code
        return r, r.status_code
    except Exception as e:
        return None, str(e)

def download_image(url, dest):
    try:
        r = SESSION.get(url, timeout=40, stream=True)
        if r.status_code != 200: return False, f'status {r.status_code}'
        ctype = r.headers.get('Content-Type','')
        data = r.content
        if len(data) < 8000:
            return False, f'too small {len(data)}'
        if data[:3] == b'\xff\xd8\xff':
            ext = '.jpg'
        elif data[:8] == b'\x89PNG\r\n\x1a\n':
            ext = '.png'
        elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            ext = '.webp'
        else:
            if 'image' not in ctype and not IMG_EXT.search(url):
                return False, 'unknown format'
            ext = '.jpg'
        dest = dest.with_suffix('.jpg')
        if ext != '.jpg':
            try:
                from PIL import Image
                import io
                im = Image.open(io.BytesIO(data))
                if im.mode in ('RGBA','P'): im = im.convert('RGB')
                im.save(dest, 'JPEG', quality=88, optimize=True)
                return True, f'converted {ext}'
            except Exception:
                dest.write_bytes(data)
                return True, f'raw {ext}'
        else:
            dest.write_bytes(data)
            return True, 'ok'
    except Exception as e:
        return False, str(e)

def copy_cover(vid, dest):
    for ext in ('.jpg','.webp','.png','.jpeg'):
        p = COVERS / f'{vid}{ext}'
        if p.exists():
            try:
                from PIL import Image
                im = Image.open(p)
                if im.mode in ('RGBA','P'): im = im.convert('RGB')
                im.save(dest, 'JPEG', quality=88)
            except Exception:
                dest.write_bytes(p.read_bytes())
            return True
    return False

def process_venue(vid, urls):
    out_dir = GALLERY / vid
    out_dir.mkdir(parents=True, exist_ok=True)
    # clear old
    for f in out_dir.glob('*'):
        f.unlink()
    collected = []
    pages_ok = []
    for url in urls:
        r, st = fetch(url)
        if not r:
            print(f'  [{vid}] fail {url} -> {st}')
            continue
        pages_ok.append(url)
        imgs = extract_imgs(r.text, r.url)
        print(f'  [{vid}] {url} -> {len(imgs)} imgs (status {st})')
        for u in imgs:
            if u not in collected:
                collected.append(u)
        if len(collected) >= 24:
            break
        time.sleep(0.25)

    if len(collected) < 8 and pages_ok:
        r, _ = fetch(pages_ok[0])
        if r:
            soup = BeautifulSoup(r.text, 'lxml')
            extra = []
            for a in soup.find_all('a', href=True):
                h = a['href'].lower()
                t = (a.get_text() or '').lower()
                if any(k in h or k in t for k in ('wedding','matrimon','gallery','galleria','event','photo','foto','spazi')):
                    u = abs_url(r.url, a['href'])
                    if u and u not in urls and u.startswith('http') and 'mailto:' not in u:
                        extra.append(u)
            seen_e = set()
            extra2 = []
            for u in extra:
                if u not in seen_e:
                    seen_e.add(u); extra2.append(u)
            for url in extra2[:5]:
                rr, st = fetch(url)
                if not rr: continue
                imgs = extract_imgs(rr.text, rr.url)
                print(f'  [{vid}] discovered {url} -> {len(imgs)}')
                for u in imgs:
                    if u not in collected: collected.append(u)
                if len(collected) >= 24: break

    saved = []
    for u in collected:
        if len(saved) >= 8: break
        idx = len(saved) + 1
        dest = out_dir / f'{idx:02d}.jpg'
        ok, msg = download_image(u, dest)
        if ok:
            saved.append(f'assets/galleries/{vid}/{idx:02d}.jpg')
            print(f'    saved {idx:02d} ({msg}) {u[:100]}')
        else:
            print(f'    skip ({msg}) {u[:100]}')
        time.sleep(0.12)

    # Ensure at least cover present when scrape thin
    if len(saved) == 0:
        dest = out_dir / '01.jpg'
        if copy_cover(vid, dest):
            saved = [f'assets/galleries/{vid}/01.jpg']
            print(f'    fallback cover -> 01.jpg')

    # Pad to 4 with cover duplicates only if we have <4 and have cover — better: try to get more from cover-only once
    # Prefer unique; if <4 just leave what we have (min 1)

    return saved, pages_ok

def main():
    data = json.loads(DATA.read_text())
    results = {}
    for v in data['venues']:
        vid = v['id']
        print(f'\n=== {vid} ===')
        urls = CANDIDATES.get(vid, [v.get('website')])
        saved, pages = process_venue(vid, urls)
        results[vid] = saved
        v['gallery'] = saved
        if saved:
            v['image'] = saved[0]
            if not v.get('imageCredit') or 'TBD' in str(v.get('imageCredit','')):
                v['imageCredit'] = 'Official site'
        print(f'  TOTAL {len(saved)} images')

    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print('\n\nSUMMARY')
    for k,v in results.items():
        print(f'  {k}: {len(v)}')
    (ROOT / 'scripts' / 'gallery_results.json').write_text(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
