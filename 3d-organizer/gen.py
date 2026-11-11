#!/usr/bin/env python3
# Combined VERTICAL desk charging STATION.
# Tablet + phone stand UPRIGHT at the FRONT, screens facing the user (-Y).
# Other 4 devices + pen/cable sit in recessed wells behind them.
# Pure stdlib -> binary STL.
import struct, os, json, math

OUTDIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)

BW, BD, BASE = 360.0, 250.0, 6.0   # base footprint (X width, Y depth, Z thickness)
OW_H   = 30.0                      # outer perimeter wall height
SLOT_T = 6.0                      # generic wall thickness

# device real dims (mm): (long, short) for the face the user sees
DEVICES = {
    "Galaxy Tab S10 FE+ (tablet)": (300.6, 194.7),
    "Galaxy S25 (telefon)":        (146.9, 70.5),
    "Samsung 10000mAh powerbank":  (141.8, 71.0),
    "Galaxy Watch 7 (44mm)":       (44.4, 44.4),
    "Galaxy Buds 2":               (50.0, 50.2),
    "Anker Atom III 65W":          (66.1, 38.3),
}

boxes = []
def add(x0,y0,z0,x1,y1,z1): boxes.append((x0,y0,z0,x1,y1,z1))

# Base slab
add(0,0,0, BW,BD,BASE)

# Outer perimeter walls
add(0,0,BASE, BW,SLOT_T,BASE+OW_H)        # front
add(0,BD-SLOT_T,BASE, BW,BD,BASE+OW_H)    # back
add(0,0,BASE, SLOT_T,BD,BASE+OW_H)        # left
add(BW-SLOT_T,0,BASE, BW,BD,BASE+OW_H)    # right

# ---- Tablet vertical slot (faces user), front-left ----
TX0,TX1 = 20.0, 220.0      # inner X (width along screen) = 200
TY0,TY1 = 18.0, 30.0       # inner Y (thickness) = 12
TZ = 311.0                 # tall enough for 300.6 mm tablet
add(TX0-SLOT_T, TY0-SLOT_T, BASE, TX1+SLOT_T, TY0, BASE+TZ)   # front wall
add(TX0-SLOT_T, TY1,       BASE, TX1+SLOT_T, TY1+SLOT_T, BASE+TZ) # back wall
add(TX0-SLOT_T, TY0,       BASE, TX0,        TY1, BASE+TZ)   # left cap
add(TX1,       TY0,       BASE, TX1+SLOT_T, TY1, BASE+TZ)   # right cap

# ---- Phone vertical slot (faces user), front-right ----
PX0,PX1 = 236.0, 314.0
PY0,PY1 = 18.0, 30.0
PZ = 166.0
add(PX0-SLOT_T, PY0-SLOT_T, BASE, PX1+SLOT_T, PY0, BASE+PZ)
add(PX0-SLOT_T, PY1,       BASE, PX1+SLOT_T, PY1+SLOT_T, BASE+PZ)
add(PX0-SLOT_T, PY0,       BASE, PX0,        PY1, BASE+PZ)
add(PX1,       PY0,       BASE, PX1+SLOT_T, PY1, BASE+PZ)

# ---- Recessed wells (4 walls each) ----
def well(ix0,iy0,ix1,iy1,h):
    z0=BASE; z1=BASE+h; t=SLOT_T
    add(ix0,iy0,z0, ix1,iy0+t,z1)          # bottom strip
    add(ix0,iy1-t,z0, ix1,iy1,z1)          # top strip
    add(ix0,iy0,z0, ix0+t,iy1,z1)          # left strip
    add(ix1-t,iy0,z0, ix1,iy1,z1)          # right strip

well(20,60,  172,141, 22)     # powerbank (flat)
well(20,150, 80,210, 30)      # watch
well(90,150, 151,211, 32)     # buds
well(161,150,238,199, 34)     # anker
well(250,60, 330,210, 22)     # pen / cable

# Pocket rects for preview/params (inner usable areas)
POCKETS = [
    ("TABLET (dik, on)", 20,18, 220,30),
    ("TELEFON (dik, on)", 236,18, 314,30),
    ("Powerbank", 20,60, 172,141),
    ("Watch 7", 20,150, 80,210),
    ("Buds 2", 90,150, 151,211),
    ("Anker 65W", 161,150, 238,199),
    ("Kalem/Kablo", 250,60, 330,210),
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

allp=[v for _,a,b,c in tris for v in (a,b,c)]
print("STL triangles:",len(tris))
print("BBox X %.1f Y %.1f Z %.1f"%(max(p[0] for p in allp)-min(p[0] for p in allp),
      max(p[1] for p in allp)-min(p[1] for p in allp), max(p[2] for p in allp)-min(p[2] for p in allp)))

json.dump({"type":"vertical desk station (reviewed/fixed)",
           "base_mm":[BW,BD,BASE],"outer_wall_height_mm":OW_H,
           "tablet_slot_height_mm":TZ,"phone_slot_height_mm":PZ,
           "devices_real_mm":DEVICES,
           "pockets_inner_xy":{n:[x0,y0,x1,y1] for n,x0,y0,x1,y1 in POCKETS}},
          open(os.path.join(OUTDIR,"params.json"),"w"), indent=2, ensure_ascii=False)

try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    fig,ax=plt.subplots(figsize=(BW/40,BD/40))
    ax.add_patch(Rectangle((0,0),BW,BD,fill=False,ec="black",lw=2))
    for name,x0,y0,x1,y1 in POCKETS:
        ax.add_patch(Rectangle((x0,y0),x1-x0,y1-y0,fill=True,fc="#dfe7ef",ec="#5b7a99",lw=1.1))
        ax.text((x0+x1)/2,(y0+y1)/2,name,ha="center",va="center",fontsize=6.5)
    ax.set_xlim(-10,BW+10); ax.set_ylim(-10,BD+10); ax.set_aspect("equal")
    ax.set_title("Masa İstasyonu (tablet + telefon dik, ekran size donuk)")
    ax.set_xlabel("X (mm)"); ax.set_ylabel("Y (mm)  [altta = ON]")
    plt.tight_layout(); plt.savefig(os.path.join(OUTDIR,"preview.png"),dpi=130)
    print("preview written")
except Exception as e:
    print("preview skipped:",e)
