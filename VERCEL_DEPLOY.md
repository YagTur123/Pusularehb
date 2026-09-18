# Pusula Rehberlik - Vercel Dağıtım ve Bulut Yapılandırması

## 1. Vercel Kurulumu (Adım Adım)
1. Bu projeyi GitHub hesabınıza yükleyin (**Export to GitHub** veya ZIP olarak indirip repo açarak).
2. [vercel.com](https://vercel.com) adresine gidip **Add New Project** seçeneğine tıklayın.
3. GitHub deponuzu seçin.
4. **Framework Preset:** `Vite` (otomatik algılanır).
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Deploy** butonuna tıklayın.

## 2. Firebase Bulut Veritabanı
Firebase Firestore yapılandırması `firebase-applet-config.json` dosyası üzerinden doğrudan çalışacak şekilde hazırlandı. 
Ekstra bir çevre değişkeni (`.env`) girmeden Vercel derlemesi doğrudan çalışır.

Tüm seanslar, öğrenciler ve danışman ayarları hem yerel hafızada (`localStorage`) hem de Google Cloud Firestore veritabanında anlık olarak eşitlenir.
