# App Icon Generation Guide

> 本文档记录 quant_trade 应用图标的完整生成过程、技术方案与踩坑经验，供 AI 或开发者复现。

---

## 1. 最终效果

| 项目 | 详情 |
|------|------|
| **背景色** | `#FF6B35` 活力橙（纯色，无渐变） |
| **K线蜡烛** | 白色，中间实色 100%，两侧半透明 50% |
| **图标形状** | 圆角矩形，圆角半径 ≈ 22.3%（228px / 1024px） |
| **格式** | RGBA PNG（color_type=6, 8-bit depth） |
| **平台** | macOS `.icns` / Windows `.ico` / 通用 `.png` |

---

## 2. SVG 源文件

### 2.1 不要使用 clip-path

**坑**：ImageMagick 的内置 SVG 渲染器（MSVG）不支持 `<clipPath>`，使用 clip-path 会导致渲染结果为全黑背景。

### 2.2 不要使用 linearGradient

**坑**：MSVG 也不支持 `<linearGradient>`，渐变无法渲染。

### 2.3 正确的 SVG

使用纯色 `<rect>` 配合 `<rect>` 元素绘制 K 线：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- fill 必须用纯色，不能用 url(#gradient) -->
  <rect width="1024" height="1024" fill="#FF6B35"/>
  <!-- 左柱：半透明 -->
  <rect x="230" y="520" width="140" height="260" rx="24" fill="#ffffff" opacity="0.5"/>
  <rect x="290" y="420" width="20" height="440" rx="10" fill="#ffffff" opacity="0.5"/>
  <!-- 中柱：实色 -->
  <rect x="442" y="280" width="140" height="500" rx="24" fill="#ffffff"/>
  <rect x="502" y="160" width="20" height="680" rx="10" fill="#ffffff"/>
  <!-- 右柱：半透明 -->
  <rect x="654" y="480" width="140" height="300" rx="24" fill="#ffffff" opacity="0.5"/>
  <rect x="714" y="380" width="20" height="480" rx="10" fill="#ffffff" opacity="0.5"/>
</svg>
```

**SVG 渲染测试命令**（验证不是黑色）：

```bash
magick /path/to/icon.svg -background none -density 300 -resize 32x32 -depth 8 rgba:- | \
  python3 -c "
import sys
d = sys.stdin.buffer.read()
w=32
for x in range(0,32,8):
    i=(8*w+x)*4
    print(f'x={x}: rgba({d[i]},{d[i+1]},{d[i+2]},{d[i+3]})')
"
```

---

## 3. SVG → PNG 的坑

### 3.1 不要用 ImageMagick 直接生成 PNG

```bash
# ❌ 这种方法会产生 PaletteAlpha PNG，Tauri 无法解析
magick icon.svg -background none -resize 32x32 icon.png
```

ImageMagick 默认会压缩小尺寸 PNG 为 `color_type=3 (PaletteAlpha)`，Tauri 的图标验证器要求 `color_type=6 (RGBA)`。

### 3.2 PNG32 也不行

```bash
# ❌ 即使指定 PNG32，ImageMagick 内部仍然可能输出 PaletteAlpha
magick icon.svg -background none -resize 32x32 -depth 8 PNG32:icon.png
```

`magick identify -verbose` 显示 `Type: PaletteAlpha`，尽管 `PNG32:` 前缀理论上强制 32-bit RGBA。

---

## 4. 最终方案：Python 生成 RGBA PNG

核心思路：用 Python 的 `struct` + `zlib` 模块手工构建标准 RGBA PNG，避免 ImageMagick 的 PNG 编码器。

### 4.1 核心函数

```python
import struct, zlib, subprocess

def write_rgba_png(w, h, raw_rgba, path):
    """写一个标准的 RGBA PNG（color_type=6, 8-bit depth）"""
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    # PNG 规范要求每行前面加 filter byte（这里用 0=None）
    pf = bytearray()
    for y in range(h):
        pf.append(0)  # filter byte
        pf.extend(raw_rgba[y * w * 4 : (y + 1) * w * 4])

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')                                         # PNG signature
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))) # 8-bit RGBA
        f.write(chunk(b'IDAT', zlib.compress(bytes(pf))))                      # compressed data
        f.write(chunk(b'IEND', b''))                                           # end

    # 验证：ImageMagick 能重新读取为 RGBA
    r = subprocess.run(['magick', path, 'rgba:-'], capture_output=True)
    assert len(r.stdout) == w * h * 4, f'{path}: verify failed ({len(r.stdout)} != {w*h*4})'
```

### 4.2 圆角遮罩

由于 ImageMagick 不支持 SVG clip-path，圆角遮罩用 Python 的数学计算来实现：

```python
def make_rounded_mask(size, radius_ratio=0.223):
    """生成圆角矩形 alpha 遮罩（纯数学计算，无需 ImageMagick）"""
    radius = int(size * radius_ratio)
    raw = bytearray()
    for y in range(size):
        for x in range(size):
            a = 255  # default: opaque
            cx = cy = -1
            # 判断当前像素是否在某个角部区域
            if x < radius and y < radius:
                cx, cy = radius - 0.5, radius - 0.5     # 左上角
            elif x >= size - radius and y < radius:
                cx, cy = size - radius - 0.5, radius - 0.5  # 右上角
            elif x < radius and y >= size - radius:
                cx, cy = radius - 0.5, size - radius - 0.5  # 左下角
            elif x >= size - radius and y >= size - radius:
                cx, cy = size - radius - 0.5, size - radius - 0.5  # 右下角
            # 如果在角部圆外 → 设为透明
            if cx >= 0 and (x - cx)**2 + (y - cy)**2 > radius**2:
                a = 0
            raw.extend([255, 255, 255, a])
    return bytes(raw)
