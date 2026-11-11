#!/usr/bin/env python3
# Combined vertical desk charging STATION (tablet + phone stand upright at front,
# other devices in recessed wells). Pure stdlib -> binary STL.
import struct, os, json, math

OUTDIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)

# ---- Base / outer dims ----
BW, BD, BASE = 360.0, 250.0, 6.0   # base footprint (X width, Y depth, Z thickness)
OW_H   = 30.0                       # outer perimeter wall height
SLOT_T = 6.0                       # generic wall thickness

DEVICES = {
    "Galaxy Tab S10 FE+ (tablet)": (300.6, 194.7),
    "Galaxy S25 (telefon)":        (146.9, 70.5),
    "Samsung 10000mAh powerbank":  (141.8, 71.0),
    "Galaxy Watch 7 (44mm)":       (44.4, 44.4),
    "Galaxy Buds 2":               (50.0, 50.2),
    "Anker Atom III 65W":          (66.1, 38.3),
}

# ---- Box list (x0,y0,z0,x1,y1,z1) ----
boxes = []
def add(x0,y0,z0,x1,y1,z1): boxes.append((x0,y0,z0,x1,y1,z1))

# Base slab
add(0,0,0, BW,BD,BASE)

# Outer perimeter walls (height OW_H)
add(0,0,BASE, BW,SLOT_T,BASE+OW_H)          # front
add(0,BD-SLOT_T,BASE, BW,BD,BASE+OW_H)      # back
add(0,0,BASE, SLOT_T,BD,BASE+OW_H)          # left
add(BW-SLOT_T,0,BASE, BW,BD,BASE+OW_H)      # right

# Tablet vertical slot (front-left), tall
TS_H = 221.0
add(18,20,BASE, 24,223,TS_H)            # front wall (in X)
add(32,20,BASE, 38,223,TS_H)            # back wall
add(18,20,BASE, 38,26,TS_H)             # end cap (Y small)
add(18,217,BASE, 38,223,TS_H)           # end cap (Y large)

# Phone vertical slot (front-center)
PS_H = 166.0
add(70,20,BASE, 76,98,PS_H)             # front wall
add(88,20,BASE, 94,98,PS_H)             # back wall
add(70,20,BASE, 94,26,PS_H)             # end cap
add(70,92,BASE, 94,98,PS_H)             # end cap

# Recessed wells: 4 walls each (bottom, top, left, right strips)
def well(ix0,iy0,ix1,iy1,h):
    z0=BASE; z1=BASE+h; t=SLOT_T
    add(ix0,iy0,z0, ix1,iy0+t,z1)          # bottom strip
    add(ix0,iy1-t,z0, ix1,iy1,z1)          # top strip
    add(ix0,iy0,z0, ix0+t,iy1,z1)          # left strip
    add(ix1-t,iy0,z0, ix1,iy1,z1)          # right strip

well(100,20, 252,101, 22)     # powerbank
well(100,110,160,170, 30)     # watch
well(165,110,226,171, 32)     # buds
well(231,110,308,159, 34)     # anker
well(314,20, 354,230, 22)     # pen / cable

# Pocket rects (for preview + params): inner usable areas
POCKETS = [
    ("TABLET (dik)", 24,20, 32,223),
    ("TELEFON (dik)", 76,20, 88,98),
    ("Powerbank", 100,20, 252,101),
    ("Watch 7", 100,110, 160,170),
    ("Buds 2", 165,110, 226,171),
    ("Anker 65W", 231,110, 308,159),
    ("Kalem/Kablo", 314,20, 354,230),
]

# ---- Mesh ----
tris = []
def add_tri(n,v0,v1,v2): tris.append((n,v0,v1,v2))
def add_box(x0,y0,z0,x1,y1,z1):
    cx,cy,cz=(x0+x1)/2,(y0+y1)/2,(z0+z1)/2
    faces=[
        [(x0,y0,z0),(x0,y1,z0),(x0,y1,z1),(x0,y0,z1)],
        [(x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0)],
        [(x0,y0,z0),(x0,y0,z1),(x1,y0,z1),(x1,y0,z0)],
        [(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],
        [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0)],
        [(x0,y0,z1),(x0,y1,z1),(x1,y1,z1),(x1,y0,z1)],
    ]
    for f in faces:
        v0,v1,v2=f[0],f[1],f[2]
        e1=tuple(a-b for a,b in zip(v1,v0)); e2=tuple(a-b for a,b in zip(v2,v0))
        n=(e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        cc=((v0[0]+v1[0]+v2[0])/3,(v0[1]+v1[1]+v2[1])/3,(v0[2]+v1[2]+v2[2])/3)
        if n[0]*(cc[0]-cx)+n[1]*(cc[1]-cy)+n[2]*(cc[2]-cz)<0:
            v1,v2=v2,v1
            e1=tuple(a-b for a,b in zip(v1,v0)); e2=tuple(a-b for a,b in zip(v2,v0))
            n=(e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        add_tri(n,v0,v1,v2); add_tri(n,v0,v2,f[3])

for b in boxes: add_box(*b)

def write_stl(path):
    with open(path,'wb') as f:
        f.write(b'\0'*80); f.write(struct.pack('<I',len(tris)))
        for n,v0,v1,v2 in tris:
            f.write(struct.pack('<3f',*n))
            for v in (v0,v1,v2): f.write(struct.pack('<3f',*v))
            f.write(struct.pack('<H',0))

write_stl(os.path.join(OUTDIR,"combined_organizer.stl"))

# stats
allp=[v for _,a,b,c in tris for v in (a,b,c)]
print("STL triangles:",len(tris))
print("BBox X %.1f Y %.1f Z %.1f"%(max(p[0] for p in allp)-min(p[0] for p in allp),
      max(p[1] for p in allp)-min(p[1] for p in allp), max(p[2] for p in allp)-min(p[2] for p in allp)))

# params
json.dump({"type":"vertical desk station","base_mm":[BW,BD,BASE],
           "outer_wall_height_mm":OW_H,"tablet_slot_height_mm":TS_H,
           "phone_slot_height_mm":PS_H,
           "devices_real_mm":DEVICES,
           "pockets_inner_xy":{n:[x0,y0,x1,y1] for n,x0,y0,x1,y1 in POCKETS}},
          open(os.path.join(OUTDIR,"params.json"),"w"), indent=2, ensure_ascii=False)

# preview (top view)
try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    fig,ax=plt.subplots(figsize=(BW/40,BD/40))
    ax.add_patch(Rectangle((0,0),BW,BD,fill=False,ec="black",lw=2))
    for name,x0,y0,x1,y1 in POCKETS:
        ax.add_patch(Rectangle((x0,y0),x1-x0,y1-y0,fill=True,fc="#dfe7ef",ec="#5b7a99",lw=1.1))
        ax.text((x0+x1)/2,(y0+y1)/2,name,ha="center",va="center",fontsize=6.5)
    ax.set_xlim(-10,BW+10); ax.set_ylim(-10,BD+10); ax.set_aspect("equal")
    ax.set_title("Masa İstasyonu (tablet + telefon dik, önde)")
    ax.set_xlabel("X (mm)"); ax.set_ylabel("Y (mm)  [altta = ÖN]")
    plt.tight_layout(); plt.savefig(os.path.join(OUTDIR,"preview.png"),dpi=130)
    print("preview written")
except Exception as e:
    print("preview skipped:",e)
