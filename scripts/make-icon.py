#!/usr/bin/env python3
"""生成 SHITTIM CHEST 桌面版应用图标（六边形徽标 + Y 形标志，多尺寸 .ico）"""
from PIL import Image, ImageDraw
import os

S = 1024  # 画布尺寸
cx, cy = S / 2, S / 2

def hexagon(cx, cy, r, rot=0):
    """正六边形顶点（rot: 0 = 尖顶朝上）"""
    import math
    pts = []
    for i in range(6):
        a = math.radians(60 * i + rot)
        pts.append((cx + r * math.sin(a), cy - r * math.cos(a)))
    return pts

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

R_OUT, R_BG, R_IN = 490, 440, 330

# 外圈描边（青蓝渐变感：分 6 段颜色微差）
edge = hexagon(cx, cy, R_OUT)
d.polygon(edge, fill=(11, 21, 38, 255))

# 背景六边形（深蓝）
bg = hexagon(cx, cy, R_BG)
d.polygon(bg, fill=(16, 30, 55, 255))

# 六边形描边（亮青色，多段渐变）
cols = [(79, 195, 255), (100, 181, 246), (79, 195, 255), (129, 212, 250), (79, 195, 255), (100, 181, 246)]
for i in range(6):
    a = bg[i]
    b = bg[(i + 1) % 6]
    d.line([a, b], fill=cols[i] + (255,), width=34)

# 内部徽标区（更深）
inner = hexagon(cx, cy, R_IN)
d.polygon(inner, fill=(12, 24, 46, 255))
d.polygon(inner, outline=(79, 195, 255, 200), width=10)

# 中心圆（黄点 + 蓝环）
d.ellipse([cx - 66, cy - 150, cx + 66, cy - 18], fill=(255, 210, 87, 255))          # 黄色圆头
d.rectangle([cx - 26, cy - 84, cx + 26, cy + 130], fill=(120, 190, 255, 255))        # 竖杆
d.line([cx, cy + 10, cx - 150, cy + 130], fill=(120, 190, 255, 255), width=52)       # 左斜
d.line([cx, cy + 10, cx + 150, cy + 130], fill=(120, 190, 255, 255), width=52)       # 右斜
# 竖杆顶端圆头与斜线圆角
for p in [(cx, cy + 10), (cx - 150, cy + 130), (cx + 150, cy + 130)]:
    d.ellipse([p[0] - 26, p[1] - 26, p[0] + 26, p[1] + 26], fill=(120, 190, 255, 255))
# 底部淡蓝装饰点
d.ellipse([cx - 40, cy + 150, cx + 40, cy + 230], fill=(79, 195, 255, 90))

out_dir = "/home/z/my-project/shittim-chest-desktop/build"
os.makedirs(out_dir, exist_ok=True)
sizes = [16, 24, 32, 48, 64, 128, 256]
imgs = [img.resize((s, s), Image.LANCZOS) for s in sizes]
imgs[-1].save(os.path.join(out_dir, "icon.png"), sizes=[(s, s) for s in sizes])
imgs[-1].save(os.path.join(out_dir, "icon.ico"), sizes=[(s, s) for s in sizes])
print("icon 生成完毕:", os.listdir(out_dir))
