require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "quizupp_secret";

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "roomapp",
  password: process.env.DB_PASSWORD || "6767",
  port: Number(process.env.DB_PORT) || 5432,
});

/*
  Oyun odaları hâlâ RAM'de.
  Ama artık quizler ve sorular PostgreSQL'e kaydediliyor.
*/
const rooms = new Map();

const readyQuizzes = [
  {
    id: "ready-genel-kultur",
    title: "🧠 Genel Kültür Şampiyonası",
    timerSeconds: 15,
    category: "Genel Kültür",
    description: "Tarihten bilime, sanattan genel yeteneğe uzanan 20 soruluk genel kültür yarışması!",
    questions: [
      { id: 1, questionText: "Fatih Sultan Mehmet'in İstanbul'u fethettiği yaş kaçtır?", options: ["18", "21", "25", "30"], correctOptionIndex: 1 },
      { id: 2, questionText: "Gezegenler arasında güneşe en yakın olan hangisidir?", options: ["Venüs", "Mars", "Merkür", "Jüpiter"], correctOptionIndex: 2 },
      { id: 3, questionText: "Türkiye Cumhuriyeti'nin ilk Başbakanı kimdir?", options: ["Mustafa Kemal Atatürk", "İsmet İnönü", "Fevzi Çakmak", "Celal Bayar"], correctOptionIndex: 1 },
      { id: 4, questionText: "Kendi tablosunu yaparken kulağını kesen ünlü ressam kimdir?", options: ["Vincent van Gogh", "Pablo Picasso", "Salvador Dali", "Leonardo da Vinci"], correctOptionIndex: 0 },
      { id: 5, questionText: "Dünyanın en derin noktası olan Mariana Çukuru hangi okyanustadır?", options: ["Hint Okyanusu", "Atlas Okyanusu", "Arktik Okyanusu", "Pasifik (Büyük Okyanus)"], correctOptionIndex: 3 },
      { id: 6, questionText: "Nobel ödülünü kazanan ilk Türk bilim insanı kimdir?", options: ["Orhan Pamuk", "Aziz Sancar", "Cahit Arf", "Oktay Sinanoğlu"], correctOptionIndex: 1 },
      { id: 7, questionText: "Suyun kimyasal formülü nedir?", options: ["CO2", "H2O", "NaCl", "O2"], correctOptionIndex: 1 },
      { id: 8, questionText: "Telefonu icat eden mucit kimdir?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Albert Einstein"], correctOptionIndex: 1 },
      { id: 9, questionText: "Cumhuriyetimiz kaç yılında kurulmuştur?", options: ["1920", "1921", "1922", "1923"], correctOptionIndex: 3 },
      { id: 10, questionText: "İstiklal Marşı'mızın şairi kimdir?", options: ["Mehmet Akif Ersoy", "Namık Kemal", "Ziya Gökalp", "Tevfik Fikret"], correctOptionIndex: 0 },
      { id: 11, questionText: "'Düşünen Adam' heykeli hangi ünlü heykeltıraşa aittir?", options: ["Michelangelo", "Auguste Rodin", "Donatello", "Leonardo da Vinci"], correctOptionIndex: 1 },
      { id: 12, questionText: "Mona Lisa tablosu hangi müzede sergilenmektedir?", options: ["Uffizi Müzesi", "Metropolitan Müzesi", "Louvre Müzesi", "Prado Müzesi"], correctOptionIndex: 2 },
      { id: 13, questionText: "En çok ülkeyle kara sınırı olan ülke hangisidir?", options: ["Rusya", "Çin", "Brezilya", "Kanada"], correctOptionIndex: 1 },
      { id: 14, questionText: "İlk Türkçe sözlük olan Divânu Lügati't-Türk kimin eseridir?", options: ["Kaşgarlı Mahmud", "Yusuf Has Hacib", "Edip Ahmet Yükneki", "Ali Şir Nevai"], correctOptionIndex: 0 },
      { id: 15, questionText: "Dünyanın yedi harikasından biri olan Keops Piramidi hangi ülkededir?", options: ["Yunanistan", "Irak", "İtalya", "Mısır"], correctOptionIndex: 3 },
      { id: 16, questionText: "'Sinekli Bakkal' romanının yazarı kimdir?", options: ["Reşat Nuri Güntekin", "Halide Edib Adıvar", "Yakub Kadri Karaosmanoğlu", "Peyami Safa"], correctOptionIndex: 1 },
      { id: 17, questionText: "Kuduz aşısını bulan bilim insanı kimdir?", options: ["Louis Pasteur", "Robert Koch", "Alexander Fleming", "Edward Jenner"], correctOptionIndex: 0 },
      { id: 18, questionText: "Kırmızı Gezegen olarak bilinen gezegen hangisidir?", options: ["Venüs", "Mars", "Merkür", "Satürn"], correctOptionIndex: 1 },
      { id: 19, questionText: "Osmanlı İmparatorluğu'nun kurucusu kimdir?", options: ["Ertuğrul Gazi", "Osman Bey", "Orhan Bey", "I. Murat"], correctOptionIndex: 1 },
      { id: 20, questionText: "Atmosferde en yüksek oranda bulunan gaz hangisidir?", options: ["Oksijen", "Karbondioksit", "Azot", "Helyum"], correctOptionIndex: 2 }
    ]
  },
  {
    id: "ready-tarih-cografya",
    title: "🌍 Tarih & Coğrafya Atlası",
    timerSeconds: 20,
    category: "Tarih & Coğrafya",
    description: "Kıtalar, nehirler, padişahlar ve devrimler! 20 soruluk tarih ve coğrafya turu.",
    questions: [
      { id: 1, questionText: "Cumhuriyet döneminin ilk nüfus sayımı hangi yılda yapılmıştır?", options: ["1923", "1925", "1927", "1930"], correctOptionIndex: 2 },
      { id: 2, questionText: "Türkiye'nin en uzun nehri hangisidir?", options: ["Fırat", "Dicle", "Kızılırmak", "Yeşilırmak"], correctOptionIndex: 2 },
      { id: 3, questionText: "İstanbul hangi yıl fethedilmiştir?", options: ["1071", "1299", "1453", "1517"], correctOptionIndex: 2 },
      { id: 4, questionText: "Dünyanın en uzun nehri hangisidir?", options: ["Amazon", "Nil", "Yangtze", "Mississippi"], correctOptionIndex: 1 },
      { id: 5, questionText: "Çanakkale Savaşı hangi yıl başlamıştır?", options: ["1912", "1914", "1915", "1918"], correctOptionIndex: 2 },
      { id: 6, questionText: "Türkiye'nin en büyük gölü hangisidir?", options: ["Tuz Gölü", "Beyşehir Gölü", "Van Gölü", "Eğirdir Gölü"], correctOptionIndex: 2 },
      { id: 7, questionText: "Ankara hangi yılda Türkiye'nin başkenti olmuştur?", options: ["1920", "1921", "1923", "1924"], correctOptionIndex: 2 },
      { id: 8, questionText: "Dünyanın en büyük adası hangisidir?", options: ["Madagaskar", "Grönland", "Borneo", "Yeni Gine"], correctOptionIndex: 1 },
      { id: 9, questionText: "Anadolu Selçuklu Devleti'nin kurucusu kimdir?", options: ["Kutalmışoğlu Süleyman Şah", "Melikşah", "Alparslan", "Kılıç Arslan"], correctOptionIndex: 0 },
      { id: 10, questionText: "Türkiye'nin en yüksek dağı hangisidir?", options: ["Erciyes Dağı", "Kaçkar Dağı", "Ağrı Dağı", "Süphan Dağı"], correctOptionIndex: 2 },
      { id: 11, questionText: "Mustafa Kemal Atatürk'ün nüfusa kayıtlı olduğu il hangisidir?", options: ["Selanik", "Gaziantep", "Ankara", "İstanbul"], correctOptionIndex: 1 },
      { id: 12, questionText: "Magna Carta hangi ülkede imzalanmıştır?", options: ["Fransa", "Almanya", "İngiltere", "İtalya"], correctOptionIndex: 2 },
      { id: 13, questionText: "Amerika Kıtası'nı keşfeden ama burayı Hindistan zanneden kaşif kimdir?", options: ["Vasco da Gama", "Kristof Kolomb", "Macellan", "Amerigo Vespucci"], correctOptionIndex: 1 },
      { id: 14, questionText: "Türkiye Cumhuriyeti'nin ikinci Cumhurbaşkanı kimdir?", options: ["Celal Bayar", "İsmet İnönü", "Adnan Menderes", "Fevzi Çakmak"], correctOptionIndex: 1 },
      { id: 15, questionText: "Tarihi İpek Yolu hangi ülkeden başlar?", options: ["Hindistan", "Çin", "İran", "Mısır"], correctOptionIndex: 1 },
      { id: 16, questionText: "Osmanlı'da ilk kağıt para hangi padişah döneminde basılmıştır?", options: ["II. Mahmud", "I. Abdülhamid", "Abdülmecid", "II. Abdülhamid"], correctOptionIndex: 2 },
      { id: 17, questionText: "Hangi ülke iki kıtada birden toprağa sahiptir?", options: ["Mısır", "Türkiye", "Rusya", "Türkiye ve Rusya"], correctOptionIndex: 3 },
      { id: 18, questionText: "Dünyanın en büyük sıcak çölü hangisidir?", options: ["Gobi Çölü", "Kalahari Çölü", "Sahra Çölü", "Atacama Çölü"], correctOptionIndex: 2 },
      { id: 19, questionText: "Malazgirt Meydan Muharebesi hangi yılda yapılmıştır?", options: ["1071", "1081", "1091", "1101"], correctOptionIndex: 0 },
      { id: 20, questionText: "Mısır Piramitleri hangi nehrin yakınlarında kuruludur?", options: ["Fırat", "Nil", "Ganj", "Kongo"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-spor-dunyasi",
    title: "⚽ Spor Dünyası Arenası",
    timerSeconds: 15,
    category: "Spor Dünyası",
    description: "Futboldan basketbola, rekorlardan olimpiyatlara spor dolu 20 soru!",
    questions: [
      { id: 1, questionText: "Olimpiyatlar kaç yılda bir düzenlenir?", options: ["2 yılda bir", "3 yılda bir", "4 yılda bir", "5 yılda bir"], correctOptionIndex: 2 },
      { id: 2, questionText: "Bir basketbol maçı kaç periyottan oluşur?", options: ["2", "3", "4", "5"], correctOptionIndex: 2 },
      { id: 3, questionText: "Hangisi Türkiye Süper Lig tarihinde en çok şampiyon olan takımdır?", options: ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"], correctOptionIndex: 1 },
      { id: 4, questionText: "Modern Olimpiyat Oyunları ilk kez hangi şehirde düzenlenmiştir?", options: ["Londra", "Paris", "Roma", "Atina"], correctOptionIndex: 3 },
      { id: 5, questionText: "Bir futbol maçında kalenin genişliği standart olarak kaç metredir?", options: ["7.15 metre", "7.32 metre", "7.50 metre", "7.65 metre"], correctOptionIndex: 1 },
      { id: 6, questionText: "NBA tarihinin en çok sayı atan oyuncusu kimdir?", options: ["Kareem Abdul-Jabbar", "LeBron James", "Michael Jordan", "Kobe Bryant"], correctOptionIndex: 1 },
      { id: 7, questionText: "Hangisi masa tenisinin diğer adıdır?", options: ["Badminton", "Kriket", "Ping Pong", "Squash"], correctOptionIndex: 2 },
      { id: 8, questionText: "'Cep Herkülü' lakaplı efsanevi milli haltercimiz kimdir?", options: ["Halil Mutlu", "Naim Süleymanoğlu", "Taner Sağır", "Naim Süleyman"], correctOptionIndex: 1 },
      { id: 9, questionText: "Teniste sezonun ilk Grand Slam turnuvası hangisidir?", options: ["Wimbledon", "Fransa Açık", "Avustralya Açık", "Amerika Açık"], correctOptionIndex: 2 },
      { id: 10, questionText: "Bir futbol topunun ağırlığı standart olarak kaç gram olmalıdır?", options: ["350-380 gram", "410-450 gram", "480-520 gram", "550-600 gram"], correctOptionIndex: 1 },
      { id: 11, questionText: "Atletizmde erkekler 100 metre dünya rekoru (9.58sn) kime aittir?", options: ["Carl Lewis", "Yohan Blake", "Usain Bolt", "Tyson Gay"], correctOptionIndex: 2 },
      { id: 12, questionText: "Bir hentbol takımı sahada kaç oyuncu ile mücadele eder?", options: ["5 oyuncu", "6 oyuncu", "7 oyuncu", "8 oyuncu"], correctOptionIndex: 2 },
      { id: 13, questionText: "Türkiye A Milli Futbol Takımı'nın Dünya Kupası'ndaki en büyük başarısı nedir?", options: ["Dünya İkinciliği", "Dünya Üçüncülüğü", "Çeyrek Final", "Son 16 Turu"], correctOptionIndex: 1 },
      { id: 14, questionText: "Yüzmede 'kelebek' stilinde yarışan bir sporcu hangi branştadır?", options: ["Su Topu", "Yüzme", "Senkronize Yüzme", "Dalış"], correctOptionIndex: 1 },
      { id: 15, questionText: "Hangi spor dalında 'strike' ve 'spare' terimleri kullanılır?", options: ["Golf", "Dart", "Bowling", "Bilardo"], correctOptionIndex: 2 },
      { id: 16, questionText: "Hangi Türk basketbol takımı EuroLeague şampiyonluğunu üst üste 2 kez kazanmıştır?", options: ["Fenerbahçe", "Anadolu Efes", "Galatasaray", "Beşiktaş"], correctOptionIndex: 1 },
      { id: 17, questionText: "FIFA Dünya Kupası'nı en çok kazanan ülke hangisidir?", options: ["Almanya", "İtalya", "Arjantin", "Brezilya"], correctOptionIndex: 3 },
      { id: 18, questionText: "Bir voleybol setinde galibiyete ulaşmak için en az kaç sayı alınmalıdır?", options: ["15 sayı", "20 sayı", "25 sayı", "30 sayı"], correctOptionIndex: 2 },
      { id: 19, questionText: "Wimbledon Tenis Turnuvası hangi kort zemininde oynanır?", options: ["Toprak", "Çim", "Sert", "Halı"], correctOptionIndex: 1 },
      { id: 20, questionText: "Formula 1 tarihinde en çok şampiyon olan pilotlar kimlerdir? (7 Şampiyonluk)", options: ["Senna & Prost", "Schumacher & Hamilton", "Vettel & Alonso", "Lauda & Stewart"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-yesilcam-sinema",
    title: "🎬 Yeşilçam & Sinema Kuşağı",
    timerSeconds: 20,
    category: "Yeşilçam & Sinema",
    description: "Kemal Sunal'dan Şener Şen'e, Türk sinemasının efsane yapıtları ve unutulmaz replikleri!",
    questions: [
      { id: 1, questionText: "Tosun Paşa filminde Şaban'ın canlandırdığı karakterin aslında kim olduğu iddia edilmektedir?", options: ["Tosun Paşa", "Daş Hasan", "Yeşil Vadi muhtarı", "Lütfü Bey"], correctOptionIndex: 0 },
      { id: 2, questionText: "Hababam Sınıfı film serisinde 'Kel Mahmut' karakterini hangi efsane aktör canlandırmıştır?", options: ["Münir Özkul", "Adile Naşit", "Şener Şen", "Kemal Sunal"], correctOptionIndex: 0 },
      { id: 3, questionText: "Selvi Boylum Al Yazmalım filminde Kadir İnanır'ın canlandırdığı karakterin adı nedir?", options: ["Cemşit", "İlyas", "Ali", "Ahmet"], correctOptionIndex: 1 },
      { id: 4, questionText: "Süt Kardeşler filmindeki korkunç yaratığın adı nedir?", options: ["Gulyabani", "Alkarısı", "Canavar", "Hortlak"], correctOptionIndex: 0 },
      { id: 5, questionText: "Çöpçüler Kralı filminde Şener Şen'in canlandırdığı zabıta karakterinin adı nedir?", options: ["Zabıta Şakir", "Zabıta Cabbar", "Zabıta Hurşit", "Zabıta Süleyman"], correctOptionIndex: 0 },
      { id: 6, questionText: "Kemal Sunal'ın 'Kapıcılar Kralı' filminde canlandırdığı ünlü kapıcının adı nedir?", options: ["Şaban", "Seyit", "Feyzo", "Rıfkı"], correctOptionIndex: 1 },
      { id: 7, questionText: "Hababam Sınıfı'nda 'İnek Şaban' rolüyle devleşen efsanevi oyuncumuz kimdir?", options: ["Tarık Akan", "Kemal Sunal", "Halit Akçatepe", "Zeki Alasya"], correctOptionIndex: 1 },
      { id: 8, questionText: "Neşeli Günler filminde Şener Şen ve Adile Naşit'in sattığı ve kavga ettikleri yiyecek/içecek nedir?", options: ["Limonata", "Turşu", "Boza", "Şalgam"], correctOptionIndex: 1 },
      { id: 9, questionText: "Türk Sineması'nın 'Sultan' lakaplı efsane kadın oyuncusu kimdir?", options: ["Filiz Akın", "Hülya Koçyiğit", "Müjde Ar", "Türkan Şoray"], correctOptionIndex: 3 },
      { id: 10, questionText: "Mavi Boncuk filminde Münir Özkul ve arkadaşlarının kaçırdığı ünlü şarkıcı kimdir?", options: ["Emel Sayın", "Zeki Müren", "Bülent Ersoy", "Gönül Yazar"], correctOptionIndex: 0 },
      { id: 11, questionText: "Hababam Sınıfı'nda 'Güdük Necmi' lakaplı karakteri canlandıran oyuncumuz kimdir?", options: ["Kemal Sunal", "Halit Akçatepe", "Tarık Akan", "Münir Özkul"], correctOptionIndex: 1 },
      { id: 12, questionText: "Kibar Feyzo filminde Feyzo'nun köyden kovulmasına sebep olan ünlü replik hangisidir?", options: ["Ağam bizimle eğleniyi", "Şiki şiki baba", "Atma Şakir din kardeşiyiz", "Benim adım kerim"], correctOptionIndex: 0 },
      { id: 13, questionText: "Neşeli Günler filminde Şener Şen'in canlandırdığı, sürekli abartılı hikayeler anlatan karakter kimdir?", options: ["Ziya", "Şakir", "Vecihi", "Badi Ekrem"], correctOptionIndex: 0 },
      { id: 14, questionText: "Güle Güle ve Babam ve Oğlum filmlerinin yönetmeni olan ünlü yönetmenimiz kimdir?", options: ["Çağan Irmak", "Nuri Bilge Ceylan", "Yılmaz Erdoğan", "Fatih Akın"], correctOptionIndex: 0 },
      { id: 15, questionText: "Hababam Sınıfı'nın beden eğitimi öğretmeni olan Badi Ekrem'i kim canlandırmıştır?", options: ["Şener Şen", "Kemal Sunal", "Münir Özkul", "Halit Akçatepe"], correctOptionIndex: 0 },
      { id: 16, questionText: "Çiçek Abbas filminde Abbas'ın aşkı için yarıştığı kötü minibüsçü kimdir?", options: ["Şakir (Şener Şen)", "Cabbar (Kemal Sunal)", "Ziya", "Seyit"], correctOptionIndex: 0 },
      { id: 17, questionText: "Gönül Yarası filminde başrolü Şener Şen ile paylaşan, Meltem Cumbul'un canlandırdığı karakterin adı nedir?", options: ["Dünya", "Güneş", "Yağmur", "Yıldız"], correctOptionIndex: 0 },
      { id: 18, questionText: "Selvi Boylum Al Yazmalım romanı hangi dünyaca ünlü Kırgız yazara aittir?", options: ["Cengiz Aytmatov", "Bahtiyar Vahapzade", "Ömer Seyfettin", "Reşat Nuri"], correctOptionIndex: 0 },
      { id: 19, questionText: "Hababam Sınıfı'nın meşhur okulu 'Özel Çamlıca Lisesi' gerçekte hangi saray veya kasırda çekilmiştir?", options: ["Adile Sultan Kasrı", "Yıldız Sarayı", "Beylerbeyi Sarayı", "Ihlamur Kasrı"], correctOptionIndex: 0 },
      { id: 20, questionText: "Gözleri görmeyen bir çiçeğin ve bir gencin hikayesini anlatan, 'Bizim Aile' filminde de geçen efsane melodinin bestecisi kimdir?", options: ["Melih Kibar", "Cahit Berkay", "Atilla Özdemiroğlu", "Esin Engin"], correctOptionIndex: 0 }
    ]
  },
  {
    id: "ready-bilim-teknoloji",
    title: "🔬 Bilim & Teknoloji Serüveni",
    timerSeconds: 15,
    category: "Bilim & Teknoloji",
    description: "Uzaydan internete, tarihin gidişatını değiştiren bilimsel buluşlar ve teknolojik yenilikler!",
    questions: [
      { id: 1, questionText: "İnternet sitelerinin adreslerinin başında yer alan 'www' neyin kısaltmasıdır?", options: ["World Wide Web", "World Wide Word", "Wide Web World", "Web Wide World"], correctOptionIndex: 0 },
      { id: 2, questionText: "Suyun kaldırma kuvvetini bularak hamamdan 'Eureka!' (Buldum!) diyerek kaçtığı söylenen antik çağ bilgini kimdir?", options: ["Arşimet", "Öklid", "Pisagor", "Sokrates"], correctOptionIndex: 0 },
      { id: 3, questionText: "Kızıl Gezegen olarak bilinen Mars'ta su ve yaşam belirtileri arayan NASA robotunun adı nedir?", options: ["Curiosity (Merak)", "Sputnik", "Voyager", "Apollo"], correctOptionIndex: 0 },
      { id: 4, questionText: "Elektrik akım şiddetinin birimi aşağıdakilerden hangisidir?", options: ["Amper", "Volt", "Watt", "Ohm"], correctOptionIndex: 0 },
      { id: 5, questionText: "İlk kişisel bilgisayarlarda kullanılan ve Microsoft'un Windows öncesi işletim sistemi olan yazılım hangisidir?", options: ["MS-DOS", "Linux", "Mac OS", "Unix"], correctOptionIndex: 0 },
      { id: 6, questionText: "Görelilik Teorisini (İzafiyet Teorisi) ortaya koyan dünyaca ünlü fizikçi kimdir?", options: ["Albert Einstein", "Isaac Newton", "Stephen Hawking", "Nikola Tesla"], correctOptionIndex: 0 },
      { id: 7, questionText: "İnsan vücudundaki kalıtsal bilgileri taşıyan ve sarmal yapıda olan molekül hangisidir?", options: ["DNA", "RNA", "Protein", "Kromozom"], correctOptionIndex: 0 },
      { id: 8, questionText: "Kendi adıyla anılan periyodik tabloyu oluşturan Rus kimyager kimdir?", options: ["Dmitri Mendeleyev", "Marie Curie", "Antoine Lavoisier", "Alfred Nobel"], correctOptionIndex: 0 },
      { id: 9, questionText: "Dünyanın ilk yapay uydusu aşağıdakilerden hangisidir?", options: ["Sputnik 1", "Explorer 1", "Vostok 1", "Apollo 11"], correctOptionIndex: 0 },
      { id: 10, questionText: "Yerçekimi kanununu kafasına elma düşmesi hikayesiyle tanıdığımız ünlü bilim insanı kimdir?", options: ["Isaac Newton", "Galileo Galilei", "Johannes Kepler", "René Descartes"], correctOptionIndex: 0 },
      { id: 11, questionText: "Dünya'nın çevresini dolaşan ilk insan yapımı uzay istasyonu hangisidir?", options: ["Salyut 1", "Mir", "Skylab", "ISS (Uluslararası Uzay İstasyonu)"], correctOptionIndex: 3 },
      { id: 12, questionText: "Kuduz aşısını bularak tıp dünyasında devrim yaratan Fransız mikrobiyolog kimdir?", options: ["Louis Pasteur", "Alexander Fleming", "Robert Koch", "Edward Jenner"], correctOptionIndex: 0 },
      { id: 13, questionText: "Radyoaktivite üzerine yaptığı çalışmalarla iki farklı alanda Nobel ödülü alan bilim kadını kimdir?", options: ["Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Lise Meitner"], correctOptionIndex: 0 },
      { id: 14, questionText: "Bilgisayar biliminin kurucusu kabul edilen ve İkinci Dünya Savaşı'nda Enigma şifresini kıran İngiliz matematikçi kimdir?", options: ["Alan Turing", "Charles Babbage", "John von Neumann", "Ada Lovelace"], correctOptionIndex: 0 },
      { id: 15, questionText: "Güneş sistemindeki en büyük gezegen hangisidir?", options: ["Jüpiter", "Satürn", "Neptün", "Uranüs"], correctOptionIndex: 0 },
      { id: 16, questionText: "Dünyanın en popüler video paylaşım platformu olan YouTube hangi yıl kurulmuştur?", options: ["2003", "2005", "2007", "2009"], correctOptionIndex: 1 },
      { id: 17, questionText: "Bluetooth teknolojisi adını hangi tarihi figürden almıştır?", options: ["Bir Viking Kralı", "Bir Roma İmparatoru", "Bir İngiliz Kralı", "Bir Yunan Hakimi"], correctOptionIndex: 0 },
      { id: 18, questionText: "Yapay zekanın babası sayılan ve 'Makineler düşünebilir mi?' sorusunu sorarak Turing Testi'ni geliştiren bilim insanı kimdir?", options: ["Alan Turing", "Marvin Minsky", "John McCarthy", "Elon Musk"], correctOptionIndex: 0 },
      { id: 19, questionText: "İlk kez penisilini keşfederek milyonlarca insanların hayatını kurtaran İskoç bilim insanı kimdir?", options: ["Alexander Fleming", "Louis Pasteur", "Robert Koch", "Joseph Lister"], correctOptionIndex: 0 },
      { id: 20, questionText: "Gök cisimlerini gözlemlemek için teleskobu ilk kez gökyüzüne çeviren İtalyan astronom kimdir?", options: ["Galileo Galilei", "Nicolaus Copernicus", "Johannes Kepler", "Giordano Bruno"], correctOptionIndex: 0 }
    ]
  },
  {
    id: "ready-matematik-mantik",
    title: "🔢 Matematik & Mantık Arenası",
    timerSeconds: 20,
    category: "Matematik & Mantık",
    description: "Zeka sınırlarını zorlayan eğlenceli matematik problemleri ve pratik mantık bulmacaları!",
    questions: [
      { id: 1, questionText: "Bir üçgenin iç açılarının toplamı kaç derecedir?", options: ["180", "90", "270", "360"], correctOptionIndex: 0 },
      { id: 2, questionText: "En küçük asal sayı aşağıdakilerden hangisidir?", options: ["1", "2", "3", "5"], correctOptionIndex: 1 },
      { id: 3, questionText: "Roma rakamlarında 'X' hangi sayıyı temsil eder?", options: ["5", "10", "50", "100"], correctOptionIndex: 1 },
      { id: 4, questionText: "Bir dairenin çevresini çapına böldüğümüzde elde ettiğimiz sabit sayı hangisidir?", options: ["Pi Sayısı", "Altın Oran", "Euler Sayısı", "Planck Sabiti"], correctOptionIndex: 0 },
      { id: 5, questionText: "Bir düzine kalem ile bir deste kalemin toplam sayısı kaçtır?", options: ["20", "22", "24", "26"], correctOptionIndex: 1 },
      { id: 6, questionText: "Bir sayının 0'a bölümü matematikte ne olarak ifade edilir?", options: ["0", "Tanımsız", "Sonsuz", "1"], correctOptionIndex: 1 },
      { id: 7, questionText: "Kendi kendisiyle çarpıldığında 144 eden pozitif sayı kaçtır?", options: ["11", "12", "13", "14"], correctOptionIndex: 1 },
      { id: 8, questionText: "Aşağıdaki sayılardan hangisi bir tam kare sayı değildir?", options: ["16", "25", "32", "36"], correctOptionIndex: 2 },
      { id: 9, questionText: "Bir kenarı 5 cm olan karenin çevresi kaç cm'dir?", options: ["15", "20", "25", "30"], correctOptionIndex: 1 },
      { id: 10, questionText: "Bir gün kaç saniyedir?", options: ["3600", "43200", "86400", "100000"], correctOptionIndex: 2 },
      { id: 11, questionText: "Sıfır (0) sayısını ilk kez matematiksel bir değer olarak kullanan ve sıfırı bulan ünlü İslam matematikçisi kimdir?", options: ["Harezmi", "Ömer Hayyam", "Biruni", "İbn-i Sina"], correctOptionIndex: 0 },
      { id: 12, questionText: "Bir dik üçgende hipotenüsün karesi, diğer iki kenarın karelerinin toplamına eşittir. Bu ünlü teorem hangisidir?", options: ["Pisagor Teoremi", "Öklid Teoremi", "Thales Teoremi", "Fermat Teoremi"], correctOptionIndex: 0 },
      { id: 13, questionText: "Doğada ve sanatta mükemmel uyumu simgeleyen, yaklaşık değeri 1.618 olan sayı veya oran nedir?", options: ["Altın Oran", "Pi Sayısı", "Euler Sabiti", "Gümüş Oran"], correctOptionIndex: 0 },
      { id: 14, questionText: "Sadece 1'e ve kendisine bölünebilen, 1'den büyük doğal sayılara ne ad verilir?", options: ["Çift Sayı", "Asal Sayı", "Tek Sayı", "Tam Sayı"], correctOptionIndex: 1 },
      { id: 15, questionText: "Bir sayının üssü sıfıra (x^0) eşit olduğunda (x sıfırdan farklı ise) sonuç her zaman kaçtır?", options: ["0", "1", "x", "Sonsuz"], correctOptionIndex: 1 },
      { id: 16, questionText: "Matematikte '!' sembolüyle gösterilen ve bir sayının kendinden önceki tüm pozitif tamsayılarla çarpımını ifade eden kavram nedir?", options: ["Logaritma", "Faktöriyel", "Karekök", "Mutlak Değer"], correctOptionIndex: 1 },
      { id: 17, questionText: "Bir saatte 60 km hızla giden bir araç, 15 dakikada kaç km yol alır?", options: ["10", "15", "20", "25"], correctOptionIndex: 1 },
      { id: 18, questionText: "2, 4, 8, 16, ? sayı dizisinde soru işaretli yere hangi sayı gelmelidir?", options: ["24", "32", "40", "48"], correctOptionIndex: 1 },
      { id: 19, questionText: "Bir çiftçinin 17 koyunu vardı. Bir salgın hastalık sonucu 9'u hariç hepsi öldü. Çiftçinin kaç canlı koyunu kalmıştır?", options: ["8", "9", "17", "0"], correctOptionIndex: 1 },
      { id: 20, questionText: "Bir anne ile kızının yaşları toplamı 40'tır. 5 yıl sonra yaşları toplamı kaç olur?", options: ["45", "50", "55", "60"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-gastronomi",
    title: "🍳 Gastronomi & Mutfak Sanatları",
    timerSeconds: 15,
    category: "Gastronomi",
    description: "Dünya mutfağından Türk lezzetlerine, baharatlardan ünlü yemeklerin hikayelerine uzanan leziz 20 soru!",
    questions: [
      { id: 1, questionText: "Gaziantep mutfağının dünyaca ünlü, tescilli şerbetli tatlısı hangisidir?", options: ["Künefe", "Baklava", "Kadayıf", "Tulumba"], correctOptionIndex: 1 },
      { id: 2, questionText: "İtalyan mutfağına özgü, kahve ve mascarpone peyniriyle yapılan ünlü tatlı hangisidir?", options: ["Tiramisu", "Panna Cotta", "Macaron", "Profiterol"], correctOptionIndex: 0 },
      { id: 3, questionText: "Sushi yapımında pirincin sarıldığı kurutulmuş deniz yosununa ne ad verilir?", options: ["Sake", "Nori", "Wasabi", "Gari"], correctOptionIndex: 1 },
      { id: 4, questionText: "Dünyanın en pahalı baharatı olarak bilinen, mor çiçekli bitkiden elde edilen malzeme hangisidir?", options: ["Zencefil", "Kakule", "Safran", "Karanfil"], correctOptionIndex: 2 },
      { id: 5, questionText: "Çikolatanın ana maddesi olan çekirdekler hangi ağaçtan elde edilir?", options: ["Kakao", "Kahve", "Hindistan Cevizi", "Kauçuk"], correctOptionIndex: 0 },
      { id: 6, questionText: "Türk mutfağında geleneksel olarak düğünlerde ikram edilen, kuzu etli ve terbiyeli çorba hangisidir?", options: ["Tarhana Çorbası", "Mercimek Çorbası", "Düğün Çorbası", "Ezogelin Çorbası"], correctOptionIndex: 2 },
      { id: 7, questionText: "Fransız mutfağına özgü, hilal şeklinde olan ünlü tereyağlı çörek hangisidir?", options: ["Kruvasan", "Baget", "Macaron", "Brioche"], correctOptionIndex: 0 },
      { id: 8, questionText: "Meksika mutfağına özgü, avokado ezmesi, limon suyu ve tuzla yapılan ünlü sos hangisidir?", options: ["Salsa", "Guacamole", "Cheddar", "Taco Sos"], correctOptionIndex: 1 },
      { id: 9, questionText: "Türk mutfağında 'Hünkar Beğendi' yemeğinin alt katmanındaki püre hangi sebzeden yapılır?", options: ["Kabak", "Patates", "Kereviz", "Patlıcan"], correctOptionIndex: 3 },
      { id: 10, questionText: "Geleneksel olarak keçi sütü ve salep içeren, dünyaca ünlü dondurmamız hangi şehrimize aittir?", options: ["Adana", "Kahramanmaraş", "İzmir", "Gaziantep"], correctOptionIndex: 1 },
      { id: 11, questionText: "Uzak Doğu mutfağında yemek yemek için kullanılan geleneksel çubuklara ne ad verilir?", options: ["Spork", "Chopstick", "Tongs", "Skewer"], correctOptionIndex: 1 },
      { id: 12, questionText: "Kadayıf ve özel tuzsuz peynirle sıcak olarak pişirilip servis edilen Hatay lezzeti hangisidir?", options: ["Künefe", "Revani", "Baklava", "Kazandibi"], correctOptionIndex: 0 },
      { id: 13, questionText: "İtalyan mutfağında pesto sosunun o meşhur yeşil rengini veren ana taze malzeme hangisidir?", options: ["Nane", "Fesleğen", "Maydanoz", "Dereotu"], correctOptionIndex: 1 },
      { id: 14, questionText: "Türk mutfağının vazgeçilmezi olan zeytinyağlı yaprak sarmasında hangi ağacın yaprağı kullanılır?", options: ["İncir", "Çınar", "Dut", "Asma"], correctOptionIndex: 3 },
      { id: 15, questionText: "Kahve çekirdeğinin dünyada ilk kez keşfedildiği yer olarak bilinen Doğu Afrika ülkesi hangisidir?", options: ["Kenya", "Mısır", "Etiyopya", "Madagaskar"], correctOptionIndex: 2 },
      { id: 16, questionText: "Hangi sebze 'İmam Bayıldı' ve 'Karnıyarık' yemeklerinin başrolündedir?", options: ["Kabak", "Patlıcan", "Biber", "Domates"], correctOptionIndex: 1 },
      { id: 17, questionText: "İspanyol mutfağının pirinç, safran, sebze ve deniz ürünleriyle yapılan ünlü tencere yemeği hangisidir?", options: ["Taco", "Risotto", "Paella", "Ramen"], correctOptionIndex: 2 },
      { id: 18, questionText: "Ege bölgesine özgü, zeytinyağlı yemeklerde de sıkça kullanılan mor yapraklı yabani ot türü hangisidir?", options: ["Isırgan Otu", "Semizotu", "Şevketi Bostan", "Arapsaçı"], correctOptionIndex: 2 },
      { id: 19, questionText: "Türk kahvesi pişirilirken kahvenin köpüklü ve lezzetli olması için kullanılan geleneksel kap hangisidir?", options: ["Cezve", "Çaydanlık", "Kettle", "Güveç"], correctOptionIndex: 0 },
      { id: 20, questionText: "Hangi çay türü, siyah çaya göre fermente edilmeden kurutulan ve yüksek antioksidan içeren çaydır?", options: ["Siyah Çay", "Yeşil Çay", "Oolong Çayı", "Bitki Çayı"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-turk-soz-deyis",
    title: "🗣️ Türk Söz ve Deyişleri",
    timerSeconds: 15,
    category: "Söz & Deyişler",
    description: "Kültürümüzün aynası olan atasözleri, deyimler ve meşhur deyişler üzerine 20 eğlenceli soru!",
    questions: [
      { id: 1, questionText: "'İşleyen demir pas tutmaz' atasözü aşağıdakilerden en çok hangisini vurgulamaktadır?", options: ["Temizliği", "Sürekliliği", "Çalışkanlığı", "Tasarrufu"], correctOptionIndex: 2 },
      { id: 2, questionText: "Bir işin en ince ayrıntılarına kadar titizlikle incelenmesini anlatan deyim hangisidir?", options: ["Kılı kırk yarmak", "Göze girmek", "İnce eleyip sık dokumak", "Kılı kırk yarmak & İnce eleyip sık dokumak"], correctOptionIndex: 3 },
      { id: 3, questionText: "'Ayağını yorganına göre uzat' atasözü genel olarak hangi konuda bir öğüt verir?", options: ["Sağlık", "Dostluk", "Ekonomi ve Bütçe", "Uykunun önemi"], correctOptionIndex: 2 },
      { id: 4, questionText: "Kararsız kalınan veya çözümü bir türlü netleşmeyen durumlar için hangi deyim kullanılır?", options: ["Ayaklar altına almak", "Muallakta kalmak", "Suya yazmak", "Göze gelmek"], correctOptionIndex: 1 },
      { id: 5, questionText: "Çok sevinmek, aşırı keyiflenmek veya heyecanlanmak anlamına gelen deyim hangisidir?", options: ["Etekleri tutuşmak", "Etekleri zil çalmak", "Kulak kabartmak", "Gözü yükseklerde olmak"], correctOptionIndex: 1 },
      { id: 6, questionText: "'Damlaya damlaya göl olur' atasözü hangi güzel alışkanlığı teşvik etmektedir?", options: ["Yardımlaşmayı", "Tutumlu olmayı ve tasarrufu", "Sabretmeyi", "Temizliği"], correctOptionIndex: 1 },
      { id: 7, questionText: "Hak etmeyen birine gereğinden fazla sevgi, ilgi ve tolerans gösterilmesini anlatan deyim hangisidir?", options: ["Yüz vermek", "Göz yummak", "Eld üstünde tutmak", "Gönül almak"], correctOptionIndex: 0 },
      { id: 8, questionText: "Beklenmedik şaşırtıcı bir olay karşısında konuşamaz hale gelmeyi anlatan deyim hangisidir?", options: ["Ağzı açık kalmak", "Nutku tutulmak", "Dili tutulmak", "Nutku tutulmak & Dili tutulmak"], correctOptionIndex: 3 },
      { id: 9, questionText: "'Gülme komşuna, gelir başına' atasözü insana hangi davranışı hatırlatır?", options: ["Paylaşımcı olmayı", "Başkalarının dertleriyle alay etmemeyi", "Komşuluk ilişkilerini", "Cömertliği"], correctOptionIndex: 1 },
      { id: 10, questionText: "Bir kimsenin gizli ayıplarını, sırlarını veya hilelerini herkese duyurmayı anlatan deyim hangisidir?", options: ["İpliğini pazara çıkarmak", "Maskesini düşürmek", "Defterini dürmek", "Açığa vurmak"], correctOptionIndex: 0 },
      { id: 11, questionText: "Sabırlı olmanın eninde sonunda insanı muradına ulaştıracağını belirten atasözü hangisidir?", options: ["Damlaya damlaya göl olur", "Sabreden derviş muradına ermiş", "Sakla samanı gelir zamanı", "Öfkeyle kalkan zararla oturur"], correctOptionIndex: 1 },
      { id: 12, questionText: "'Ağaç yaşken eğilir' atasözü eğitimin en çok hangi yönünü vurgular?", options: ["Ömür boyu sürmesini", "Çocuk yaşta verilmesinin önemini", "Zorluğunu", "Eğlenceli olmasını"], correctOptionIndex: 1 },
      { id: 13, questionText: "Çok öfkelenmek, sinirlenmek ve sabrı tükenmek anlamına gelen deyim hangisidir?", options: ["Tepesi atmak", "Küpüne zarar vermek", "Etekleri tutuşmak", "Kulak ardı etmek"], correctOptionIndex: 0 },
      { id: 14, questionText: "Alınan önemli bir dersi veya nasihati hiç unutmamak amacıyla kullanılan deyim hangisidir?", options: ["Göz kulak olmak", "Kulağına küpe olmak", "Aklına koymak", "Göze batmak"], correctOptionIndex: 1 },
      { id: 15, questionText: "Bir konuda kesin ve geri dönüşü olmayan bir karar vermeyi ifade eden deyim hangisidir?", options: ["Gemileri yakmak", "Köprüleri kurmak", "Baltayı taşa vurmak", "Defteri kapatmak"], correctOptionIndex: 0 },
      { id: 16, questionText: "'Üzüm üzüme baka baka kararır' atasözü neyi ifade eder?", options: ["Meyvelerin olgunlaşmasını", "İnsanların birbirinden etkilendiğini", "Zamanın hızlı geçtiğini", "Çalışmanın gerekliliğini"], correctOptionIndex: 1 },
      { id: 17, questionText: "Kendini çok önemli, bulunmaz veya eşsiz sanan kimseler için alaycı şekilde kullanılan deyim hangisidir?", options: ["Hint kumaşı", "Fildişi kule", "Altın yumurtlayan tavuk", "Göz bebeği"], correctOptionIndex: 0 },
      { id: 18, questionText: "Çok konuşarak karşısındakini fazlasıyla yoran veya kafa şişiren kişiler için hangi deyim kullanılır?", options: ["Çene yormak", "Baş ütülemek", "Dil dökmek", "Dil dökmek & Baş ütülemek"], correctOptionIndex: 1 },
      { id: 19, questionText: "'Komşu komşunun külüne muhtaçtır' atasözü neyin önemini vurgulamaktadır?", options: ["Dayanışma ve yardımlaşmanın", "Tasarruflu yaşamanın", "Güven duymanın", "Çok çalışmanın"], correctOptionIndex: 0 },
      { id: 20, questionText: "Kişinin bir işten tamamen elini çekmesi, o işi artık yapmaması anlamına gelen deyim hangisidir?", options: ["Elinin tersiyle itmek", "Elini eteğini çekmek", "Kolları sıvamak", "Gözden düşmek"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-bosluk-tamamlama",
    title: "✍️ Boşluk Tamamlama Bilmeceleri",
    timerSeconds: 15,
    category: "Boşluk Doldurma",
    description: "Atasözleri, deyimler ve ünlü sözlerdeki eksik kelimeleri tamamlayacağınız harika 20 soru!",
    questions: [
      { id: 1, questionText: "'Sakla samanı, gelir ______.' atasözündeki boşluğa hangi kelime gelmelidir?", options: ["harmanı", "zamanı", "yaz günü", "kış günü"], correctOptionIndex: 1 },
      { id: 2, questionText: "'Bana arkadaşını söyle, sana ______ kim olduğunu söyleyeyim.' sözündeki boşluğu doldurun.", options: ["senin", "onun", "benim", "dostunun"], correctOptionIndex: 0 },
      { id: 3, questionText: "'Gülü seven ______ katlanır.' atasözündeki boşluğa ne gelmelidir?", options: ["kokusuna", "solmasına", "yaprağına", "dikenine"], correctOptionIndex: 3 },
      { id: 4, questionText: "'Gözden ırak olan, ______ de ırak olur.' atasözündeki eksik kelime hangisidir?", options: ["gönülden", "akıldan", "yürekten", "can yakından"], correctOptionIndex: 0 },
      { id: 5, questionText: "Mustafa Kemal Atatürk'ün ünlü 'Yurtta sulh, ______ sulh.' sözündeki boşluğu doldurun.", options: ["ulusunda", "cihanda", "dostlukta", "tarihte"], correctOptionIndex: 1 },
      { id: 6, questionText: "'Ne ekersen, onu ______.' atasözündeki boşluğa hangisi gelmelidir?", options: ["sulersin", "biçersin", "toplarsın", "satarsın"], correctOptionIndex: 1 },
      { id: 7, questionText: "'Dost acı söyler ama ______ söyler.' sözündeki boşluğu tamamlayın.", options: ["doğru", "tatlı", "gizli", "her zaman"], correctOptionIndex: 0 },
      { id: 8, questionText: "'Öfkeyle kalkan, ______ oturur.' atasözündeki eksik kısım hangisidir?", options: ["hırsla", "zararla", "pişmanlıkla", "sessizce"], correctOptionIndex: 1 },
      { id: 9, questionText: "'Bir elin nesi var, iki elin ______ var.' atasözünü tamamlayın.", options: ["gücü", "sesi", "alkışı", "dostluğu"], correctOptionIndex: 1 },
      { id: 10, questionText: "Necip Fazıl'ın 'Devler gibi eserler bırakmak için, ______ gibi çalışmak gerekir.' sözündeki boşluk nedir?", options: ["aralar", "karıncalar", "işçiler", "köleler"], correctOptionIndex: 1 },
      { id: 11, questionText: "'Sütten ağzı yanan, ______ üfleyerek yer.' atasözündeki boşluğu doldurun.", options: ["yoğurdu", "ayranı", "sütü", "çorbayı"], correctOptionIndex: 0 },
      { id: 12, questionText: "'Köprüyü geçene kadar ayıya ______ de.' atasözünü tamamlayın.", options: ["dayı", "paşa", "dostum", "ağam"], correctOptionIndex: 0 },
      { id: 13, questionText: "'Rüzgar eken, ______ biçer.' atasözündeki boşluğu doldurun.", options: ["yağmur", "fırtına", "kasırga", "dolu"], correctOptionIndex: 1 },
      { id: 14, questionText: "'Güneş girmeyen eve ______ girer.' atasözündeki boşluğu doldurun.", options: ["hastalık", "soğuk", "doktor", "fırtına"], correctOptionIndex: 2 },
      { id: 15, questionText: "'Keskin sirke ______ zarar.' atasözünü tamamlayın.", options: ["şişesine", "küpüne", "sağlığa", "tada"], correctOptionIndex: 1 },
      { id: 16, questionText: "'Tatlı dil yılanı ______ çıkarır.' atasözündeki boşluğa ne gelmelidir?", options: ["yuvadan", "deliğinden", "ağacından", "topraktan"], correctOptionIndex: 1 },
      { id: 17, questionText: "'Taşıma su ile ______ dönmez.' atasözündeki boşluk hangisidir?", options: ["değirmen", "çark", "gemi", "nehir"], correctOptionIndex: 0 },
      { id: 18, questionText: "'Doğru söyleyeni dokuz ______ kovarlar.' atasözündeki eksik kelime hangisidir?", options: ["şehirden", "köyden", "ülkeden", "evden"], correctOptionIndex: 1 },
      { id: 19, questionText: "'Denize düşen ______ sarılır.' atasözündeki boşluğu tamamlayın.", options: ["yılana", "kurtarıcıya", "yosuna", "sarmaşığa"], correctOptionIndex: 0 },
      { id: 20, questionText: "'İki karpuz bir ______ sığmaz.' atasözünü tamamlayın.", options: ["koltuğa", "ele", "torbaya", "kasaya"], correctOptionIndex: 0 }
    ]
  },
  {
    id: "ready-dort-islem",
    title: "⚡ Hızlı 4 İşlem Zekası",
    timerSeconds: 15,
    category: "4 İşlem",
    description: "Zamanla yarışarak yapacağınız, pratik işlem yeteneğinizi test eden 20 hızlı matematik sorusu!",
    questions: [
      { id: 1, questionText: "8 + 5 * 2 işleminin sonucu kaçtır?", options: ["26", "18", "21", "15"], correctOptionIndex: 1 },
      { id: 2, questionText: "(15 - 3) / 4 işleminin sonucu kaçtır?", options: ["3", "4", "5", "6"], correctOptionIndex: 0 },
      { id: 3, questionText: "6 * 7 - 12 işleminin sonucu kaçtır?", options: ["32", "28", "30", "42"], correctOptionIndex: 2 },
      { id: 4, questionText: "45 / 9 + 17 işleminin sonucu kaçtır?", options: ["22", "24", "26", "28"], correctOptionIndex: 0 },
      { id: 5, questionText: "12 * 3 - 6 işleminin sonucu kaçtır?", options: ["24", "30", "36", "42"], correctOptionIndex: 1 },
      { id: 6, questionText: "(8 * 4) - (12 / 3) işleminin sonucu kaçtır?", options: ["24", "26", "28", "30"], correctOptionIndex: 2 },
      { id: 7, questionText: "50 - 4 * 8 işleminin sonucu kaçtır?", options: ["18", "24", "16", "20"], correctOptionIndex: 0 },
      { id: 8, questionText: "24 / (6 - 2) işleminin sonucu kaçtır?", options: ["4", "6", "8", "12"], correctOptionIndex: 1 },
      { id: 9, questionText: "7 * 8 + 4 işleminin sonucu kaçtır?", options: ["56", "60", "64", "68"], correctOptionIndex: 1 },
      { id: 10, questionText: "(9 + 6) * 3 işleminin sonucu kaçtır?", options: ["35", "40", "45", "50"], correctOptionIndex: 2 },
      { id: 11, questionText: "80 / 10 * 5 işleminin sonucu kaçtır?", options: ["4", "16", "40", "20"], correctOptionIndex: 2 },
      { id: 12, questionText: "100 - 15 * 4 işleminin sonucu kaçtır?", options: ["40", "50", "60", "70"], correctOptionIndex: 0 },
      { id: 13, questionText: "(14 + 16) / 5 işleminin sonucu kaçtır?", options: ["4", "5", "6", "7"], correctOptionIndex: 2 },
      { id: 14, questionText: "3 * 3 * 3 - 7 işleminin sonucu kaçtır?", options: ["18", "20", "22", "24"], correctOptionIndex: 1 },
      { id: 15, questionText: "48 / 6 - 5 işleminin sonucu kaçtır?", options: ["2", "3", "4", "5"], correctOptionIndex: 1 },
      { id: 16, questionText: "18 + 24 - 12 işleminin sonucu kaçtır?", options: ["26", "28", "30", "32"], correctOptionIndex: 2 },
      { id: 17, questionText: "(5 * 5) + (5 / 5) işleminin sonucu kaçtır?", options: ["24", "25", "26", "27"], correctOptionIndex: 2 },
      { id: 18, questionText: "72 / 8 - 4 işleminin sonucu kaçtır?", options: ["3", "4", "5", "6"], correctOptionIndex: 2 },
      { id: 19, questionText: "9 * 9 - 21 işleminin sonucu kaçtır?", options: ["50", "60", "70", "80"], correctOptionIndex: 1 },
      { id: 20, questionText: "(40 - 8) / 8 işleminin sonucu kaçtır?", options: ["2", "3", "4", "5"], correctOptionIndex: 2 }
    ]
  },
  {
    id: "ready-hayvanlar-dunyasi",
    title: "🦁 Hayvanlar Dünyası ve Doğa",
    timerSeconds: 15,
    category: "Hayvanlar",
    description: "Vahşi yaşamdan evcil dostlarımıza, doğanın en ilginç canlıları hakkında 20 şaşırtıcı soru!",
    questions: [
      { id: 1, questionText: "Karada yaşayan en hızlı koşan hayvan hangisidir?", options: ["Leopar", "Çita", "Antilop", "Tazı"], correctOptionIndex: 1 },
      { id: 2, questionText: "Dünyanın bilinen en büyük memeli hayvanı hangisidir?", options: ["Afrika Fili", "Mavi Balina", "Katil Balina", "Mamut"], correctOptionIndex: 1 },
      { id: 3, questionText: "Bukalemunların doğada hayatta kalmalarını sağlayan en belirgin özellikleri hangisidir?", options: ["Çok hızlı koşmaları", "Bulundukları ortama göre renk değiştirmeleri", "Çok uzağı görebilmeleri", "Zehir üretebilmeleri"], correctOptionIndex: 1 },
      { id: 4, questionText: "Genellikle sadece bambu filizleriyle beslenen, siyah-beyaz renkli sevimli ayı türü hangisidir?", options: ["Bozayı", "Panda", "Koala", "Kutup Ayısı"], correctOptionIndex: 1 },
      { id: 5, questionText: "Denizlerin en ilginç canlılarından olan ahtapotların toplam kaç adet kalbi vardır?", options: ["1", "2", "3", "4"], correctOptionIndex: 2 },
      { id: 6, questionText: "Aşağıdakilerden hangisi dünyadaki uçabilen tek memeli hayvandır?", options: ["Yarasa", "Sincap", "Kartal", "Uçan Balık"], correctOptionIndex: 0 },
      { id: 7, questionText: "Avustralya ile özdeşleşmiş olan kangurular yavrularını nerede taşırlar?", options: ["Sırtlarında", "Ağızlarında", "Keselerinde", "Kollarında"], correctOptionIndex: 2 },
      { id: 8, questionText: "Arıların bal yaparken çiçeklerden topladığı tatlı sıvıya ne ad verilir?", options: ["Polen", "Nektar", "Salep", "Reçine"], correctOptionIndex: 1 },
      { id: 9, questionText: "Zorlu çöl şartlarına uyum sağlamış, sırtında yağ depolayan hörgüçleri olan hayvan hangisidir?", options: ["Zürafa", "Lama", "Deve", "Zebra"], correctOptionIndex: 2 },
      { id: 10, questionText: "Kuş sınıfına dahil olmasına rağmen ağırlığından dolayı uçamayan ama çok hızlı koşan dev kuş hangisidir?", options: ["Devekuşu", "Penguen", "Albatros", "Tavuskuşu"], correctOptionIndex: 0 },
      { id: 11, questionText: "Kendi ağırlığının yaklaşık 50 katı kadar yük taşıyabilen o çalışkan küçük böcek hangisidir?", options: ["Arı", "Karınca", "Uğur Böceği", "Çekirge"], correctOptionIndex: 1 },
      { id: 12, questionText: "Bukalemunların göz yapılarıyla ilgili hangi bilgi doğrudur?", options: ["Gözleri hiç hareket etmez", "İki gözünü birbirinden bağımsız olarak 360 derece oynatabilir", "Sadece siyah beyaz görürler", "Geceleri kördürler"], correctOptionIndex: 1 },
      { id: 13, questionText: "Denizlerin en zeki canlılarından kabul edilen, çıkardığı sonar seslerle haberleşen memeli hangisidir?", options: ["Köpek Balığı", "Yunus", "Mürekkep Balığı", "Deniz Anası"], correctOptionIndex: 1 },
      { id: 14, questionText: "Kuzey Kutbu'nda yaşayan, mükemmel bir yüzücü olan beyaz kürklü dev yırtıcı hangisidir?", options: ["Kutup Ayısı", "Bozayı", "Kurt", "Penguen"], correctOptionIndex: 0 },
      { id: 15, questionText: "Timsahlar avlarını yerken gözlerinden yaş gelmesinin fizyolojik nedeni hangisidir?", options: ["Üzüntü duymaları", "Gözlerini temizlemeleri", "Çene kaslarının göz arkasındaki bezleri sıkıştırması", "Tuz oranını ayarlamaları"], correctOptionIndex: 2 },
      { id: 16, questionText: "Kedilerin dar alanlardan geçerken veya yüksekten atlarken dengede kalmasına yardım eden en önemli uzuvları hangisidir?", options: ["Bıyıkları", "Kuyrukları", "Kulakları", "Patileri"], correctOptionIndex: 1 },
      { id: 17, questionText: "Karada yaşayan hayvanlar arasında en büyük kulak kepçesine sahip canlı hangisidir?", options: ["Zürafa", "Fil", "Eşek", "Tavşan"], correctOptionIndex: 1 },
      { id: 18, questionText: "Hem karada hem suda yaşayabilen, larva döneminde solungaç, yetişkinken akciğer solunumu yapan canlı hangisidir?", options: ["Yılan", "Kurbağa", "Kertenkele", "Salyangoz"], correctOptionIndex: 1 },
      { id: 19, questionText: "Yılanların havayı koklamak ve yön bulmak amacıyla kullandıkları koku alma duyu organı hangisidir?", options: ["Burun delikleri", "Dilleri", "Pulları", "Göz kapakları"], correctOptionIndex: 1 },
      { id: 20, questionText: "Her yıl binlerce kilometre göç eden ve ülkemizde bacalara, direklere yuva yapmasıyla tanınan uzun bacaklı kuş hangisidir?", options: ["Kırlangıç", "Leylek", "Serçe", "Karga"], correctOptionIndex: 1 }
    ]
  },
  {
    id: "ready-islam-kulturu",
    title: "🕌 İslam Tarihi & Kültürü",
    timerSeconds: 15,
    category: "İslam Kültürü",
    description: "İslam tarihi, genel kültürü, peygamberlerin hayatları ve temel kavramlar üzerine 20 eğitici soru!",
    questions: [
      { id: 1, questionText: "Kur'an-ı Kerim'in ilk inen suresi aşağıdakilerden hangisidir?", options: ["Fatiha Suresi", "Alak Suresi", "Yasin Suresi", "İhlas Suresi"], correctOptionIndex: 1 },
      { id: 2, questionText: "İslam tarihinde Müslümanların gerçekleştirdiği ilk hicret nereye yapılmıştır?", options: ["Medine", "Habeşistan", "Taif", "Şam"], correctOptionIndex: 1 },
      { id: 3, questionText: "Hz. Muhammed'in (s.a.v.) kabr-i şerifinin bulunduğu Medine'deki mescidin adı nedir?", options: ["Mescid-i Haram", "Mescid-i Aksa", "Mescid-i Nebevi", "Mescid-i Kuba"], correctOptionIndex: 2 },
      { id: 4, questionText: "İslam dininde ilk ezanı okuyan ve sesinin güzelliğiyle bilinen sahabi kimdir?", options: ["Hz. Ali", "Bilal-i Habeşi", "Hz. Ebubekir", "Mus'ab bin Umeyr"], correctOptionIndex: 1 },
      { id: 5, questionText: "Kur'an-ı Kerim toplam kaç cüzden oluşmaktadır?", options: ["20", "25", "30", "40"], correctOptionIndex: 2 },
      { id: 6, questionText: "Kur'an-ı Kerim hangi halife döneminde tek bir kitap (Mushaf) haline getirilmiştir?", options: ["Hz. Ebubekir", "Hz. Ömer", "Hz. Osman", "Hz. Ali"], correctOptionIndex: 0 },
      { id: 7, questionText: "İslam dininde farz olan ve günde 5 vakit yerine getirilmesi gereken ibadet hangisidir?", options: ["Namaz", "Oruç", "Zekat", "Hac"], correctOptionIndex: 0 },
      { id: 8, questionText: "Müslümanların kıblesi olan ve Mekke şehrinde bulunan kutsal yapı hangisidir?", options: ["Mescid-i Aksa", "Kabe", "Kubbetü's-Sahra", "Sultanahmet"], correctOptionIndex: 1 },
      { id: 9, questionText: "Hz. Muhammed (s.a.v.) ve Müslümanların Mekke'den Medine'ye göç etmesi olayına ne ad verilir?", options: ["Mevlid", "Hicret", "Miraç", "Rıdvan"], correctOptionIndex: 1 },
      { id: 10, questionText: "İslam'ın beş şartından biri olan ve hicri takvime göre ramazan ayında tutulan ibadet hangisidir?", options: ["Hac", "Kurban", "Zekat", "Oruç"], correctOptionIndex: 3 },
      { id: 11, questionText: "İslam tarihinde Hz. Ebubekir, Hz. Ömer, Hz. Osman ve Hz. Ali'nin yönetimde olduğu döneme ne ad verilir?", options: ["Emeviler Dönemi", "Dört Halife Dönemi", "Abbasi Dönemi", "Selçuklular Dönemi"], correctOptionIndex: 1 },
      { id: 12, questionText: "Kur'an-ı Kerim'in çoğaltılması ve diğer merkezlere gönderilmesi hangi halife döneminde yapılmıştır?", options: ["Hz. Ebubekir", "Hz. Ömer", "Hz. Osman", "Hz. Ali"], correctOptionIndex: 2 },
      { id: 13, questionText: "Müslümanların ilk kıblesi olan ve kutsal kabul edilen Mescid-i Aksa hangi şehirdedir?", options: ["Mekke", "Medine", "Kudüs", "Kahire"], correctOptionIndex: 2 },
      { id: 14, questionText: "İslamiyet'te bir aylık oruç ibadetinin bittiğini belirten ve sevinçle kutlanan bayram hangisidir?", options: ["Kurban Bayramı", "Ramazan Bayramı", "Mevlid Kandili", "Aşure Günü"], correctOptionIndex: 1 },
      { id: 15, questionText: "Zengin olan Müslümanların yılda bir kez mallarının belirli bir oranını ihtiyaç sahiplerine vermesi farz olan ibadet hangisidir?", options: ["Zekat", "Sadaka", "Fitre", "Öşür"], correctOptionIndex: 0 },
      { id: 16, questionText: "Hz. Muhammed'in (s.a.v.) doğduğu ve İslamiyet'in başladığı kutsal şehir hangisidir?", options: ["Medine", "Mekke", "Kudüs", "Taif"], correctOptionIndex: 1 },
      { id: 17, questionText: "İslam dininin inanç esaslarından (imanın şartlarından) ilki hangisidir?", options: ["Meleklere iman", "Peygamberlere iman", "Allah'a iman", "Ahiret gününe iman"], correctOptionIndex: 2 },
      { id: 18, questionText: "Kur'an-ı Kerim'in en uzun suresi aşağıdakilerden hangisidir?", options: ["Fatiha Suresi", "Yasin Suresi", "Kevser Suresi", "Bakara Suresi"], correctOptionIndex: 3 },
      { id: 19, questionText: "Hz. Muhammed'e (s.a.v.) Cebrail (a.s.) vasıtasıyla ilk vahiy nerede, hangi mağarada gelmiştir?", options: ["Sevr Mağarası", "Hira Mağarası", "Uhud Dağı", "Kuba Mağarası"], correctOptionIndex: 1 },
      { id: 20, questionText: "Kur'an-ı Kerim'de adı geçen, insanlığın ilk atası ve ilk peygamber olan kimdir?", options: ["Hz. Nuh", "Hz. İbrahim", "Hz. Adem", "Hz. Şit"], correctOptionIndex: 2 }
    ]
  }
];

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      timer_seconds INTEGER NOT NULL DEFAULT 20,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tabloları hazır.");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Yetkisiz işlem. Token bulunamadı.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Yetkisiz işlem. Token geçersiz.",
    });
  }

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);
    req.user = decodedUser;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Oturum süresi dolmuş veya token geçersiz.",
    });
  }
}

function generateRoomCode() {
  let code = "";

  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));

  return code;
}

function normalizeQuestions(questions) {
  return questions.map((question, index) => ({
    id: index + 1,
    questionText: question.questionText.trim(),
    options: question.options.map((option) => option.trim()),
    correctOptionIndex: Number(question.correctOptionIndex),
  }));
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "En az 1 soru eklemelisin.";
  }

  if (questions.length > 30) {
    return "En fazla 30 soru ekleyebilirsin.";
  }

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];

    if (!question.questionText || !question.questionText.trim()) {
      return `${i + 1}. sorunun metni boş olamaz.`;
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      return `${i + 1}. soru için 4 seçenek olmalıdır.`;
    }

    for (let j = 0; j < question.options.length; j += 1) {
      if (!question.options[j] || !question.options[j].trim()) {
        return `${i + 1}. sorunun ${j + 1}. seçeneği boş olamaz.`;
      }
    }

    const correctOptionIndex = Number(question.correctOptionIndex);

    if (
      Number.isNaN(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      return `${i + 1}. soru için doğru cevap seçmelisin.`;
    }
  }

  return null;
}

function normalizeTimerSeconds(value) {
  const timerSeconds = Number(value);

  if (Number.isNaN(timerSeconds)) {
    return 20;
  }

  if (timerSeconds < 5) {
    return 5;
  }

  if (timerSeconds > 120) {
    return 120;
  }

  return timerSeconds;
}

function calculatePoints(room, isCorrect, isFirstCorrect) {
  if (!isCorrect) {
    return {
      pointsGained: 0,
      remainingSeconds: 0,
      speedBonus: 0,
    };
  }

  const remainingMs = room.questionEndsAt - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  
  let speedBonus = 0;
  if (isFirstCorrect) {
    speedBonus = 100;
  }

  const pointsGained = 100 + remainingSeconds * 10 + speedBonus;

  return {
    pointsGained,
    remainingSeconds,
    speedBonus,
  };
}

function getPublicPlayers(room) {
  return room.players.map((player) => ({
    username: player.username,
    score: player.score,
    answered: player.answeredQuestions.has(room.currentQuestionIndex),
  }));
}

function getLeaderboard(room) {
  return [...room.players]
    .map((player) => ({
      username: player.username,
      score: player.score,
    }))
    .sort((a, b) => b.score - a.score);
}

function getCurrentQuestionPayload(room) {
  const question = room.questions[room.currentQuestionIndex];

  return {
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    questionText: question.questionText,
    options: question.options,
    timerSeconds: room.timerSeconds,
    endsAt: room.questionEndsAt,
  };
}

function emitRoomUpdated(io, roomCode, room) {
  io.to(roomCode).emit("roomUpdated", {
    roomCode: room.roomCode,
    title: room.title,
    players: getPublicPlayers(room),
  });
}

function clearRoomTimers(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  if (room.nextQuestionTimer) {
    clearTimeout(room.nextQuestionTimer);
    room.nextQuestionTimer = null;
  }
}

async function finishGame(io, roomCode, room) {
  clearRoomTimers(room);

  room.isFinished = true;
  room.isStarted = false;
  room.questionLocked = true;

  const leaderboard = getLeaderboard(room);

  io.to(roomCode).emit("gameFinished", {
    leaderboard,
  });

  emitRoomUpdated(io, roomCode, room);

  // Save scores to database
  try {
    for (const player of room.players) {
      if (player.score > 0) {
        await pool.query(
          "INSERT INTO leaderboard (username, score) VALUES ($1, $2)",
          [player.username, player.score]
        );
      }
    }
    console.log(`Oda ${roomCode} skorları başarıyla veritabanına kaydedildi.`);
  } catch (error) {
    console.error("Error saving scores to leaderboard:", error);
  }
}

function sendQuestion(io, roomCode, room) {
  clearRoomTimers(room);

  room.questionLocked = false;
  room.questionStartedAt = Date.now();
  room.questionEndsAt = Date.now() + room.timerSeconds * 1000;
  room.correctAnswersCountForCurrentQuestion = 0;

  // Reset player joker active states and answers for the new question
  room.players.forEach((player) => {
    player.currentQuestionAnswer = null;
    player.doubleChanceActive = false;
  });

  io.to(roomCode).emit("nextQuestion", getCurrentQuestionPayload(room));
  emitRoomUpdated(io, roomCode, room);

  room.questionTimer = setTimeout(() => {
    const currentQuestion = room.questions[room.currentQuestionIndex];

    room.questionLocked = true;

    // Calculate answer distribution counts
    const distribution = [0, 0, 0, 0];
    room.players.forEach((p) => {
      if (p.currentQuestionAnswer !== null && p.currentQuestionAnswer !== undefined) {
        const idx = Number(p.currentQuestionAnswer);
        if (idx >= 0 && idx < 4) {
          distribution[idx]++;
        }
      }
    });

    io.to(roomCode).emit("questionEnded", {
      correctOptionIndex: currentQuestion.correctOptionIndex,
      correctAnswer: currentQuestion.options[currentQuestion.correctOptionIndex],
      leaderboard: getLeaderboard(room),
      answerDistribution: distribution,
    });

    emitRoomUpdated(io, roomCode, room);

    room.nextQuestionTimer = setTimeout(() => {
      if (!room.isStarted || room.isFinished) {
        return;
      }

      const nextIndex = room.currentQuestionIndex + 1;

      if (nextIndex >= room.questions.length) {
        finishGame(io, roomCode, room);
        return;
      }

      room.currentQuestionIndex = nextIndex;
      sendQuestion(io, roomCode, room);
    }, 5000); // 5 saniye bekleme süresi
  }, room.timerSeconds * 1000);
}

async function saveQuizToDatabase({ userId, title, timerSeconds, questions }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const quizResult = await client.query(
      `
      INSERT INTO quizzes (user_id, title, timer_seconds)
      VALUES ($1, $2, $3)
      RETURNING id, title, timer_seconds, created_at
      `,
      [userId, title, timerSeconds]
    );

    const quiz = quizResult.rows[0];

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];

      await client.query(
        `
        INSERT INTO quiz_questions (
          quiz_id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option_index,
          position
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          quiz.id,
          question.questionText,
          question.options[0],
          question.options[1],
          question.options[2],
          question.options[3],
          question.correctOptionIndex,
          i + 1,
        ]
      );
    }

    await client.query("COMMIT");

    return quiz;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/", (req, res) => {
  res.json({ message: "QuizUpp backend çalışıyor." });
});

app.get("/api/ready-quizzes", (req, res) => {
  res.json({ quizzes: readyQuizzes });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Kullanıcı adı, email ve şifre zorunludur.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Şifre en az 6 karakter olmalıdır.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Bu email ile kayıtlı bir kullanıcı zaten var.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
      `,
      [username.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = createToken(user);

    return res.status(201).json({
      message: "Kayıt başarılı.",
      token,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Kayıt sırasında sunucu hatası oluştu.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email ve şifre zorunludur.",
      });
    }

    const result = await pool.query(
      "SELECT id, username, email, password, created_at FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Email veya şifre hatalı.",
      });
    }

    const user = result.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Email veya şifre hatalı.",
      });
    }

    delete user.password;

    const token = createToken(user);

    return res.json({
      message: "Giriş başarılı.",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Giriş sırasında sunucu hatası oluştu.",
    });
  }
});

