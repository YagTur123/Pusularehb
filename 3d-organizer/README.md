# Birleşik Masa İstasyonu (3D Baskı) — Tablet & Telefon Dik, Diğerleri Gömme

Bu klasörde, aşağıdaki 6 cihazın **hepsini tek bir masa istasyonunda** tutacak şekilde
hazırlanmış, 3D yazıcıya doğrudan gönderilebilecek bir `.stl` modeli bulunur.
**Tablet ve telefon ayakta (dik) durur**, diğer 4 cihaz ve kalem/kablo için gömme gözler vardır.

| # | Cihaz | Gerçek boyut (mm) | Göz boyutu (mm) |
|---|-------|-------------------|-----------------|
| 1 | Galaxy Tab S10 FE+ (tablet) | 300.6 × 194.7 × 6.0 | **Dik slot** (ön, 221 mm yüksek) |
| 2 | Galaxy S25 (telefon)        | 146.9 × 70.5 × 7.2  | **Dik slot** (ön, 166 mm yüksek) |
| 3 | Samsung 10000 mAh powerbank (EB‑P1100) | 141.8 × 71 × 14 | Gömme göz 152 × 81 |
| 4 | Galaxy Watch 7 (44 mm)     | 44.4 × 44.4 × 9.7  | Gömme göz 60 × 60 |
| 5 | Galaxy Buds 2 (şarj kutusu)| 50.0 × 50.2 × 27.8 | Gömme göz 61 × 61 |
| 6 | Anker Atom III 65W         | 66.1 × 38.3 × 30   | Gömme göz 77 × 49 |

Arkada ayrıca bir **kalem / kablo gözü** bulunur.

## Dosyalar
- `combined_organizer.stl` — baskıya hazır birleşik model (360 × 250 × 317 mm).
- `preview.png` — üstten görünüm (yerleşim şeması).
- `params.json` — tüm boyut ve göz koordinatları (tekrar üretim / düzenleme için).
- `gen.py` — modeli üreten sıfır‑bağımlılıklı Python betiği (istediğinizde göz boyutlarını değiştirip yeniden çalıştırabilirsiniz).

## Yerleşim
- **Ön (kullanıcıya yakın):** Tablet ve telefon **dik / ayakta** durur (uzun slotlar).
- **Arka / sağ bölge:** Powerbank, Watch 7, Buds 2, Anker Atom III için gömme gözler + ayrı bir kalem/kablo gözü.
- Taban **360 × 250 mm**; tablet slotu **317 mm** (tablet dik), telefon slotu **166 mm** yüksekliğinde. Toplam yükseklik 317 mm.

## Baskı önerileri
- **Malzeme:** PLA veya PETG.
- **Nozzle:** 0.4 mm, **Katman yüksekliği:** 0.2 mm.
- **Duvar/perimeter:** 3, **İnfill:** %15–20 (grid), **Taban/üst:** yeterli.
- **Destek (support):** Gerekmez — tüm şekiller dikey ekstrüzyon, taşma (overhang) yok.
- **Brim:** Taban büyük olduğu için ilk katmanda hafif yapışma sorunu olursa brim açılabilir.
- **Yön:** Olduğu gibi düz zemine (tablaya) basılır.

## Önemli not — baskı yatağı boyutu
Taban **360 × 250 mm**, toplam yükseklik **317 mm** (tablet dik durduğu için Z=317 gerekir).
Yatak Z yüksekliğiniz 317 mm altındaysa tablet yatay (flat) versiyon isteyin.
Taban 360 mm geniş olduğundan tek parça ancak ~360 mm'lik bir yatakta (ör. 400×400,
350×350, Ultimaker vb.) basılır. 220×220 / 256×256 gibi küçük yataklarda **tek parça sığmaz**.

Seçenekler:
1. `gen.py` içindeki göz koordinatlarını düzenleyip modeli ikiye bölerek (sol / sağ
   parça) ayrı bastırıp birleştirebiliriz — isterseniz bölmüş versiyonu da üretebilirim.
2. Cihaz gözlerini ölçeklendirerek küçültmek **önerilmez**, çünkü cihazlar sığmayabilir.

## İlersi için
- Gözlere 5–10 mm pay bırakıldı. Baskınızda çekme/küçülme olursa `gen.py`
  içindeki `pockets` listesindeki koordinatları ~0.2–0.4 mm büyüterek yeniden üretebilirsiniz.
- İsterseniz aynı cihazlar için ayrı ayrı stand/kılıf (.stl) veya kapaklı bir seyahat
  kutusu versiyonu da hazırlayabilirim.
