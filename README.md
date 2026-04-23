# QuizUpp

QuizUpp, kullanıcıların bir quiz oluşturabildiği, oda kodu ile katılım sağlayabildiği ve gerçek zamanlı çok oyunculu quiz deneyimi sunmayı amaçlayan web tabanlı bir uygulamadır.

## Proje Amacı
Bu proje, kullanıcıların kendi quizlerini oluşturabildiği ve diğer kullanıcıların belirli bir oda kodu ile bu quizlere katılabildiği bir canlı quiz platformu geliştirmek amacıyla yapılmıştır.

## Kullanılan Teknolojiler
- React
- Node.js
- Express.js
- PostgreSQL
- Docker
- CSS
- HTML
- JavaScript

## Mevcut Özellikler
- Frontend ve backend proje yapısının oluşturulması
- PostgreSQL veritabanısı bağlantısının kurulması
- Docker ile veritabanı servisinin ayağa kaldırılması
- Kullanıcı kayıt endpointinin oluşturulması
- Ana sayfa, katılım, quiz oluşturma, giriş ve kayıt ekranlarının hazırlanması

## Planlanan Özellikler
- Socket.io ile gerçek zamanlı oda yönetimi
- Host tarafından quiz başlatma
- Oyuncuların oda kodu ile katılması
- Soru-cevap akışı
- Leaderboard ekranı
- Oyun sonu skor sıralaması

## Klasör Yapısı
```bash
quizUpp/
├── backend/
├── frontend/
├── docker-compose.yml
└── .gitignore
