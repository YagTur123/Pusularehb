#!/usr/bin/env python3
# Parametric "combined desk/charging organizer tray" -> binary STL
# Pure stdlib (no external deps). All units in mm.
import struct, os, json, math

OUTDIR = "/home/user/organizer"
os.makedirs(OUTDIR, exist_ok=True)

# ---- Global parameters ----
WT   = 6.0    # wall thickness
BASE = 5.0    # base slab thickness
WH   = 28.0   # wall height
OW   = 494.0  # outer width  (X)
OD   = 389.0  # outer depth  (Y)
WZ0  = 0.0
WZ1  = BASE + WH   # 33.0 top of walls

# Device footprints (real, mm) and chosen pocket size (device + clearance)
DEVICES = {
    "Galaxy Tab S10 FE+ (tablet)": (300.6, 194.7),
    "Galaxy S25 (telefon)":        (146.9, 70.5),
    "Samsung 10000mAh powerbank":  (141.8, 71.0),
    "Galaxy Watch 7 (44mm)":       (44.4, 44.4),
    "Galaxy Buds 2":               (50.0, 50.2),
    "Anker Atom III 65W":          (66.1, 38.3),
}

# Pockets as [x0,y0,x1,y1] in OUTER XY coordinates.
# Tablet + accessory bin share the left column; 5 devices stacked in the right column.
pockets = [
    ("Galaxy Tab S10 FE+ (tablet)", (6,   6,   317, 211)),
    ("Aksesuar / kablo gözü",        (6,   217, 317, 383)),
    ("Galaxy S25 (telefon)",         (323, 6,   488, 90)),
    ("Samsung 10000mAh powerbank",   (323, 96,  488, 180)),
    ("Galaxy Watch 7 (44mm)",        (323, 186, 488, 251)),
    ("Galaxy Buds 2",                (323, 257, 488, 323)),
    ("Anker Atom III 65W",           (323, 329, 488, 383)),
    # Finger / cable slots carved into the front (bottom) wall
    ("NOTCH tablet",                 (70,  0,   250, 6)),
    ("NOTCH phone",                  (350, 0,   470, 6)),
]

# ---- Subtract pockets from the outer rectangle (rect-with-holes, axis aligned) ----
def subtract_all(rects, px0, py0, px1, py1):
    out = []
    for (rx0, ry0, rx1, ry1) in rects:
        if px1 <= rx0 or rx1 <= px0 or py1 <= ry0 or ry1 <= py0:
            out.append((rx0, ry0, rx1, ry1)); continue
        if px0 > rx0: out.append((rx0, ry0, px0, ry1))
        if px1 < rx1: out.append((px1, ry0, rx1, ry1))
        mx0 = max(rx0, px0); mx1 = min(rx1, px1)
        if mx1 > mx0:
            if py0 > ry0: out.append((mx0, ry0, mx1, py0))
            if py1 < ry1: out.append((mx0, py1, mx1, ry1))
    return out

rects = [(0.0, 0.0, OW, OD)]
for (name, (px0, py0, px1, py1)) in pockets:
    rects = subtract_all(rects, px0, py0, px1, py1)

# ---- Mesh building ----
tris = []
def add_tri(n, v0, v1, v2):
    tris.append((n, v0, v1, v2))

