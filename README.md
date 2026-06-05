# 🎮 QuizUpp - Gerçek Zamanlı Espor Temalı Bilgi Yarışması Platformu 🚀

QuizUpp; kullanıcıların kendi bilgi yarışmalarını (quiz) oluşturabildiği, arkadaşlarıyla oda kodu paylaşarak veya canlı lobilere katılarak gerçek zamanlı yarışabildiği, espor temalı neon tasarıma sahip modern bir web uygulamasıdır.

---

## 🏛️ 1. Genel Mimari ve Teknoloji Yığını

Uygulamamız **Client-Server (İstemci-Sunucu)** yapısında olup, bağımsız mikroservis mimarisiyle Docker üzerinde containerize edilmiştir.

*   **Önyüz (Frontend):** React.js ve modern esnek yerleşimler için Vanilla CSS.
*   **Sunucu (Backend):** Node.js, Express.js ve Socket.io (WebSocket).
*   **Veritabanı (Database):** PostgreSQL ilişkisel veritabanı.
*   **Konteynerizasyon:** Docker ve Docker Compose (Postgres, Backend ve Frontend için 3 ayrı servis).

---

## 💾 2. Veritabanı ve İlişkisel Model (PostgreSQL)

Kullanıcıların oluşturduğu quizlerin, bunlara ait soruların ve oyun sonlarındaki yüksek skor kayıtlarının kalıcı olarak saklanması için kullanılan SQL tabloları ve veri tipleri aşağıda belirtilmiştir:

