/* Language preference.
   Two layers:
   1. KEYS  — the strings screens ask for explicitly via T("hero.title").
   2. PHRASE — an English-source phrase book applied by a DOM sweep after each
      render, so headings, eyebrows, card titles and button labels translate on
      every page without each screen having to be keyed by hand.
   Long-form article and university body copy stays in English until the client
   supplies professional translations. */
(function () {
  const L = ["AR", "FR", "TR", "RU", "SW", "ES", "PT", "FA", "UR", "HI", "BN", "ID", "ZH", "HA", "YO", "IG"];
  const p = (en, ar, fr, tr, ru, sw) => [en, { AR: ar, FR: fr, TR: tr, RU: ru, SW: sw }];

  /* Order matters: longer phrases are replaced before their substrings. */
  const PHRASE_LIST = [
    // Primary actions
    p("Apply Now", "قدّم الآن", "Postuler", "Hemen Başvur", "Подать заявку", "Tuma Maombi"),
    p("Book a Consultation", "احجز استشارة", "Réserver un entretien", "Danışmanlık Al", "Записаться на консультацию", "Weka Ushauri"),
    p("Chat on WhatsApp", "تواصل على واتساب", "Discuter sur WhatsApp", "WhatsApp'tan yazın", "Написать в WhatsApp", "Tuandikie WhatsApp"),
    p("Message us now", "راسلنا الآن", "Écrivez-nous", "Hemen yazın", "Напишите нам", "Tuandikie sasa"),
    p("Become a Representative", "كن ممثلاً", "Devenir représentant", "Temsilci Olun", "Стать представителем", "Kuwa Mwakilishi"),
    p("Become a Partner", "كن شريكاً", "Devenir partenaire", "Partner Olun", "Стать партнёром", "Kuwa Mshirika"),
    p("Partner Login", "دخول الشركاء", "Espace partenaire", "Partner Girişi", "Вход для партнёров", "Ingia kama Mshirika"),
    p("Partnership terms", "شروط الشراكة", "Conditions de partenariat", "Partnerlik şartları", "Условия партнёрства", "Masharti ya ushirika"),
    p("Browse the directory", "تصفح الدليل", "Voir l'annuaire", "Rehbere göz atın", "Открыть каталог", "Angalia orodha"),
    p("Browse universities", "تصفح الجامعات", "Voir les universités", "Üniversitelere bakın", "Смотреть университеты", "Angalia vyuo"),
    p("Contact us", "اتصل بنا", "Nous contacter", "Bize ulaşın", "Связаться с нами", "Wasiliana nasi"),
    p("Register now", "سجّل الآن", "S'inscrire", "Şimdi kaydolun", "Зарегистрироваться", "Jisajili sasa"),
    p("Submit registration", "إرسال التسجيل", "Envoyer l'inscription", "Kaydı gönder", "Отправить заявку", "Tuma usajili"),
    p("Apply for a territory", "تقدّم لمنطقة", "Demander un territoire", "Bölge için başvur", "Заявка на территорию", "Omba eneo"),
    p("Apply for your territory", "تقدّم لمنطقتك", "Demandez votre territoire", "Bölgenize başvurun", "Заявка на вашу территорию", "Omba eneo lako"),
    p("Request my consultation", "اطلب استشارتي", "Demander mon entretien", "Danışmanlık talep et", "Запросить консультацию", "Omba ushauri wangu"),
    p("Read the guide", "اقرأ الدليل", "Lire le guide", "Rehberi okuyun", "Читать руководство", "Soma mwongozo"),
    p("Open page", "افتح الصفحة", "Ouvrir la page", "Sayfayı aç", "Открыть страницу", "Fungua ukurasa"),
    p("Load more universities", "عرض جامعات أكثر", "Voir plus d'universités", "Daha fazla üniversite", "Показать ещё", "Onyesha vyuo zaidi"),
    p("Clear filters", "مسح عوامل التصفية", "Effacer les filtres", "Filtreleri temizle", "Сбросить фильтры", "Ondoa vichujio"),
    p("See how it works", "كيف تعمل الخدمة", "Comment cela fonctionne", "Nasıl işliyor", "Как это работает", "Jinsi inavyofanya kazi"),
    p("See Study in Türkiye", "شاهد الدراسة في تركيا", "Voir Étudier en Türkiye", "Türkiye'de Eğitim'e bakın", "Смотреть Учёбу в Турции", "Angalia Kusoma Türkiye"),
    p("All universities", "كل الجامعات", "Toutes les universités", "Tüm üniversiteler", "Все университеты", "Vyuo vyote"),
    p("All resources", "كل المصادر", "Toutes les ressources", "Tüm kaynaklar", "Все материалы", "Nyenzo zote"),
    p("Read our guides", "اقرأ أدلتنا", "Lire nos guides", "Rehberlerimizi okuyun", "Читать наши гиды", "Soma miongozo yetu"),
    p("Back to home", "العودة للرئيسية", "Retour à l'accueil", "Ana sayfaya dön", "На главную", "Rudi mwanzo"),
    p("Check my eligibility", "تحقق من أهليتي", "Vérifier mon éligibilité", "Uygunluğumu kontrol et", "Проверить право", "Angalia kufuzu kwangu"),
    p("Go to the portal", "اذهب إلى البوابة", "Accéder au portail", "Portala git", "Перейти в портал", "Nenda kwenye lango"),
    p("Register another office", "سجّل مكتباً آخر", "Inscrire un autre bureau", "Başka ofis kaydet", "Добавить офис", "Sajili ofisi nyingine"),

    // Navigation and page titles
    p("Study in Türkiye", "الدراسة في تركيا", "Étudier en Türkiye", "Türkiye'de Eğitim", "Учёба в Турции", "Kusoma Türkiye"),
    p("Universities", "الجامعات", "Universités", "Üniversiteler", "Университеты", "Vyuo"),
    p("Services", "الخدمات", "Services", "Hizmetler", "Услуги", "Huduma"),
    p("Partners", "الشركاء", "Partenaires", "Partnerler", "Партнёры", "Washirika"),
    p("About", "من نحن", "À propos", "Hakkımızda", "О нас", "Kutuhusu"),
    p("About us", "من نحن", "À propos de nous", "Hakkımızda", "О нас", "Kutuhusu"),
    p("Medical Tourism", "السياحة العلاجية", "Tourisme médical", "Sağlık Turizmi", "Медицинский туризм", "Utalii wa Matibabu"),
    p("Business Facilitation", "تسهيل الأعمال", "Facilitation des affaires", "İş Kolaylaştırma", "Поддержка бизнеса", "Kurahisisha Biashara"),
    p("Employment Services", "خدمات التوظيف", "Services d'emploi", "İstihdam Hizmetleri", "Услуги трудоустройства", "Huduma za Ajira"),
    p("Educational & Business Tours", "الرحلات التعليمية والتجارية", "Voyages éducatifs et d'affaires", "Eğitim ve İş Turları", "Образовательные и деловые туры", "Safari za Elimu na Biashara"),
    p("Partnerships & Representatives", "الشراكات والممثلون", "Partenariats et représentants", "Partnerlikler ve Temsilciler", "Партнёрства и представители", "Ushirikiano na Wawakilishi"),
    p("University directory", "دليل الجامعات", "Annuaire des universités", "Üniversite rehberi", "Каталог университетов", "Orodha ya vyuo"),
    p("Educational tours", "الرحلات التعليمية", "Voyages éducatifs", "Eğitim turları", "Образовательные туры", "Safari za elimu"),
    p("Employment", "التوظيف", "Emploi", "İstihdam", "Трудоустройство", "Ajira"),
    p("Resources", "المصادر", "Ressources", "Kaynaklar", "Материалы", "Nyenzo"),
    p("Contact", "اتصل", "Contact", "İletişim", "Контакты", "Wasiliana"),
    p("Country representatives", "الممثلون الدوليون", "Représentants pays", "Ülke temsilcileri", "Представители стран", "Wawakilishi wa nchi"),
    p("For universities", "للجامعات", "Pour les universités", "Üniversiteler için", "Для университетов", "Kwa vyuo"),
    p("For hospitals and clinics", "للمستشفيات والعيادات", "Pour les hôpitaux et cliniques", "Hastaneler ve klinikler için", "Для больниц и клиник", "Kwa hospitali na kliniki"),
    p("For chambers of commerce", "لغرف التجارة", "Pour les chambres de commerce", "Ticaret odaları için", "Для торговых палат", "Kwa vyumba vya biashara"),
    p("Your gateway to Türkiye", "بوابتك إلى تركيا", "Votre porte d'entrée en Türkiye", "Türkiye'ye açılan kapınız", "Ваш путь в Турцию", "Lango lako la Türkiye"),

    // Section eyebrows
    p("What we do", "ماذا نفعل", "Ce que nous faisons", "Ne yapıyoruz", "Что мы делаем", "Tunafanya nini"),
    p("Why Türkiye", "لماذا تركيا", "Pourquoi la Türkiye", "Neden Türkiye", "Почему Турция", "Kwa nini Türkiye"),
    p("Scholarships", "المنح الدراسية", "Bourses", "Burslar", "Стипендии", "Ufadhili"),
    p("Student life", "حياة الطالب", "Vie étudiante", "Öğrenci yaşamı", "Студенческая жизнь", "Maisha ya mwanafunzi"),
    p("Application process", "خطوات التقديم", "Processus de candidature", "Başvuru süreci", "Процесс подачи", "Mchakato wa maombi"),
    p("How it works", "كيف تسير الخطوات", "Comment ça marche", "Nasıl işliyor", "Как это работает", "Inafanyaje kazi"),
    p("How to join", "كيف تنضم", "Comment nous rejoindre", "Nasıl katılırsınız", "Как присоединиться", "Jinsi ya kujiunga"),
    p("How we work", "كيف نعمل", "Notre méthode", "Nasıl çalışıyoruz", "Как мы работаем", "Tunafanya kazi vipi"),
    p("Featured universities", "جامعات مختارة", "Universités en vedette", "Öne çıkan üniversiteler", "Избранные университеты", "Vyuo vilivyoangaziwa"),
    p("Questions", "أسئلة", "Questions", "Sorular", "Вопросы", "Maswali"),
    p("Our core service", "خدمتنا الأساسية", "Notre service principal", "Ana hizmetimiz", "Наша основная услуга", "Huduma yetu kuu"),
    p("Other services", "خدمات أخرى", "Autres services", "Diğer hizmetler", "Другие услуги", "Huduma nyingine"),
    p("For institutions", "للمؤسسات", "Pour les institutions", "Kurumlar için", "Для организаций", "Kwa taasisi"),
    p("For agencies and institutions", "للوكالات والمؤسسات", "Pour les agences et institutions", "Acenteler ve kurumlar için", "Для агентств и организаций", "Kwa mawakala na taasisi"),
    p("Partnerships", "الشراكات", "Partenariats", "Partnerlikler", "Партнёрства", "Ushirikiano"),
    p("Registration", "التسجيل", "Inscription", "Kayıt", "Регистрация", "Usajili"),
    p("Application", "الطلب", "Candidature", "Başvuru", "Заявка", "Maombi"),
    p("Earnings", "الأرباح", "Rémunération", "Kazanç", "Доход", "Mapato"),
    p("Who we appoint", "من نعيّن", "Qui nous nommons", "Kimi atıyoruz", "Кого мы назначаем", "Tunachagua nani"),
    p("Indicative prices", "أسعار تقديرية", "Prix indicatifs", "Gösterge fiyatlar", "Ориентировочные цены", "Bei za mwongozo"),
    p("Scope of work", "نطاق العمل", "Périmètre", "İş kapsamı", "Объём работ", "Upeo wa kazi"),
    p("Scope", "النطاق", "Périmètre", "Kapsam", "Объём", "Upeo"),
    p("Covered", "ما نغطيه", "Couvert", "Kapsananlar", "Что покрыто", "Yanayohusika"),
    p("Credentials", "الاعتمادات", "Accréditations", "Belgelerimiz", "Аккредитации", "Vyeti"),
    p("Leadership", "الفريق القيادي", "Direction", "Yönetim", "Руководство", "Uongozi"),
    p("Our story", "قصتنا", "Notre histoire", "Hikâyemiz", "Наша история", "Historia yetu"),
    p("Why we exist", "لماذا نحن هنا", "Pourquoi nous existons", "Neden varız", "Почему мы существуем", "Kwa nini tupo"),
    p("Offices", "المكاتب", "Bureaux", "Ofisler", "Офисы", "Ofisi"),
    p("Head office", "المكتب الرئيسي", "Siège", "Merkez ofis", "Головной офис", "Ofisi kuu"),
    p("Reply times", "أوقات الرد", "Délais de réponse", "Yanıt süreleri", "Время ответа", "Muda wa majibu"),
    p("In their words", "بكلماتهم", "Dans leurs mots", "Kendi sözleriyle", "Их словами", "Kwa maneno yao"),
    p("In this article", "في هذا المقال", "Dans cet article", "Bu yazıda", "В этой статье", "Katika makala hii"),
    p("More resources", "مصادر أخرى", "Plus de ressources", "Daha fazla kaynak", "Ещё материалы", "Nyenzo zaidi"),
    p("Next step", "الخطوة التالية", "Prochaine étape", "Sonraki adım", "Следующий шаг", "Hatua ifuatayo"),
    p("Ready when you are", "جاهزون عندما تكون مستعداً", "Prêts quand vous l'êtes", "Hazır olduğunuzda", "Готовы, когда вы готовы", "Tayari unapokuwa tayari"),
    p("Start here", "ابدأ من هنا", "Commencez ici", "Buradan başlayın", "Начните здесь", "Anza hapa"),
    p("Talk to us", "تحدث إلينا", "Parlez-nous", "Bize danışın", "Свяжитесь с нами", "Zungumza nasi"),
    p("Already a partner", "شريك بالفعل", "Déjà partenaire", "Zaten partner misiniz", "Уже партнёр", "Tayari mshirika"),
    p("Work with us", "اعمل معنا", "Travailler avec nous", "Bizimle çalışın", "Работайте с нами", "Fanya kazi nasi"),
    p("Remember", "تذكّر", "À retenir", "Unutmayın", "Помните", "Kumbuka"),
    p("Filter", "تصفية", "Filtrer", "Filtrele", "Фильтр", "Chuja"),
    p("City", "المدينة", "Ville", "Şehir", "Город", "Jiji"),
    p("Public", "حكومية", "Publique", "Devlet", "Государственный", "Ya umma"),
    p("Private", "خاصة", "Privée", "Vakıf", "Частный", "Ya kibinafsi"),
    p("Scholarship", "منحة", "Bourse", "Burs", "Стипендия", "Ufadhili"),
    p("English-taught", "بالإنجليزية", "Enseigné en anglais", "İngilizce eğitim", "На английском", "Kwa Kiingereza"),
    p("Yearly tuition", "الرسوم السنوية", "Frais annuels", "Yıllık ücret", "Годовая плата", "Gharama ya mwaka"),
    p("Founded", "سنة التأسيس", "Fondée en", "Kuruluş", "Основан", "Ilianzishwa"),
    p("Students", "الطلاب", "Étudiants", "Öğrenci", "Студенты", "Wanafunzi"),
    p("Programs", "البرامج", "Programmes", "Program", "Программы", "Programu"),
    p("Tuition", "الرسوم", "Frais", "Ücret", "Плата", "Gharama"),
    p("Language", "اللغة", "Langue", "Dil", "Язык", "Lugha"),
    p("Education", "التعليم", "Éducation", "Eğitim", "Образование", "Elimu"),
    p("Company", "الشركة", "Société", "Şirket", "Компания", "Kampuni"),
    p("Guide", "دليل", "Guide", "Rehber", "Руководство", "Mwongozo"),
    p("Checklist", "قائمة تحقق", "Liste de contrôle", "Kontrol listesi", "Чек-лист", "Orodha ya ukaguzi"),
    p("Explainer", "شرح", "Explication", "Açıklama", "Разбор", "Ufafanuzi"),
    p("read", "قراءة", "de lecture", "okuma", "чтения", "kusoma"),
  ];

  const PHRASE = new Map(PHRASE_LIST);
  /* Replace longest first so "Study in Türkiye" wins over "Universities". */
  const ORDERED = PHRASE_LIST.map(([en]) => en).sort((a, b) => b.length - a.length);

  const KEYS = {
    EN: {
      dir: "ltr",
      "hero.badge": "Applications open for the 2026 intake", "hero.title": "Study in Türkiye",
      "hero.lead": "Campus Turkey is your gateway to Türkiye. We help students, patients, businesses, workers and partners reach education, healthcare, business and employment opportunities here.",
      "hero.more": "See how it works",
      "home.aboutLead": "Campus Turkey helps students, patients, businesses, workers and partners worldwide reach opportunities in Türkiye.",
      "home.servicesTitle": "Education first, and everything around it",
      "home.servicesLead": "Study in Türkiye is our main service. The rest are here when you need them.",
      "home.uniTitle": "200+ universities, one directory",
      "home.journeyTitle": "Five steps from question to campus",
      "home.faqTitle": "Answers before you ask",
      "cta.apply": "Apply Now", "cta.consult": "Book a Consultation", "cta.whatsapp": "Chat on WhatsApp",
      "cta.contact": "Contact us", "cta.partner": "Become a Partner", "cta.rep": "Become a Representative",
      "cta.browse": "Browse the directory",
      "nav.study": "Study in Türkiye", "nav.universities": "Universities", "nav.services": "Services",
      "nav.partners": "Partners", "nav.about": "About", "nav.menu": "Menu",
      "home.servicesEyebrow": "What we do", "home.uniEyebrow": "Featured universities",
      "home.journeyEyebrow": "How it works", "home.faqEyebrow": "Questions",
      "footer.language": "Language", "footer.education": "Education", "footer.services": "Services", "footer.partners": "Partners", "footer.company": "Company",
    },
    AR: {
      dir: "rtl",
      "hero.badge": "التقديم مفتوح لدفعة 2026", "hero.title": "الدراسة في تركيا",
      "hero.lead": "كامبس تركي هي بوابتك إلى تركيا. نساعد الطلاب والمرضى والشركات والعاملين والشركاء على الوصول إلى فرص التعليم والصحة والأعمال والعمل هنا.",
      "home.aboutLead": "كامبس تركي تساعد الطلاب والمرضى والشركات والعاملين والشركاء حول العالم على الوصول إلى الفرص في تركيا.",
      "home.servicesTitle": "التعليم أولاً، وكل ما يحيط به",
      "home.servicesLead": "الدراسة في تركيا هي خدمتنا الأساسية. الخدمات الأخرى متاحة عند الحاجة.",
      "home.uniTitle": "أكثر من 200 جامعة في دليل واحد",
      "home.journeyTitle": "خمس خطوات من السؤال إلى الحرم الجامعي",
      "home.faqTitle": "أجوبة قبل أن تسأل",
    },
    FR: {
      "hero.badge": "Candidatures ouvertes pour la rentrée 2026", "hero.title": "Étudier en Türkiye",
      "hero.lead": "Campus Turkey est votre porte d'entrée en Türkiye. Nous accompagnons les étudiants, les patients, les entreprises, les travailleurs et les partenaires vers les opportunités d'éducation, de santé, d'affaires et d'emploi.",
      "home.aboutLead": "Campus Turkey aide les étudiants, les patients, les entreprises, les travailleurs et les partenaires du monde entier à saisir les opportunités en Türkiye.",
      "home.servicesTitle": "L'éducation d'abord, et tout ce qui l'entoure",
      "home.servicesLead": "Étudier en Türkiye est notre service principal. Les autres sont là quand vous en avez besoin.",
      "home.uniTitle": "Plus de 200 universités, un seul annuaire",
      "home.journeyTitle": "Cinq étapes, de la question au campus",
      "home.faqTitle": "Les réponses avant vos questions",
    },
    TR: {
      "hero.badge": "2026 dönemi başvuruları açık", "hero.title": "Türkiye'de Eğitim",
      "hero.lead": "Campus Turkey, Türkiye'ye açılan kapınızdır. Öğrencilerin, hastaların, şirketlerin, çalışanların ve partnerlerin buradaki eğitim, sağlık, iş ve istihdam fırsatlarına ulaşmasına yardımcı oluyoruz.",
      "home.aboutLead": "Campus Turkey; dünyanın her yerinden öğrencilerin, hastaların, şirketlerin, çalışanların ve partnerlerin Türkiye'deki fırsatlara ulaşmasına yardımcı olur.",
      "home.servicesTitle": "Önce eğitim, sonra çevresindeki her şey",
      "home.servicesLead": "Türkiye'de eğitim ana hizmetimizdir. Diğerleri ihtiyaç duyduğunuzda burada.",
      "home.uniTitle": "200'den fazla üniversite, tek rehber",
      "home.journeyTitle": "Sorudan kampüse beş adım",
      "home.faqTitle": "Sormadan önce cevaplar",
    },
    RU: {
      "hero.badge": "Приём на 2026 год открыт", "hero.title": "Учёба в Турции",
      "hero.lead": "Campus Turkey это ваш путь в Турцию. Мы помогаем студентам, пациентам, компаниям, работникам и партнёрам получить доступ к образованию, лечению, бизнесу и работе здесь.",
      "home.aboutLead": "Campus Turkey помогает студентам, пациентам, компаниям, работникам и партнёрам со всего мира использовать возможности в Турции.",
      "home.servicesTitle": "Сначала образование, затем всё вокруг него",
      "home.servicesLead": "Учёба в Турции наша основная услуга. Остальные доступны, когда они нужны.",
      "home.uniTitle": "Более 200 университетов в одном каталоге",
      "home.journeyTitle": "Пять шагов от вопроса до кампуса",
      "home.faqTitle": "Ответы до вопросов",
    },
    SW: {
      "hero.badge": "Maombi ya mwaka 2026 yamefunguliwa", "hero.title": "Kusoma Türkiye",
      "hero.lead": "Campus Turkey ni lango lako la Türkiye. Tunasaidia wanafunzi, wagonjwa, wafanyabiashara, wafanyakazi na washirika kupata elimu, matibabu, biashara na ajira hapa.",
      "home.aboutLead": "Campus Turkey inasaidia wanafunzi, wagonjwa, wafanyabiashara, wafanyakazi na washirika duniani kote kupata nafasi katika Türkiye.",
      "home.servicesTitle": "Elimu kwanza, na kila kitu kinachoizunguka",
      "home.servicesLead": "Kusoma Türkiye ni huduma yetu kuu. Nyingine zipo unapozihitaji.",
      "home.uniTitle": "Vyuo 200+, orodha moja",
      "home.journeyTitle": "Hatua tano kutoka swali hadi chuo",
      "home.faqTitle": "Majibu kabla ya kuuliza",
    },
  };

  let current = window.localStorage.getItem("ct-lang") || "EN";
  /* One source of truth: every switcher subscribes, so a change made in the portal
     sidebar is reflected by the navbar and the footer. */
  const subscribers = new Set();

  /* ---------------------------------------------------------------
     Machine translation layer.
     The phrase book above stays as the instant, hand-checked layer for
     navigation and calls to action. Everything else is translated on demand
     and cached in localStorage, so no developer has to key a string by hand
     and the second visit in a language is instant.
     --------------------------------------------------------------- */
  const CODE = { AR: "ar", FR: "fr", TR: "tr", RU: "ru", SW: "sw", ES: "es", PT: "pt", FA: "fa", UR: "ur", HI: "hi", BN: "bn", ID: "id", ZH: "zh-CN", HA: "ha", YO: "yo", IG: "ig" };
  /* Right-to-left scripts. Kept separate from the keyed packs so a language can be
     machine-translated only and still lay out correctly. */
  const RTL = new Set(["AR", "FA", "UR"]);
  const MT = {};      // lang -> { english: translated }
  const PENDING = {}; // lang -> Set of strings in flight
  const QUEUE = [];
  let running = 0, saveTimer = null, sweepTimer = null;

  /* Do not translate: the brand, the country as the brand spells it, official
     institution and city names, people's names, and the exam and accreditation
     acronyms. A directory that renames universities per language is unusable,
     since those names appear on application portals and acceptance letters. */
  const PROTECTED_LITERALS = [
    "Your guide to study in Turkey",
    "Campus Turkey", "Türkiye", "Turkey", "WhatsApp", "Türkiye Bursları",
    "TÖMER", "IELTS", "TOEFL", "JCI", "GDPR", "PhD",
    /* The language control must stay readable in every language. Its aria-label is
       protected too: the text-node guard matches on that label, so translating it
       would erase the guard and freeze the switcher on a stale value. */
    "Change language",
    "EN", "AR", "FR", "TR", "RU", "SW", "ES", "PT", "FA", "UR", "HI", "BN", "ID", "ZH", "HA", "YO", "IG",
    "English", "العربية", "Français", "Türkçe", "Русский", "Kiswahili",
    "Español", "Português", "فارسی", "اردو", "हिन्दी", "বাংলা", "Bahasa Indonesia", "中文", "Hausa", "Yorùbá", "Igbo",
  ];

  let PROTECTED = null;
  const protectedTerms = () => {
    if (PROTECTED) return PROTECTED;
    const set = new Set(PROTECTED_LITERALS);
    const D = window.CT_DATA;
    if (D) {
      (D.universities || []).forEach((u) => { if (u.name) set.add(u.name); if (u.city) set.add(u.city); });
      (D.offices || []).forEach((o) => { if (o.city) set.add(o.city); });
      (D.leadership || []).forEach((p) => { if (p.name) set.add(p.name); });
      (D.testimonials || []).forEach((t) => { if (t.name) set.add(t.name); if (t.country) set.add(t.country); });
      /* Portal identities are agreement-bearing: a translated company name is wrong
         on an invoice in the same way a translated university name is. */
      if (D.portal) {
        const a = D.portal.account || {};
        [a.org, a.person, a.manager, a.territory].forEach((v) => { if (v) set.add(v); });
        (D.portal.students || []).forEach((s) => {
          if (s.name) set.add(s.name);
          if (s.university) set.add(s.university);
        });
      }
    }
    /* Longest first so "Istanbul Technical University" is masked before "Istanbul". */
    PROTECTED = [...set].filter(Boolean).sort((a, b) => b.length - a.length);
    return PROTECTED;
  };

  const isProtected = (s) => protectedTerms().some((p) => p === s);

  const cacheKey = (lang) => "ct-mt2-" + lang;

  const loadCache = (lang) => {
    if (MT[lang]) return MT[lang];
    let store = {};
    try { store = JSON.parse(window.localStorage.getItem(cacheKey(lang)) || "{}"); } catch (e) { store = {}; }
    MT[lang] = store;
    PENDING[lang] = PENDING[lang] || new Set();
    return store;
  };

  /* localStorage has a hard quota and six languages share it, so the cache is
     capped and trimmed oldest-first rather than allowed to grow forever. */
  const CACHE_LIMIT = 3000;

  const saveCache = (lang) => {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const store = MT[lang] || {};
      const keys = Object.keys(store);
      if (keys.length > CACHE_LIMIT) {
        keys.slice(0, keys.length - CACHE_LIMIT).forEach((k) => { delete store[k]; });
      }
      try {
        window.localStorage.setItem(cacheKey(lang), JSON.stringify(store));
      } catch (e) {
        /* Over quota: drop this language's cache and carry on translating live. */
        try { window.localStorage.removeItem(cacheKey(lang)); } catch (e2) { /* noop */ }
      }
    }, 600);
  };

  const scheduleSweep = () => {
    if (sweepTimer) return;
    sweepTimer = window.setTimeout(() => { sweepTimer = null; sweep(); }, 220);
  };

  /* Worth translating? Skip numbers, prices, codes, emails, URLs and
     anything on the protected list. */
  const translatable = (s) => {
    const t = s.trim();
    if (t.length < 4) return false;                 // codes and initials
    if (t.length > 1200) return false;
    if (/^[A-Z]{2,4}$/.test(t)) return false;       // bare language or exam code
    if (!/[A-Za-z]{2}/.test(t)) return false;
    if (/^[\d\s.,:%+$\-·–/]+$/.test(t)) return false;
    if (/@|https?:\/\//.test(t)) return false;
    if (/^\+?\d[\d\s()-]{5,}$/.test(t)) return false;
    if (isProtected(t)) return false;
    return true;
  };

  /* Mask protected terms with sentinels the translator leaves alone, so
     "Campus Turkey is your gateway to Türkiye" survives the round trip. */
  const mask = (text) => {
    const found = [];
    let out = text;
    protectedTerms().forEach((term) => {
      if (out.indexOf(term) === -1) return;
      const token = "XQ" + found.length + "QX";
      found.push(term);
      out = out.split(term).join(token);
    });
    return { text: out, found };
  };

  const unmask = (text, found) => {
    let out = text;
    found.forEach((term, i) => {
      /* The translator may alter spacing or case around the sentinel. */
      out = out.replace(new RegExp("X\\s*Q\\s*" + i + "\\s*Q\\s*X", "gi"), term);
    });
    return out;
  };

  /* ------------------------------------------------------------------------
     CHANGED FROM THE PROTOTYPE. This is the only edit in this file.

     The prototype called translate.googleapis.com directly, with no key. That is
     item 1 of the three blockers in `Developer handoff notes.md`: it is rate
     limited, unversioned, and it posts the page's text to a third party on every
     view, for every visitor, with no agreement covering it.

     The request now goes to your own endpoint, set as VITE_TRANSLATE_ENDPOINT and
     published here as window.CT_TRANSLATE_ENDPOINT. Your server holds the key and
     can cache, rate-limit and log. With no endpoint configured the machine layer
     is inert and the hand-checked phrase book below still covers navigation, calls
     to action, headings and card titles in all six keyed languages.

     Everything else in this file is the prototype's, unchanged.
     --------------------------------------------------------------------- */
  const fetchOne = (text, lang) => {
    const endpoint = window.CT_TRANSLATE_ENDPOINT;
    if (!endpoint) return Promise.resolve(null);
    const tl = CODE[lang];
    const m = mask(text);
    return window.fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strings: [m.text], source: "en", target: tl }),
    }).then((r) => {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then((j) => {
      /* Accept either { strings: [...] } or a bare array, so the route is easy to
         implement against whichever provider you pick. */
      const list = (j && (j.strings || j.translations)) || j;
      const out = Array.isArray(list) ? String(list[0] || "") : "";
      if (!out || !out.trim()) return null;
      const restored = unmask(out, m.found);
      /* If a sentinel survived, the round trip mangled it: keep English. */
      return /XQ\d|X\s*Q\s*\d/i.test(restored) ? null : restored;
    });
  };

  const pump = () => {
    while (running < 6 && QUEUE.length) {
      const job = QUEUE.shift();
      if (job.lang !== current) continue;
      running += 1;
      fetchOne(job.text, job.lang)
        .then((out) => {
          if (out) { MT[job.lang][job.text] = out; saveCache(job.lang); }
          else { MT[job.lang][job.text] = job.text; }
        })
        .catch(() => { /* offline or rate limited: fall back to English */ })
        .then(() => {
          running -= 1;
          PENDING[job.lang].delete(job.text);
          if (job.lang === current) scheduleSweep();
          pump();
        });
    }
  };

  const enqueue = (text, lang) => {
    const store = loadCache(lang);
    if (store[text] !== undefined || PENDING[lang].has(text)) return;
    PENDING[lang].add(text);
    QUEUE.push({ text, lang });
    pump();
  };

  const lookupPhrase = (en) => {
    if (current === "EN") return null;
    const hit = PHRASE.get(en);
    return hit ? hit[current] : null;
  };

  /* Phrase book first (instant, hand-checked), then the machine cache,
     then queue the string and leave English on screen until it lands. */
  const translateText = (raw) => {
    if (current === "EN") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const whole = lookupPhrase(trimmed);
    if (whole) return raw.replace(trimmed, whole);

    if (!translatable(trimmed)) return null;

    const store = loadCache(current);
    const cached = store[trimmed];
    if (cached !== undefined) return cached === trimmed ? null : raw.replace(trimmed, cached);

    enqueue(trimmed, current);

    /* Short labels often embed a known phrase, so cover them meanwhile. */
    if (trimmed.length <= 90) {
      let out = raw, touched = false;
      for (const en of ORDERED) {
        if (en.length < 4 || out.indexOf(en) === -1) continue;
        const rep = lookupPhrase(en);
        if (!rep) continue;
        out = out.split(en).join(rep);
        touched = true;
      }
      if (touched) return out;
    }
    return null;
  };

  const ORIGINAL = new WeakMap();

  const sweep = () => {
    const root = document.body;
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return NodeFilter.FILTER_REJECT;
        /* Never touch the language control itself. */
        if (parent.closest('[data-ct-no-translate],[aria-label="Change language"]')) return NodeFilter.FILTER_REJECT;
        /* The switcher's own labels are ISO codes and endonyms; never rewrite them. */
        if (parent.closest('[data-ct-lang-control]')) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    nodes.forEach((node) => {
      if (!ORIGINAL.has(node)) ORIGINAL.set(node, node.nodeValue);
      const src = ORIGINAL.get(node);
      const next = translateText(src);
      const want = next == null ? src : next;
      if (node.nodeValue !== want) node.nodeValue = want;
    });
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach((el) => {
      ["placeholder", "aria-label", "title"].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const key = "__ct_" + attr;
        if (el[key] === undefined) el[key] = el.getAttribute(attr);
        const next = translateText(el[key]);
        el.setAttribute(attr, next == null ? el[key] : next);
      });
    });
  };

  window.CT_I18N = {
    get lang() { return current; },
    languages: ["EN"].concat(L),
    get pending() { return current === "EN" ? 0 : QUEUE.length + running; },
    set(code) {
      current = code;
      try { window.localStorage.setItem("ct-lang", code); } catch (e) { /* private mode */ }
      if (code !== "EN") loadCache(code);
      const rtl = RTL.has(code);
      document.documentElement.setAttribute("lang", code.toLowerCase());
      document.documentElement.setAttribute("dir", rtl ? "rtl" : "ltr");
      window.requestAnimationFrame(sweep);
      window.setTimeout(sweep, 120);
      subscribers.forEach((fn) => { try { fn(code); } catch (e) { /* a stale subscriber must not block the rest */ } });
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    t(key) {
      const pack = KEYS[current] || {};
      return pack[key] || KEYS.EN[key] || key;
    },
    sweep,
    clearCache(code) {
      const langs = code ? [code] : Object.keys(CODE);
      langs.forEach((l) => {
        delete MT[l];
        try { window.localStorage.removeItem(cacheKey(l)); window.localStorage.removeItem("ct-mt-" + l); } catch (e) { /* noop */ }
      });
    },
  };
  window.T = (key) => window.CT_I18N.t(key);
  window.CT_I18N.set(current);
})();