def add_box(x0, y0, z0, x1, y1, z1):
    cx, cy, cz = (x0+x1)/2, (y0+y1)/2, (z0+z1)/2
    faces = [
        [(x0,y0,z0),(x0,y1,z0),(x0,y1,z1),(x0,y0,z1)],
        [(x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0)],
        [(x0,y0,z0),(x0,y0,z1),(x1,y0,z1),(x1,y0,z0)],
        [(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],
        [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0)],
        [(x0,y0,z1),(x0,y1,z1),(x1,y1,z1),(x1,y0,z1)],
    ]
    for f in faces:
        v0, v1, v2 = f[0], f[1], f[2]
        e1 = tuple(a-b for a, b in zip(v1, v0))
        e2 = tuple(a-b for a, b in zip(v2, v0))
        n = (e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        cc = ((v0[0]+v1[0]+v2[0])/3, (v0[1]+v1[1]+v2[1])/3, (v0[2]+v1[2]+v2[2])/3)
        if n[0]*(cc[0]-cx) + n[1]*(cc[1]-cy) + n[2]*(cc[2]-cz) < 0:
            v1, v2 = v2, v1
            e1 = tuple(a-b for a, b in zip(v1, v0))
            e2 = tuple(a-b for a, b in zip(v2, v0))
            n = (e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        add_tri(n, v0, v1, v2)
        add_tri(n, v0, v2, f[3])

# base slab
add_box(0, 0, 0, OW, OD, BASE)
# wall prisms (one per wall rectangle)
for (rx0, ry0, rx1, ry1) in rects:
    add_box(rx0, ry0, WZ0, rx1, ry1, WZ1)

# ---- Write binary STL ----
def write_stl(path):
    with open(path, 'wb') as f:
        f.write(b'\0' * 80)
        f.write(struct.pack('<I', len(tris)))
        for n, v0, v1, v2 in tris:
            f.write(struct.pack('<3f', *n))
            for v in (v0, v1, v2):
                f.write(struct.pack('<3f', *v))
            f.write(struct.pack('<H', 0))

stl_path = os.path.join(OUTDIR, "combined_organizer.stl")
write_stl(stl_path)

# ---- Bounding box / stats ----
allpts = [v for _, a, b, c in tris for v in (a, b, c)]
minx = min(p[0] for p in allpts); maxx = max(p[0] for p in allpts)
miny = min(p[1] for p in allpts); maxy = max(p[1] for p in allpts)
minz = min(p[2] for p in allpts); maxz = max(p[2] for p in allpts)

print("STL written:", stl_path)
print("Triangles:", len(tris))
print("Wall rectangles:", len(rects))
print("Bounding box X: %.1f  Y: %.1f  Z: %.1f mm" % (maxx-minx, maxy-miny, maxz-minz))

# ---- Params dump ----
params = {
    "outer_mm": [OW, OD, WZ1],
    "wall_thickness_mm": WT,
    "base_thickness_mm": BASE,
    "wall_height_mm": WH,
    "devices_real_mm": DEVICES,
    "pockets_outer_xy": {name: list(p) for name, p in pockets},
    "finger_slots": ["tablet", "phone"],
}
with open(os.path.join(OUTDIR, "params.json"), "w") as f:
    json.dump(params, f, indent=2, ensure_ascii=False)

# ---- Preview PNG (matplotlib if available) ----
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    fig, ax = plt.subplots(figsize=(OW/40, OD/40))
    ax.add_patch(Rectangle((0,0), OW, OD, fill=False, ec="black", lw=2))
    for name, (x0,y0,x1,y1) in pockets:
        w, h = x1-x0, y1-y0
        if name.startswith("NOTCH"):
            ax.add_patch(Rectangle((x0,y0), w, h, fill=True, fc="red", alpha=0.6))
            continue
        ax.add_patch(Rectangle((x0,y0), w, h, fill=True, fc="#dfe7ef", ec="#5b7a99", lw=1.2))
        ax.text((x0+x1)/2, (y0+y1)/2, name, ha="center", va="center",
                fontsize=7, wrap=True)
    ax.set_xlim(-10, OW+10); ax.set_ylim(-10, OD+10)
    ax.set_aspect("equal"); ax.set_title("Birleşik Organizer Tepsi (üstten görünüm, mm)")
    ax.set_xlabel("X (mm)"); ax.set_ylabel("Y (mm)")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTDIR, "preview.png"), dpi=120)
    print("Preview written:", os.path.join(OUTDIR, "preview.png"))
except Exception as e:
    print("Preview skipped:", e)