```sql
-- 1. Kullanıcılar Tablosu (Kimlik doğrulama ve kullanıcı bilgileri)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Quiz Tablosu (Her quiz bir kullanıcıya aittir - Bire Çok İlişki)
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    timer_seconds INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sorular Tablosu (Her soru bir quize bağlıdır - Bire Çok İlişki)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option_index INTEGER NOT NULL CHECK (
        correct_option_index >= 0 AND correct_option_index <= 3
    ),
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Küresel Liderlik Tablosu (Tüm odalarda elde edilen skorların saklandığı tablo)
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚡ 3. Teknik Derinlik ve Gelişmiş Özellikler

Projenin akademik kalitesini ve teknik ağırlığını artırmak amacıyla geliştirilen ileri seviye özellikler:

### A) Disconnection-Tolerance (Bağlantı Kopma Koruması)
Gerçek zamanlı oyunlarda internet kesintileri veya tarayıcı yenilemelerine (F5) karşı tolerans geliştirilmiştir:
*   Oyuncu odaya girdiğinde bilgileri tarayıcının `sessionStorage` alanına kaydedilir.
*   Bağlantı koptuğunda sunucu oyuncuyu hemen silmez, 60 saniye boyunca "offline" etiketli bir timeout başlatır.
*   Oyuncu 60 saniye içinde sayfayı yeniler veya geri dönerse sunucu eski soket kimliği ile yenisini eşler; oyuncunun puanını, çözdüğü soru geçmişini ve kalan jokerlerini koruyarak oyuna sorunsuz devam ettirir.

### B) Süre Sonunda Cevap Gösterme & Voters PP'leri
*   **Cevap Gizliliği:** Kopya çekilmeyi önlemek amacıyla, bir oyuncu şık seçtiğinde sürenin bitimine kadar seçimin doğru/yanlış olduğu açıklanmaz.
*   **Profil Resmi (PP) Emojileri:** Oyuncuların kullanıcı adlarının hash değerlerine göre otomatik atanan 14 farklı eğlenceli emoji PP sistemi kurulmuştur.
*   **Kim Neyi Seçmiş?:** Soru bittiğinde backend'den gelen `playerAnswers` listesiyle, her şıkkın altında o seçeneği seçen oyuncuların profil resimleri (PP) ve isimleri küçük neon baloncuklar halinde dairesel şekilde listelenir.

### C) Real-Time SVG Dağılım Grafikleri
Herhangi bir harici grafik kütüphanesi (Recharts, Chart.js vb.) kullanılmadan, soru bitiminde odadaki oyuncuların verdikleri cevapların dağılımını gösteren animasyonlu neon SVG barları saf HTML/CSS ve dinamik SVG rect'ler ile çizilmiştir.

### D) Web Audio API ile Kod Üzerinden Ses Sentezleme
Uygulamanın sunucu ve ağ yükünü artıracak `.mp3` veya `.wav` ses dosyaları indirmesini engellemek amacıyla tüm ses efektleri tarayıcının yerleşik **Web Audio API (AudioContext)** altyapısı kullanılarak tamamen kodla üretilmiştir:
*   `OscillatorNode` ile testere dişi, sinüs ve üçgen dalga formları sentezlenmiştir.
*   `GainNode` ile ses genliği milisaniyeler bazında sönümlenerek (envelope modulation) tik-tak, doğru, yanlış ve şampiyonluk melodi sesleri dinamik olarak oluşturulmuştur.

### E) Sunucu Tarafı Tek Kullanımlık Joker Doğrulaması
Arayüz manipülasyonuyla sınırsız joker kullanılmasını önlemek için `%50` ve `Çift Şans` joker hakları backend'de oyuncu nesnesinde saklanacak şekilde güncellenmiş ve sunucu tarafı kontrolleri eklenmiştir.

---

## 🎨 4. Arayüz Tasarımı ve Ekran Görüntüleri (UI/UX)

### A) Lobi Arama ve Ana Sayfa
Ana sayfadaki tüm kartların ve bileşenlerin yana doğru orantısız genişlemesi engellenerek dikey eksende dengeli bir flex yapısına kavuşturulmuştur. Hazır kategoriler mor, zümrüt yeşili, turkuaz ve turuncu neon kartlarla listelenmiştir.

<img width="1879" height="786" alt="image" src="https://github.com/user-attachments/assets/3697e1df-50fb-4dae-a6e7-c6a530c43152" />

### B) İki Kolonlu Oyun Ekranı Grid Düzeni
Canlı oyun alanı sol tarafta soru metni, asil mor seçenek butonları, joker yönetimi ve SVG grafik alanından oluşurken; sağ kolonda canlı skorbord ve anlık emoji gönderme alanı yer alır.

<img width="1049" height="864" alt="Ekran görüntüsü 2026-06-05 155747" src="https://github.com/user-attachments/assets/6a2cebcb-5659-4891-979e-e7372e437bb6" />

### C) Süre Sonunda Voters PP'leri ve Seçim Baloncukları
Soru süresi tamamlandığında veya herkes cevapladığında doğru cevap yeşile, yanlış cevaplar kırmızıya döner. Hangi oyuncunun hangi seçeneği işaretlediği, o şıkkın altında otomatik atanan emoji avatarları ve isim baloncuklarıyla listelenir.

<img width="493" height="720" alt="Ekran görüntüsü 2026-06-05 160522" src="https://github.com/user-attachments/assets/ed7196e3-f04f-4dae-a6e7-c6a530c43152" />

### D) Canlı SVG Dağılım Grafiği
Sorunun süresi dolduğu anda, şıkların üzerinde yer alan ve oyuncuların oy verme dağılımlarını gösteren neon SVG grafikleri dinamik genişlik geçişleriyle ekrana yansır.

<img width="489" height="417" alt="Ekran görüntüsü 2026-06-05 160536" src="https://github.com/user-attachments/assets/1269a5e4-f1b8-41c8-8364-6775d7d75f90" />

### E) Sunucu Tarafı Joker Yönetimi Arayüzü
Oyuncu ekranındaki Yarı Yarıya (%50) ve Çift Şans joker butonları, kullanıldıkları anda pasifleşerek "Kullanıldı" durumuna geçer.

<img width="570" height="361" alt="Ekran görüntüsü 2026-06-05 155754" src="https://github.com/user-attachments/assets/9cfb1e8e-1e15-4230-8a6c-58fe4ffb405f" />

### F) Hazır Soru Paketleri ve Özgün Sorular
Lobi yöneticisi (Host), sisteme gömülü olan 12 farklı hazır kategoriden birini seçerek anında lobi başlatabilir.

<img width="1510" height="485" alt="image" src="https://github.com/user-attachments/assets/dc38392a-856f-463f-a446-b73d85adf230" />
<img width="1715" height="865" alt="image" src="https://github.com/user-attachments/assets/ea8a2324-96a1-4e4d-a9f6-db08b3754c0e" />

### G) Host Yetki Modifikasyonu (Lobi Listesi ve Katılım)
Host, hazır soru şablonlarında oyuna katılarak diğer yarışmacılarla rekabet edebilir. Özel oluşturduğu sınavlarda ise soruları bildiği için sadece izleyici konumunda kalır.

<img width="1084" height="519" alt="image" src="https://github.com/user-attachments/assets/612e4d6e-df14-4ed5-b6e3-5dcb065f2e86" />

### H) Küresel Liderlik Kürsüsü (Podium)
Ana sayfa üzerinde yer alan podyum, veritabanındaki en iyi skora sahip ilk 3 yarışmacıyı 3D-benzeri yükseklik bloklarıyla (1. ortada en yüksek, 2. solda orta, 3. sağda alçak) görselleştirir.

<img width="788" height="645" alt="image" src="https://github.com/user-attachments/assets/da3f663b-d76e-4752-bfa6-074eca7be920" />

---

## 🐳 5. Docker ile Kurulum ve Çalıştırma

Uygulamayı veritabanı (PostgreSQL), backend ve frontend servisleriyle birlikte tek bir komutla ayağa kaldırabilirsiniz:

```bash
docker compose up --build -d
```

Uygulama başarıyla çalıştığında:
*   **Frontend (React App):** [http://localhost:3000](http://localhost:3000)
*   **Backend (API Server):** [http://localhost:5000](http://localhost:5000)
*   **Database (PostgreSQL):** `localhost:5432` portu üzerinden erişime açılacaktır.

---

## 🛠️ 6. Yerel (Local) Geliştirme Ortamı Kurulumu

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
