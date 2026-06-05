# 🎮 QuizUpp - Gerçek Zamanlı Espor Temalı Bilgi Yarışması Platformu 🚀

QuizUpp; kullanıcıların kendi bilgi yarışmalarını (quiz) oluşturabildiği, arkadaşlarıyla oda kodu paylaşarak veya canlı lobilere katılarak gerçek zamanlı yarışabildiği, espor temalı neon tasarıma sahip modern bir web uygulamasıdır.

Detaylı teknik, mimari ve akademik rapor için [PROJE_DOKUMANTASYONU.md](PROJE_DOKUMANTASYONU.md) dosyasını inceleyebilirsiniz.

---

## 📸 Ekran Görüntüleri ve Arayüz Tasarımı

### 1. Ana Sayfa & Canlı Lobi Arama
Kullanıcılar bekleme odasında olan canlı oyunları görerek anında "Hemen Katıl ve Yarış" butonuyla lobilere giriş yapabilir. Sayfanın altında PostgreSQL veritabanından beslenen haftalık en iyi 3 oyuncunun yer aldığı **Haftalık Liderlik Kürsüsü (Podium)** bulunur.

<img width="1879" height="786" alt="image" src="https://github.com/user-attachments/assets/3697e1df-50fb-4dae-a6e7-c6a530c43152" />

### 2. Canlı Oyun Ekranı Grid Düzeni
Oyun ekranı masaüstü cihazlar için iki kolonlu grid yapısındadır. Sol tarafta soru metni, şıklar, joker alanları ve canlı SVG oy dağılım grafikleri yer alırken; sağ sütunda anlık oyuncu sıralaması ve emoji paneli bulunur.

<img width="1049" height="864" alt="Ekran görüntüsü 2026-06-05 155747" src="https://github.com/user-attachments/assets/6a2cebcb-5659-4891-979e-e7372e437bb6" />

### 3. Süre Sonu Seçimler & Profil Emojileri (Voters PP)
Soru süresi tamamlandığında doğru şık yeşil neon, yanlış işaretlenen şık kırmızı neon gradyanı ile yanıp shake (titreme) animasyonu yapar. Şıkların altında, o seçeneği seçen oyuncuların profil resimleri (emoji avatarları) ve isimleri baloncuk halinde belirir.

<img width="493" height="720" alt="Ekran görüntüsü 2026-06-05 160522" src="https://github.com/user-attachments/assets/ed7196e3-f04f-4dae-a6e7-c6a530c43152" />

### 4. Canlı SVG Dağılım Grafiği
Süre bitimiyle birlikte oyuncuların hangi seçeneği ne kadar işaretlediğini gösteren animasyonlu neon SVG barları saf CSS transition geçişleriyle ekrana yansır.

<img width="489" height="417" alt="Ekran görüntüsü 2026-06-05 160536" src="https://github.com/user-attachments/assets/1269a5e4-f1b8-41c8-8364-6775d7d75f90" />

### 5. Sunucu Tarafı Joker Yönetimi
Yarı Yarıya (%50) ve Çift Şans jokerleri sunucu tarafında doğrulanır ve tek kullanımlık olarak kısıtlanır. Kullanılan jokerler butonlarda "Kullanıldı" olarak pasifleşir.

<img width="570" height="361" alt="Ekran görüntüsü 2026-06-05 155754" src="https://github.com/user-attachments/assets/9cfb1e8e-1e15-4230-8a6c-58fe4ffb405f" />

### 6. Hazır Soru Şablonları & Lobi Kurulumu
Backend'e statik olarak gömülü 12 farklı hazır kategoriden birini seçerek anında oda kurabilirsiniz. Hazır oyunlarda odayı kuran kişi (Host) soruları önceden bilmediği için oyuna oyuncu olarak dahil olabilir.

<img width="1510" height="485" alt="image" src="https://github.com/user-attachments/assets/dc38392a-856f-463f-a446-b73d85adf230" />
<img width="1715" height="865" alt="image" src="https://github.com/user-attachments/assets/ea8a2324-96a1-4e4d-a9f6-db08b3754c0e" />

---

## ⚡ Öne Çıkan Gelişmiş Teknik Özellikler

*   **Disconnection-Tolerance (Oturum Kurtarma):** Tarayıcı yenilense ya da bağlantı anlık kopsa dahi, oyuncu 60 saniye içinde odaya döndüğünde eski soketi yenisiyle eşleşir; skoru, çözdüğü sorular ve kalan jokerleri korunur.
*   **Web Audio API Ses Sentezleme:** Hiçbir harici `.mp3` veya ses dosyası kullanılmadan; tik-tak, doğru, yanlış, roket bonusu ve şampiyonluk zafer melodileri tarayıcı osilatörleriyle kod üzerinden sentezlenir.
*   **Hız Bonusu Puanlama Sistemi:** Doğru cevabı veren ilk oyuncu $+100$ hız bonusu puanı kazanır.
*   **Sunucu Tarafı Joker Kontrolü:** Jokerlerin arayüz manipülasyonu ile sınırsızca kullanılmasını engellemek amacıyla backend tarafında yetkilendirme ve tek kullanımlık kontrol mekanizması kurulmuştur.
*   **Kullanıcı Adına Duyarlı Avatar Atama:** Oyuncuların profil resimleri, kullanıcı adı karakterlerinin ASCII toplamı üzerinden modül alınarak 14 farklı emoji arasından otomatik belirlenir.

---

## 🐳 Docker ile Kurulum ve Çalıştırma

Uygulamayı veritabanı (PostgreSQL), backend ve frontend servisleriyle birlikte tek bir komutla ayağa kaldırabilirsiniz:

```bash
docker compose up --build -d
```

Uygulama başarıyla çalıştığında:
*   **Frontend (React App):** [http://localhost:3000](http://localhost:3000)
*   **Backend (API Server):** [http://localhost:5000](http://localhost:5000)
*   **Database (PostgreSQL):** `localhost:5432` portu üzerinden erişime açılacaktır.

---

## 🛠️ Yerel (Local) Geliştirme Ortamı Kurulumu

Eğer Docker kullanmadan çalıştırmak isterseniz:

### 1. Veritabanı Kurulumu
Yerel PostgreSQL sunucunuzda `roomapp` adında bir veritabanı oluşturun ve backend klasöründeki `.env` dosyasını kendi veritabanı bilgilerinize göre düzenleyin.

### 2. Backend Sunucusunu Başlatma
```bash
cd backend
npm install
npm start
```

### 3. Frontend İstemcisini Başlatma
```bash
cd frontend
npm install
npm start
```
İstemci otomatik olarak [http://localhost:3000](http://localhost:3000) adresinde açılacaktır.
