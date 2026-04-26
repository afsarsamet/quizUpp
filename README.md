# quizUpp 

quizUpp, kullanıcıların kendi quizlerini oluşturup arkadaşlarıyla gerçek zamanlı olarak oynayabildiği canlı quiz uygulamasıdır. Kullanıcılar kayıt olup quiz oluşturabilir, oluşturdukları quizleri daha sonra tekrar kullanabilir ve oda kodu paylaşarak arkadaşlarını oyuna davet edebilir.

Oyuncular kayıt olmadan sadece oda kodu ve kullanıcı adı girerek oyuna katılabilir. Host ise quiz oluşturur, odayı açar ve oyunu başlatır. Sorular süreli şekilde gelir, oyuncular cevap verir ve doğru cevaba göre puan kazanır.

---

## İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Öne Çıkan Özellikler](#öne-çıkan-özellikler)
- [Ekran Görüntüleri](#ekran-görüntüleri)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)


---

## Proje Hakkında

QuizUpp, Kahoot benzeri bir quiz deneyimi sunmayı amaçlayan full-stack bir web uygulamasıdır. Uygulamanın temel amacı, kullanıcıların kolayca quiz hazırlayıp arkadaşlarıyla canlı olarak oynayabilmesidir.

Projede iki temel kullanıcı tipi vardır:

1. **Host**
   - Kayıt olur veya giriş yapar.
   - Quiz oluşturur.
   - Quiz için soru süresi belirler.
   - Oda kodu oluşturur.
   - Oyuncuların katılmasını bekler.
   - Oyunu başlatır.

2. **Oyuncu**
   - Kayıt olmak zorunda değildir.
   - Oda kodu ve kullanıcı adı ile oyuna katılır.
   - Süre bitmeden cevap verir.
   - Doğru cevaplara göre puan kazanır.

Bu yapı sayesinde uygulama hem basit bir kullanıcı deneyimi sunar hem de gerçek zamanlı oyun mantığını destekler.

---

## Öne Çıkan Özellikler

- Kullanıcı kayıt sistemi
- Kullanıcı giriş sistemi
- JWT tabanlı kimlik doğrulama
- Şifrelerin bcrypt ile hashlenmesi
- Quiz oluşturma
- Quizleri PostgreSQL veritabanına kaydetme
- Kayıtlı quizleri listeleme
- Kayıtlı quizlerden tekrar oda açabilme
- Oda kodu ile oyuna katılma
- Kayıt olmadan oyuncu olarak oyuna girme
- Host ve oyuncu rollerinin ayrılması
- Host’un soru çözememesi
- Gerçek zamanlı oyuncu listesi
- Socket.io ile canlı oyun akışı
- Süreli sorular
- Süreye göre puanlama
- Otomatik sonraki soruya geçiş
- Oyun sonunda skor tablosu
- Docker ile veritabanı, backend ve frontend çalıştırma desteği
- Modern ve oyunsal arayüz tasarımı

---

## Ekran Görüntüleri


### Ana Sayfa

<img width="1600" height="898" alt="image" src="https://github.com/user-attachments/assets/c58f4286-8a99-40a0-903a-aec86497928f" />


Ana sayfada kullanıcı oyuna katılabilir, giriş yapabilir veya kayıt olabilir. Giriş yapan kullanıcı quiz oluşturabilir ve kayıtlı quizlerine ulaşabilir.

---

### Kayıt Ol Sayfası

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/467fab61-2310-4498-9b7b-1d2892ae09d8" />


Kullanıcılar kullanıcı adı, email ve şifre bilgileriyle kayıt olabilir. Kayıt sırasında şifre hashlenerek veritabanına kaydedilir.

---

### Giriş Yap Sayfası

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/a436f691-c317-4ab4-a923-c0f687b68e9e" />


Kayıtlı kullanıcılar email ve şifre ile giriş yapabilir. Giriş başarılı olduğunda JWT token localStorage içerisine kaydedilir.

---

### Quiz Oluşturma Sayfası

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/176132fe-9f2a-4bd4-861c-2cec5a912072" />


Host, quiz başlığı belirler, soru süresi seçer ve sorularını oluşturur. Her soru için 4 seçenek ve doğru cevap belirlenir.

---

### Bekleme Odası

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/86827aac-d7ea-448b-8191-5bc1a8032057" />


Quiz oluşturulduktan sonra host için bir oda kodu oluşturulur. Oyuncular bu kodla oyuna katılır. Host oyuncuların gelmesini bekleyebilir ve oyun hazır olduğunda başlatabilir.

---

### Oyuna Katılma Sayfası

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/80f06e44-a934-4efb-94b6-e57386f26bda" />


Oyuncular kayıt olmadan oda kodu ve kullanıcı adı girerek oyuna katılabilir.

---

### Oyun Ekranı

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/511399f4-a065-429d-9abd-2379ea48ad24" />


Sorular süreli olarak ekrana gelir. Oyuncular seçeneklerden birini seçip cevap gönderir. Host soru çözmez, sadece oyunu izler ve yönetir.

---

### Skor Tablosu

<img width="794" height="446" alt="image" src="https://github.com/user-attachments/assets/c338302f-454d-487c-90d1-8d5e0d22d17d" />


Oyun sonunda oyuncuların skorları sıralı şekilde gösterilir.

---

### Quizlerim Sayfası

<img width="795" height="434" alt="image" src="https://github.com/user-attachments/assets/05a04466-023e-4fac-9ab8-8c7728d75456" />


Giriş yapan kullanıcı daha önce oluşturduğu quizleri görebilir ve kayıtlı quizlerden yeni oyun odası açabilir.

---

## Kullanılan Teknolojiler

### Frontend

- React
- React Router DOM
- Socket.io Client
- CSS

### Backend

- Node.js
- Express.js
- Socket.io
- PostgreSQL
- pg
- bcryptjs
- jsonwebtoken
- dotenv
- cors

### DevOps / Ortam

- Docker
- Docker Compose
- PostgreSQL Docker Image

---

## Proje Yapısı

```txt
quizUpp/
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .env
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── pages/
│           ├── Home.js
│           ├── Login.js
│           ├── Register.js
│           ├── Host.js
│           ├── Join.js
│           ├── Game.js
│           └── MyQuizzes.js
│
├── docker-compose.yml
└── README.md