app.post("/api/quizzes", authenticateUser, async (req, res) => {
  try {
    const { title, questions, timerSeconds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Quiz başlığı zorunludur.",
      });
    }

    const validationError = validateQuestions(questions);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const cleanTitle = title.trim();
    const cleanTimerSeconds = normalizeTimerSeconds(timerSeconds);
    const normalizedQuestions = normalizeQuestions(questions);

    const savedQuiz = await saveQuizToDatabase({
      userId: req.user.id,
      title: cleanTitle,
      timerSeconds: cleanTimerSeconds,
      questions: normalizedQuestions,
    });

    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      quizId: savedQuiz.id,
      title: cleanTitle,
      timerSeconds: cleanTimerSeconds,
      host: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
      isReadyQuiz: false,
      questions: normalizedQuestions,
      originalQuestions: normalizedQuestions,
      players: [],
      currentQuestionIndex: 0,
      isStarted: false,
      isFinished: false,
      questionLocked: false,
      questionStartedAt: null,
      questionEndsAt: null,
      questionTimer: null,
      nextQuestionTimer: null,
      createdAt: new Date().toISOString(),
    };

    rooms.set(roomCode, room);

    return res.status(201).json({
      message: "Quiz oluşturuldu ve kaydedildi.",
      roomCode,
      quiz: {
        id: savedQuiz.id,
        title: room.title,
        questionCount: room.questions.length,
        timerSeconds: room.timerSeconds,
      },
    });
  } catch (error) {
    console.error("Create quiz error:", error);
    return res.status(500).json({
      message: "Quiz oluşturulurken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/my-quizzes", authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        q.id,
        q.title,
        q.timer_seconds,
        q.created_at,
        COUNT(qq.id) AS question_count
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE q.user_id = $1
      GROUP BY q.id
      ORDER BY q.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      quizzes: result.rows.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        timerSeconds: quiz.timer_seconds,
        questionCount: Number(quiz.question_count),
        createdAt: quiz.created_at,
      })),
    });
  } catch (error) {
    console.error("My quizzes error:", error);
    return res.status(500).json({
      message: "Quizler alınırken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/quizzes/:quizId", authenticateUser, async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizResult = await pool.query(
      `
      SELECT id, title, timer_seconds, created_at
      FROM quizzes
      WHERE id = $1 AND user_id = $2
      `,
      [quizId, req.user.id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        message: "Quiz bulunamadı.",
      });
    }

    const questionsResult = await pool.query(
      `
      SELECT
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option_index,
        position
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY position ASC
      `,
      [quizId]
    );

    const quiz = quizResult.rows[0];

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        timerSeconds: quiz.timer_seconds,
        createdAt: quiz.created_at,
        questions: questionsResult.rows.map((question) => ({
          id: question.id,
          questionText: question.question_text,
          options: [
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
          ],
          correctOptionIndex: question.correct_option_index,
        })),
      },
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    return res.status(500).json({
      message: "Quiz alınırken sunucu hatası oluştu.",
    });
  }
});

