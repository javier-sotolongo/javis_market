import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
rgba = Image.new('RGBA', (W, H))
sp, dp = im.load(), rgba.load()
WHITE = 254
for y in range(H):
    for x in range(W):
        r, g, b = sp[x, y]
        m = min(r, g, b)
        a = max(0.0, min(1.0, (WHITE - m) / (WHITE - 3)))
        if a < 0.02:
            dp[x, y] = (0, 0, 0, 0); continue
        c = [max(0, min(255, round((v - (1 - a) * 255) / a))) for v in (r, g, b)]
        dp[x, y] = (*c, round(a * 255))

def reversed_(img):
    img = img.copy(); p = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = p[x, y]
            if a and b >= r and b >= g:  # azul marino -> blanco
                p[x, y] = (255, 255, 255, a)
    return img

def fit(img, w):
    img = img.crop(img.getbbox())
    return img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)

full = rgba
wordmark = rgba.crop((0, 0, W, 700))   # sin el lema
mark = rgba.crop((100, 100, 820, 700))  # carrito + hojas, sin la J
mp = mark.load()
for y in range(mark.height):
    for x in range(mark.width):
        r, g, b, a = mp[x, y]
        X, Y = x + 100, y + 100
        if a and b >= r and b >= g and (X >= 700 or (X > 672 and Y < 540)):
            mp[x, y] = (0, 0, 0, 0)

fit(full, 720).save(f'{out}/logo.png', optimize=True)
fit(reversed_(full), 720).save(f'{out}/logo-reversed.png', optimize=True)
fit(wordmark, 600).save(f'{out}/logo-wordmark.png', optimize=True)
fit(reversed_(wordmark), 600).save(f'{out}/logo-wordmark-reversed.png', optimize=True)

def square(img, size, bg=None, pad=0.08):
    img = img.crop(img.getbbox())
    inner = round(size * (1 - 2 * pad))
    s = inner / max(img.size)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return canvas
square(mark, 512).save(f'{out}/icon.png', optimize=True)
square(mark, 180, (255, 255, 255, 255), 0.12).convert('RGB').save(f'{out}/apple-icon.png', optimize=True)
