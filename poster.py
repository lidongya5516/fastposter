import os
import traceback
from io import BytesIO

import qrcode
import requests
import requests_cache
import urllib3
from PIL import Image, ImageDraw, ImageFont

import C

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36'
}

NO_IMG = Image.open(os.path.join(os.path.dirname(__file__), 'resource/img/no-img.jpg')).convert('RGBA')
requests_cache.install_cache(C.STORE_DB + '/cache')


def fetchImg(url=''):
    try:
        if url.startswith('store/upload/'):
            if os.path.exists(f'data/{url}'):
                return Image.open(f'data/{url}').convert('RGBA')
            else:
                return NO_IMG
        r = requests.get(url, timeout=0.2)
        return Image.open(BytesIO(r.content)).convert('RGBA')
    except urllib3.exceptions.ReadTimeoutError:
        print(f'ERROR: fetch image timeout: url={url}')
        traceback.print_exc()
        return None
    except Exception:
        traceback.print_exc()
        return NO_IMG


def drawImg(draw, d, bg):
    url, w, h, x, y = d['v'], d['w'], d['h'], d['x'], d['y']
    rotate = d.get('rotate', 0)
    try:
        img = fetchImg(url)
        if img == None:
            return
        img = img.resize((w, h), Image.LANCZOS)
        if rotate != 0:
            img, offset = rotate_element(img, rotate)
            x += int(offset[0])
            y += int(offset[1])
        bg.paste(img, (x, y), img)
    except Exception as e:
        print('绘制图片异常: %s' % e)
        pass


def drawBg(item):
    url, w, h, c = str(item['bgUrl']), item['w'], item['h'], item['bgc']
    c = '#fafbfc00' if c == '' else c
    if not url.strip():
        img = Image.new('RGBA', (w, h), c)
    else:
        img = fetchImg(url)
    img = img.resize((w, h), Image.LANCZOS)
    draw = ImageDraw.Draw(img)
    return img, draw


def getFont(item):
    fn, size = item['fn'], item['s']
    if fn == "":
        fn = '0d44d315557a4a25.woff'
    font = 'resource/fonts/' + fn
    if not os.path.exists(font):
        font = 'resource/fonts/0d44d315557a4a25.woff'
    return ImageFont.truetype(font, size)


def text_width(font, text):
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def text_height(font):
    bbox = font.getbbox('Ay')
    return bbox[3] - bbox[1] + 4


def wrap_text(text, font, width):
    sb = []
    temp = ''
    for s in text:
        if s == '\n': # 优化本文中含有换行符
            sb.append(temp)
            temp = ''
            continue
        t = temp + s
        if text_width(font, t) > width:
            sb.append(temp)
            temp = s
        else:
            temp += s
    if temp != '':
        sb.append(temp)
    return sb


def rotate_element(img, angle):
    """Rotate an RGBA image around its center, returning rotated image and position offset."""
    if angle == 0:
        return img, (0, 0)
    w, h = img.size
    rotated = img.rotate(-angle, expand=True, center=(w / 2, h / 2))
    rw, rh = rotated.size
    dx = (w - rw) / 2
    dy = (h - rh) / 2
    return rotated, (dx, dy)


def drawText(draw, item, bg):
    font = getFont(item)
    v, w, h, x, y, c = item['v'], item['w'], item['h'], item['x'], item['y'], item.get('c', '#010203')
    align = item.get('al', 'left')
    valign = item.get('av', 'top')
    rotate = item.get('rotate', 0)
    img = Image.new("RGBA", (w, h), '#fff0')
    draw = ImageDraw.Draw(img)  # type:ImageDraw.ImageDraw
    lines = wrap_text(v, font, w)
    line_height = text_height(font)
    total_h = len(lines) * line_height
    if valign == 'center':
        vy = max(0, (h - total_h) // 2)
    elif valign == 'bottom':
        vy = max(0, h - total_h)
    else:
        vy = 0
    for i, line in enumerate(lines):
        line_w = text_width(font, line)
        if align == 'center':
            tx = (w - line_w) // 2
        elif align == 'right':
            tx = w - line_w
        else:
            tx = 0
        draw.text((tx, vy + i * line_height), line, fill=c, font=font)
    if rotate != 0:
        img, offset = rotate_element(img, rotate)
        x += int(offset[0])
        y += int(offset[1])
    if img is not None:
        bg.paste(img, (x, y), img)


def drawQrCode(draw, item, bg):
    url, w, h, x, y, c = item['v'], item['w'], item['h'], item['x'], item['y'], item.get('c', '#010203').strip()
    c = '#010203' if len(c) == 0 else c
    p = item.get('p', 0)
    rotate = item.get('rotate', 0)
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=p,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=c, back_color="#ffffff")
    img = img.resize((w, h), Image.LANCZOS)
    if rotate != 0:
        img = img.convert('RGBA')
        img, offset = rotate_element(img, rotate)
        x += int(offset[0])
        y += int(offset[1])
    bg.paste(img, (x, y), None)


def drawAvatar(draw, item, bg):
    url, w, h, x, y, c = item['v'], item['w'], item['h'], item['x'], item['y'], item.get('c', '#ffffff').strip()
    c = '#ffffff' if len(c) == 0 else c
    rotate = item.get('rotate', 0)
    im = fetchImg(url)
    if im == None:
        return
    bigsize = (im.size[0] * 3, im.size[1] * 3)
    mask = Image.new('L', bigsize, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + bigsize, fill=255)
    mask = mask.resize(im.size, Image.LANCZOS)
    im.putalpha(mask)
    im = im.resize((w, h), Image.LANCZOS)
    mask = Image.new('RGBA', bigsize)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + bigsize, outline=c, width=4 * 3)
    mask = mask.resize(im.size, Image.LANCZOS)
    im.paste(mask, (0, 0), mask)
    if rotate != 0:
        im, offset = rotate_element(im, rotate)
        x += int(offset[0])
        y += int(offset[1])
    bg.paste(im, (x, y), im)
    pass


def draw(data):
    img, draw = drawBg(data)

    for item in data['items']:
        type = item['t']
        if 'text' == type:
            drawText(draw, item, bg=img)
        if 'image' == type:
            drawImg(draw, item, bg=img)
        if 'avatar' == type:
            drawAvatar(draw, item, bg=img)
        if 'qrcode' == type:
            url = item.get('v', '')
            if url.startswith('img:'):
                url = url[4:]
                item['v'] = url
                drawImg(draw, item, bg=img)
            else:
                drawQrCode(draw, item, bg=img)

    if data['type'] == "jpeg":
        img = img.convert("RGB")
    return img


def drawio(data, scale=1):
    type = data['type']
    if type == "jpg":
        type = "jpeg"
        data['type'] = type
    mimetype = "image/" + data['type']
    img = draw(data)
    quality = data['quality']
    if scale < 1:
        w = img.size[0]
        h = img.size[1]
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, type, quality=quality, progressive=True)
    buf.seek(0)
    return buf, mimetype