app.post("/api/quizzes/ready/:quizId/start-room-guest", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { username } = req.body;

    const pack = readyQuizzes.find((item) => item.id === quizId);
    if (!pack) {
      return res.status(404).json({
        message: "Hazır paket bulunamadı.",
      });
    }

    const cleanUsername = username && username.trim() ? username.trim() : "Misafir Host";
    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      quizId: pack.id,
      title: pack.title,
      timerSeconds: pack.timerSeconds,
      host: {
        id: -1,
        username: cleanUsername,
        email: "guest@quizupp.local",
      },
      isReadyQuiz: true,
      questions: pack.questions,
      originalQuestions: pack.questions,
      players: [],
      currentQuestionIndex: 0,
      isStarted: false,
      isFinished: false,
      questionLocked: false,
      questionStartedAt: null,
      questionEndsAt: null,
      questionTimer: null,
      nextQuestionTimer: null,
      createdAt: new Date().toISOString(),
    };

    rooms.set(roomCode, room);

    return res.status(201).json({
      message: "Oda oluşturuldu.",
      roomCode,
      quiz: {
        id: pack.id,
        title: pack.title,
        questionCount: pack.questions.length,
        timerSeconds: pack.timerSeconds,
      },
    });
  } catch (error) {
    console.error("Start guest room error:", error);
    return res.status(500).json({
      message: "Oda oluşturulurken sunucu hatası oluştu.",
    });
  }
});

