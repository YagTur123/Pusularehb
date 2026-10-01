# Pusula Rehberlik - Danışmanlık ve Öğrenci Takip Portalı

Pusula Rehberlik; okul psikolojik danışmanları, rehber öğretmenler ve öğrenci koçları için tasarlanmış yüksek performanslı bir seans planlama, öğrenci CRM ve WhatsApp bildirim platformudur. 

6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca reşit olmayan öğrencilere ait özel nitelikli veriler en üst düzey güvenlik ve gizlilik standartlarıyla korunur.

---

## 🎯 Temel Özellikler

1. **KVKK Uyumlu İzolasyon & Güvenlik:**
   - Her danışmanın verileri Firebase Authentication ile izole edilir (`counselors/{uid}/students`, `counselors/{uid}/sessions`).
   - Sadece oturum açan danışman kendi öğrencilerini ve görüşme notlarını okuyabilir, değiştirebilir ve silebilir.
   - İlk girişte zorunlu KVKK Aydınlatma Metni onayı.
   - Profil ayarlarından tek tıkla **Verileri Dışa Aktarma (JSON/CSV)** ve **Hesabı & Tüm Verileri Kalıcı Olarak Silme (Unutulma Hakkı)**.

2. **Dinamik Seans Planlayıcı (Daily Scheduler):**
   - 15, 30 veya 40 dakikalık kişiselleştirilebilir seans blokları.
   - Teneffüs ve öğle arası yönetimi, tek tıkla saat kaydırma.
   - WhatsApp için mobil ekranlarda kaymayan sabit genişlikli (monospace) ASCII seans tablosu çıktısı.

3. **Öğrenci CRM & Risk Radarı:**
   - Öğrencilerin net durumları, hedef okulları, teşhis etiketleri ve geçmiş görüşme kayıtları.
   - 20+ gündür odaya uğramayan öğrencileri otomatik tespit eden Risk Radarı.
   - Excel ve WhatsApp listelerinden tek seferde öğrenci içe aktarma (Smart Paste).

4. **Kişiselleştirilmiş Geri Bildirim:**
   - Görüşme bitiminde öğrenci ve veliye tek tıkla resmi veya samimi dilde WhatsApp görüşme kartı iletme.

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın (Port 3000)
npm run dev

# Üretim derlemesi oluşturun
npm run build
```

---

## 🔐 Firebase Yapılandırması ve Konsol Adımları

Uygulamanın tam yetkiyle çalışması için Firebase Console üzerinde yapmanız gereken adımlar:

### 1. Firebase Authentication'ı Etkinleştirin
1. [Firebase Console](https://console.firebase.google.com/) adresine gidin ve projenizi seçin.
2. Sol menüden **Build > Authentication** sekmesine tıklayın.
3. **Sign-in method** sekmesine geçin:
   - **Email/Password (E-posta/Şifre):** Etkinleştirin (Enable).
   - **Google:** Etkinleştirin (Enable), projenin destek e-posta adresini seçin ve kaydedin.
4. **Authorized domains** (Yetkili alan adları) bölümüne uygulamanızın çalıştığı alan adını ekleyin.

### 2. Cloud Firestore Veritabanı ve Güvenlik Kuralları
1. Firebase Console sol menüsünden **Build > Firestore Database** sekmesine gidin.
2. Firestore veritabanınızın oluşturulduğundan emin olun.
3. Projede yer alan `firestore.rules` dosyası otomatik olarak deploy edilmiştir. Konsoldan doğrulamak için **Rules** sekmesine bakabilirsiniz:
   - Tüm kurallar `request.auth != null && request.auth.uid == userId` şartına bağlıdır.
   - Danışmanlar yalnızca kendi `counselors/{uid}` hiyerarşisindeki verileri okuyabilir, yazabilir ve silebilir.

---

## 🛠️ Teknoloji Yığını

- **Frontend:** React 19, TypeScript, Vite
- **Stil & Tasarım:** Tailwind CSS
- **Veritabanı & Kimlik Doğrulama:** Google Firebase (Firestore Subcollections, Firebase Auth)
- **Veri Doğrulama:** Zod (Tip ve şema güvenliği)
- **İkonlar:** Lucide React