```

### 4.3 完整生成流程

```python
SVG_SRC = '/path/to/icon.svg'
ICONS_DIR = '/project/src-tauri/icons'

def gen_icon(sz, name):
    # Step 1: SVG → raw RGBA pixels (用 ImageMagick 只做 resize)
    r = subprocess.run(['magick', SVG_SRC, '-background', 'none',
                        '-density', '300', '-resize', f'{sz}x{sz}', '-depth', '8', 'rgba:-'],
                       capture_output=True)
    assert len(r.stdout) == sz * sz * 4

    # Step 2: 应用圆角遮罩（只修改 alpha 通道）
    mask = make_rounded_mask(sz)
    icon = bytearray(r.stdout)
    for i in range(sz * sz):
        if mask[i*4 + 3] == 0:
            icon[i*4 + 3] = 0  # 置透明

    # Step 3: 写为标准 RGBA PNG
    write_rgba_png(sz, sz, bytes(icon), f'{ICONS_DIR}/{name}')
```

---

## 5. 生成所有图标

### 5.1 所需尺寸

| 文件名 | 尺寸 | 用途 |
|--------|:----:|------|
| `32x32.png` | 32×32 | Tauri 配置必需 |
| `128x128.png` | 128×128 | Tauri 配置必需 |
| `128x128@2x.png` | 256×256 | Tauri 配置必需 |
| `icon.png` | 256×256 | 通用 |
| `icon.icns` | 多尺寸内嵌 | macOS |
| `icon.ico` | 多分辨率 | Windows |
| `StoreLogo.png` | 512×512 | 微软商店 |
| `Square*.png` | 30~310 | Windows 平铺图标 |

### 5.2 生成 .icns

```bash
# 1. 创建 iconset 目录
rm -rf /tmp/AppIcon.iconset && mkdir -p /tmp/AppIcon.iconset

# 2. 用上面的 gen_icon() 生成所有尺寸的 PNG 放入 iconset
# 需要: icon_16x16.png ~ icon_512x512@2x.png (共12个文件)

# 3. 用 iconutil 打包
iconutil -c icns /tmp/AppIcon.iconset -o /tmp/icon.icns
```

### 5.3 生成 .ico

```bash
magick icon-base.png -define icon:auto-resize=256,64,48,32,16 icon.ico
```

---

## 6. 触发 Tauri 重新编译

替换完 `src-tauri/icons/` 目录下的文件后，需要让 Tauri 重新读取图标：

```bash
touch src-tauri/build.rs
```

这会触发 `tauri-build` 重新处理图标资源。观察编译输出确保无 `icon ... is not RGBA` 错误。

---

## 7. 验证清单

生成后检查这些点：

```bash
# 1. 颜色正确（无黑色）
magick 32x32.png rgba:- | python3 -c "
import sys
d = sys.stdin.buffer.read()
w=32
for x,y in [(2,8),(16,16),(30,8)]:
    i=(y*w+x)*4
    print(f'({x},{y}): rgba({d[i]},{d[i+1]},{d[i+2]},{d[i+3]})')
"

# 2. 四角透明
magick 32x32.png rgba:- | python3 -c "
import sys
d = sys.stdin.buffer.read()
w=32
corners = [(0,0),(w-1,0),(0,w-1),(w-1,w-1)]
all_transparent = all(d[(y*w+x)*4+3]==0 for x,y in corners)
print(f'Corners transparent: {all_transparent}')
"

# 3. PNG 格式正确
python3 -c "
import struct
with open('32x32.png','rb') as f:
    d = f.read()
i = d.find(b'IHDR')
ct = d[i+13]
# color_type: 0=Gray, 2=RGB, 3=Palette, 4=Gray+Alpha, 6=RGBA
print(f'Color type: {ct} (must be 6=RGBA)')
"
```

---

## 8. 踩坑总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| SVG 渲染全黑 | MSVG 不支持 `clip-path`、`linearGradient` | 纯色 SVG + Python 圆角遮罩 |
| `is not RGBA` 编译错误 | ImageMagick 输出 `PaletteAlpha` PNG | Python 手工构建 `color_type=6` PNG |
| `0 pixels supplied` 运行时崩溃 | PNG 的 IDAT 压缩流格式不规范 | 严格按 PNG 规范在每行加 filter byte |
| Dock 图标无圆角 | 裸二进制无 macOS 圆角遮罩 | 物理裁切四角像素为透明 |
| 编译失败端口占满 | `cargo tauri dev` 多重启动 | 先 `kill` 旧进程再重启 |

---

## 9. 完整脚本参考

完整生成脚本见项目中的参考文件：

- `/tmp/maskgen.py` — 主图标 PNG 生成（32/128/256/512）
- `/tmp/maskgen2.py` — Square 系列 + .icns 生成

两个脚本核心逻辑相同：**SVG→ImageMagick resize→raw RGBA→Python 遮罩→Python 写标准 PNG**。