app.post("/api/quizzes/:quizId/start-room", authenticateUser, async (req, res) => {
  try {
    const { quizId } = req.params;

    if (String(quizId).startsWith("ready-")) {
      const pack = readyQuizzes.find((item) => item.id === quizId);
      if (!pack) {
        return res.status(404).json({
          message: "Hazır paket bulunamadı.",
        });
      }

      const roomCode = generateRoomCode();
      const room = {
        roomCode,
        quizId: pack.id,
        title: pack.title,
        timerSeconds: pack.timerSeconds,
        host: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
        },
        isReadyQuiz: true,
        questions: pack.questions,
        originalQuestions: pack.questions,
        players: [],
        currentQuestionIndex: 0,
        isStarted: false,
        isFinished: false,
        questionLocked: false,
        questionStartedAt: null,
        questionEndsAt: null,
        questionTimer: null,
        nextQuestionTimer: null,
        createdAt: new Date().toISOString(),
      };

      rooms.set(roomCode, room);

      return res.status(201).json({
        message: "Oda oluşturuldu.",
        roomCode,
        quiz: {
          id: pack.id,
          title: pack.title,
          questionCount: pack.questions.length,
          timerSeconds: pack.timerSeconds,
        },
      });
    }

    const quizResult = await pool.query(
      `
      SELECT id, title, timer_seconds
      FROM quizzes
      WHERE id = $1 AND user_id = $2
      `,
      [quizId, req.user.id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        message: "Quiz bulunamadı.",
      });
    }

    const questionsResult = await pool.query(
      `
      SELECT
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option_index,
        position
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY position ASC
      `,
      [quizId]
    );

    if (questionsResult.rows.length === 0) {
      return res.status(400).json({
        message: "Bu quizde soru yok.",
      });
    }

    const quiz = quizResult.rows[0];

    const questions = questionsResult.rows.map((question, index) => ({
      id: index + 1,
      questionText: question.question_text,
      options: [
        question.option_a,
        question.option_b,
        question.option_c,
        question.option_d,
      ],
      correctOptionIndex: question.correct_option_index,
    }));

    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      quizId: quiz.id,
      title: quiz.title,
      timerSeconds: quiz.timer_seconds,
      host: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
      isReadyQuiz: false,
      questions,
      originalQuestions: questions,
      players: [],
      currentQuestionIndex: 0,
      isStarted: false,
      isFinished: false,
      questionLocked: false,
      questionStartedAt: null,
      questionEndsAt: null,
      questionTimer: null,
      nextQuestionTimer: null,
      createdAt: new Date().toISOString(),
    };

    rooms.set(roomCode, room);

    return res.status(201).json({
      message: "Oda oluşturuldu.",
      roomCode,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionCount: questions.length,
        timerSeconds: quiz.timer_seconds,
      },
    });
  } catch (error) {
    console.error("Start saved quiz room error:", error);
    return res.status(500).json({
      message: "Kayıtlı quizden oda oluşturulurken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/active-rooms", (req, res) => {
  const activeRooms = [];
  for (const [code, room] of rooms.entries()) {
    if (!room.isStarted && !room.isFinished) {
      activeRooms.push({
        roomCode: room.roomCode,
        title: room.title,
        timerSeconds: room.timerSeconds,
        questionCount: room.questions.length,
        playerCount: room.players.length,
        hostName: room.host ? room.host.username : "Misafir Host",
      });
    }
  }
  return res.json({ rooms: activeRooms });
});

app.get("/api/rooms/:roomCode", (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);

  if (!room) {
    return res.status(404).json({
      message: "Oda bulunamadı.",
    });
  }

  return res.json({
    roomCode: room.roomCode,
    title: room.title,
    questionCount: room.questions.length,
    timerSeconds: room.timerSeconds,
    isStarted: room.isStarted,
    isFinished: room.isFinished,
    playerCount: room.players.length,
  });
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, MAX(score) as score 
       FROM leaderboard 
       GROUP BY username 
       ORDER BY score DESC 
       LIMIT 3`
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error("Error fetching top 3 leaderboard:", error);
    res.status(500).json({ message: "Liderlik tablosu alınamadı." });
  }
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Yeni bağlanan:", socket.id);

  socket.on("joinRoom", ({ roomId, username, isHost }, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (room.isFinished) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu oyun bitmiş.",
        });
      }
      return;
    }

    const cleanUsername = username && username.trim() ? username.trim() : "Oyuncu";

    if (!isHost) {
      const existingPlayer = room.players.find(
        (player) => player.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (existingPlayer) {
        console.log(`Oyuncu ${cleanUsername} yeniden bağlanıyor. Soket transfer ediliyor: ${existingPlayer.socketId} -> ${socket.id}`);
        existingPlayer.socketId = socket.id;
        existingPlayer.offline = false;
        if (existingPlayer.disconnectTimer) {
          clearTimeout(existingPlayer.disconnectTimer);
          existingPlayer.disconnectTimer = null;
        }

        socket.join(roomId);
        emitRoomUpdated(io, roomId, room);

        if (room.isStarted) {
          socket.emit("gameStarted");
          socket.emit("nextQuestion", getCurrentQuestionPayload(room));
          if (existingPlayer.answeredQuestions.has(room.currentQuestionIndex)) {
            socket.emit("reconnectionState", {
              answered: true,
              score: existingPlayer.score,
            });
          }
        }

        if (typeof callback === "function") {
          callback({
            ok: true,
            isReconnection: true,
            room: {
              roomCode: room.roomCode,
              title: room.title,
              questionCount: room.questions.length,
              timerSeconds: room.timerSeconds,
              isStarted: room.isStarted,
              isReadyQuiz: room.isReadyQuiz,
            },
          });
        }
        return;
      }
    }

    socket.join(roomId);

    /*
      Host oyuncu listesine sadece hazır quizlerde eklenir.
      Böylece hazır quiz odalarında host da soru çözebilir.
      Kendi özel quizi ise eklenmez, sadece yönetir.
    */
    if (!isHost || room.isReadyQuiz) {
      const alreadyJoined = room.players.some(
        (player) => player.socketId === socket.id
      );

      if (!alreadyJoined) {
        room.players.push({
          socketId: socket.id,
          username: cleanUsername,
          score: 0,
          answeredQuestions: new Set(),
        });
      }
    }

    console.log(`${cleanUsername}, ${roomId} odasına girdi.`);

    emitRoomUpdated(io, roomId, room);

    if (room.isStarted) {
      socket.emit("gameStarted");
      socket.emit("nextQuestion", getCurrentQuestionPayload(room));
    }

    if (typeof callback === "function") {
      callback({
        ok: true,
        room: {
          roomCode: room.roomCode,
          title: room.title,
          questionCount: room.questions.length,
          timerSeconds: room.timerSeconds,
          isStarted: room.isStarted,
          isReadyQuiz: room.isReadyQuiz,
        },
      });
    }
  });

  socket.on("startGame", (roomId, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (room.questions.length === 0) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu odada soru yok.",
        });
      }
      return;
    }

    if (room.players.length === 0) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oyunu başlatmak için en az 1 oyuncu gerekli.",
        });
      }
      return;
    }

    room.isStarted = true;
    room.isFinished = false;
    room.currentQuestionIndex = 0;
    room.questionLocked = false;

    const original = room.originalQuestions || room.questions;
    const shuffled = [...original].sort(() => Math.random() - 0.5);
    room.questions = shuffled.slice(0, 10);

    room.players = room.players.map((player) => ({
      ...player,
      score: 0,
      answeredQuestions: new Set(),
    }));

    io.to(roomId).emit("gameStarted");
    sendQuestion(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
        message: "Oyun başlatıldı.",
      });
    }
  });

  socket.on("submitAnswer", ({ roomId, selectedOptionIndex }, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (!room.isStarted || room.isFinished) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Aktif oyun yok.",
        });
      }
      return;
    }

    if (room.questionLocked) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Süre bitti. Bu soru cevaplanamaz.",
        });
      }
      return;
    }

    const player = room.players.find((item) => item.socketId === socket.id);

    if (!player) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Host cevap veremez. Sadece oyuncular cevaplayabilir.",
        });
      }
      return;
    }

    const now = Date.now();

    if (now > room.questionEndsAt) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Süre bitti. Bu soru artık cevaplanamaz.",
        });
      }
      return;
    }

    if (player.answeredQuestions.has(room.currentQuestionIndex)) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu soruyu zaten cevapladın.",
        });
      }
      return;
    }

    const question = room.questions[room.currentQuestionIndex];
    const cleanSelectedOptionIndex = Number(selectedOptionIndex);

    if (
      Number.isNaN(cleanSelectedOptionIndex) ||
      cleanSelectedOptionIndex < 0 ||
      cleanSelectedOptionIndex > 3
    ) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Geçersiz cevap.",
        });
      }
      return;
    }

    const isCorrect = cleanSelectedOptionIndex === question.correctOptionIndex;

    // Double Chance (Çift Şans) Joker Check
    if (!isCorrect && player.doubleChanceActive) {
      player.doubleChanceActive = false; // consume it
      player.currentQuestionAnswer = cleanSelectedOptionIndex; // track the tried choice
      if (typeof callback === "function") {
        callback({
          ok: true,
          isCorrect: false,
          doubleChanceTriggered: true,
          message: "Yanlış cevap! Çift Şans jokerin sayesinde bir hakkın daha var, başka bir seçeneği dene!"
        });
      }
      return;
    }
    
    let isFirstCorrect = false;
    if (isCorrect) {
      room.correctAnswersCountForCurrentQuestion = (room.correctAnswersCountForCurrentQuestion || 0) + 1;
      if (room.correctAnswersCountForCurrentQuestion === 1) {
        isFirstCorrect = true;
      }
    }

    const { pointsGained, remainingSeconds, speedBonus } = calculatePoints(room, isCorrect, isFirstCorrect);

    player.score += pointsGained;
    player.currentQuestionAnswer = cleanSelectedOptionIndex;
    player.answeredQuestions.add(room.currentQuestionIndex);

    emitRoomUpdated(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
        isCorrect,
        correctOptionIndex: question.correctOptionIndex,
        score: player.score,
        pointsGained,
        remainingSeconds,
        speedBonus,
      });
    }

    // Check if all active players have answered the current question
    const allPlayersAnswered = room.players.length > 0 && room.players.every((p) =>
      p.answeredQuestions.has(room.currentQuestionIndex)
    );

    if (allPlayersAnswered) {
      clearRoomTimers(room);
      room.questionLocked = true;

      // Calculate answer distribution counts
      const distribution = [0, 0, 0, 0];
      room.players.forEach((p) => {
        if (p.currentQuestionAnswer !== null && p.currentQuestionAnswer !== undefined) {
          const idx = Number(p.currentQuestionAnswer);
          if (idx >= 0 && idx < 4) {
            distribution[idx]++;
          }
        }
      });

      io.to(roomId).emit("questionEnded", {
        correctOptionIndex: question.correctOptionIndex,
        correctAnswer: question.options[question.correctOptionIndex],
        leaderboard: getLeaderboard(room),
        answerDistribution: distribution,
      });

      emitRoomUpdated(io, roomId, room);

      room.nextQuestionTimer = setTimeout(() => {
        if (!room.isStarted || room.isFinished) {
          return;
        }

        const nextIndex = room.currentQuestionIndex + 1;

        if (nextIndex >= room.questions.length) {
          finishGame(io, roomId, room);
          return;
        }

        room.currentQuestionIndex = nextIndex;
        sendQuestion(io, roomId, room);
      }, 5000); // 5 saniye bekleme süresi
    }
  });

  socket.on("finishGame", (roomId, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    finishGame(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
      });
    }
  });

  socket.on("sendEmote", ({ roomId, emote }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    const username = player ? player.username : "Host";
    io.to(roomId).emit("receiveEmote", { username, emote });
  });

  socket.on("useJoker5050", ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (!room || !room.isStarted) return callback?.({ ok: false });
    const question = room.questions[room.currentQuestionIndex];
    const correctIndex = question.correctOptionIndex;
    
    const incorrectIndices = [];
    for (let i = 0; i < 4; i++) {
      if (i !== correctIndex) {
        incorrectIndices.push(i);
      }
    }
    const toHide = incorrectIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    callback?.({ ok: true, toHide });
  });

  socket.on("useJokerDoubleChance", ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (!room || !room.isStarted) return callback?.({ ok: false });
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return callback?.({ ok: false });
    
    player.doubleChanceActive = true;
    callback?.({ ok: true });
  });

  socket.on("latencyPing", (clientTime) => {
    socket.emit("latencyPong", clientTime);
  });

  socket.on("disconnect", () => {
    console.log("Oyuncu ayrıldı:", socket.id);

    for (const [, room] of rooms) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.offline = true;
        player.disconnectTimer = setTimeout(() => {
          room.players = room.players.filter((p) => p.socketId !== socket.id);
          emitRoomUpdated(io, room.roomCode, room);
        }, 60000); // 60 saniye beklet
        emitRoomUpdated(io, room.roomCode, room);
      }
    }
  });
});

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Sunucu http://localhost:${PORT} üzerinde hazır.`);
    });
  })
  .catch((error) => {
    console.error("Database başlatılamadı:", error);
    process.exit(1);
  });