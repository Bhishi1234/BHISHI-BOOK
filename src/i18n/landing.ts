import type { GuestLang } from "../lib/uiLang";

export type LandingCopy = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  langTitle: string;
  langHint: string;
  langContinue: string;
  langEn: string;
  langHi: string;
  langMr: string;
  navHow: string;
  navFeatures: string;
  navTypes: string;
  navLogin: string;
  navStart: string;
  navOpenApp: string;
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroSub: string;
  heroCta: string;
  heroSecondary: string;
  heroTrust: string;
  trustLabel: string;
  demoEyebrow: string;
  demoTitle: string;
  demoSub: string;
  demoCards: { title: string; body: string }[];
  flowEyebrow: string;
  flowTitle: string;
  flowSub: string;
  flowItems: { title: string; body: string; points: string[] }[];
  typesEyebrow: string;
  typesTitle: string;
  typesSub: string;
  types: { title: string; body: string; points: string[] }[];
  luckyEyebrow: string;
  luckyTitle: string;
  luckySub: string;
  luckyPoints: string[];
  luckyCta: string;
  toolsEyebrow: string;
  toolsTitle: string;
  toolsSub: string;
  tools: { title: string; body: string }[];
  statsEyebrow: string;
  statsTitle: string;
  statsSub: string;
  stats: { value: string; label: string }[];
  finalTitle: string;
  finalSub: string;
  finalCta: string;
  footerTagline: string;
  footerLegal: string;
  footerLogin: string;
  demoCreate: string;
  demoCollect: string;
  demoAward: string;
  demoReport: string;
};

const en: LandingCopy = {
  metaTitle: "Bhishi Circle — Digital Bhishi & Chit Books for Organisers",
  metaDescription:
    "Free bhishi management: auction, fixed, lucky draw, sacrifice hand and loan groups. Collect hapta, spin the wheel, award pots, share PDF reports in English, Hindi and Marathi.",
  metaKeywords:
    "bhishi app, lucky draw chitthi, auction bhishi, loan bhishi, hapta collection, Marathi bhishi, Hindi chit books, Bhishi Circle",
  langTitle: "Choose your language",
  langHint: "Bhishi Circle works in English, Hindi and Marathi. You can change this anytime.",
  langContinue: "Continue",
  langEn: "English",
  langHi: "हिन्दी",
  langMr: "मराठी",
  navHow: "Product",
  navFeatures: "Features",
  navTypes: "Bhishi types",
  navLogin: "Log in",
  navStart: "Get started",
  navOpenApp: "Open app",
  heroEyebrow: "Bhishi Circle",
  heroTitle: "Clear books built for every",
  heroTitleAccent: "bhishi you run",
  heroSub:
    "Create groups, collect hapta, spin lucky draws, award pots and share PDF proof — one intelligent ledger for organisers who want transparent books.",
  heroCta: "Get started free",
  heroSecondary: "See the product",
  heroTrust: "Always free · English · Hindi · Marathi",
  trustLabel: "Built for Maharashtra-style circles & pan-India organisers",
  demoEyebrow: "Product demo",
  demoTitle: "Everything an organiser needs — on one screen",
  demoSub: "Live home cards, hapta registers and group overviews — captured from the real Bhishi Circle app.",
  demoCards: [
    { title: "Instant group setup", body: "Pick the style, set pot & hands, add members from directory or phonebook." },
    { title: "Hapta that stays honest", body: "Cash, UPI, bank or adjusted — with gates so cash-on-hand never goes negative." },
    { title: "Proof you can forward", body: "Award and loan PDFs share to WhatsApp the moment you close a round." },
  ],
  flowEyebrow: "Workflow",
  flowTitle: "From empty books to a finished cycle",
  flowSub: "Three moments organisers live in every month — each matched to the real screen.",
  flowItems: [
    {
      title: "Create a bhishi",
      body: "Auction, fixed, lucky draw, sacrifice or loan. Set pot, hands, hapta and commission in a guided wizard.",
      points: ["Multi-hand seats with +/−", "Phonebook & directory import", "Member-visible passbooks"],
    },
    {
      title: "Collect every hapta",
      body: "Day-book register across groups. Filter by cash / UPI, search members, download receipt PDFs.",
      points: ["Partial & advance payments", "WhatsApp dues reminders", "Undo when you mistype"],
    },
    {
      title: "Award & close cleanly",
      body: "Overview cards for outstanding, cash on hand and commission — then award with shareable slips.",
      points: ["Award-first or collect-first", "Commission & dividends booked", "PDF via WhatsApp or download"],
    },
  ],
  typesEyebrow: "Bhishi types",
  typesTitle: "Every popular style. One clear ledger.",
  typesSub: "Choose the rules once — Bhishi Circle keeps kasr, dividends, interest and settlement consistent.",
  types: [
    {
      title: "Auction bhishi",
      body: "Members bid a discount (kasr). Collect-first or auction-first peer settlement — both supported.",
      points: ["Winning bid ÷ hands", "Organiser commission", "Kasr as dividends"],
    },
    {
      title: "Fixed / committee",
      body: "Payout follows the hand list you set. Same hapta for everyone, reorder before you start.",
      points: ["Fixed order seats", "Same instalment", "Clear end date"],
    },
    {
      title: "Lucky draw (chitthi)",
      body: "Spin a verified colour wheel among unprized hands — or pick a winner, then share the result card.",
      points: ["Spin the wheel", "Change before close", "Shareable result"],
    },
    {
      title: "Sacrifice hand",
      body: "Early winners leave one full hapta as cash dividends; the last hand takes the full pot.",
      points: ["Early cut → dividends", "Last hand full pot", "Same hapta otherwise"],
    },
    {
      title: "Loan bhishi",
      body: "Disburse from cash on hand with per-loan interest — EMI or principal at end — plus full PDF schedule.",
      points: ["Interest at give or next month", "EMI / balloon principal", "Loan report PDF"],
    },
  ],
  luckyEyebrow: "Lucky draw",
  luckyTitle: "A real chitthi wheel — not a coin flip",
  luckySub:
    "Eligible hands land on a colour wheel. Spin, land, allot, and still change the winner before you close the hapta.",
  luckyPoints: [
    "Only unprized hands on the wheel",
    "Spin animation with fair land",
    "Pick winner directly if needed",
    "Share result card with the group",
  ],
  luckyCta: "Try Bhishi Circle free",
  toolsEyebrow: "Features",
  toolsTitle: "Powerful tools. Seamless experience.",
  toolsSub: "Everything you need to run digital bhishi books with confidence — free.",
  tools: [
    { title: "Hapta collections", body: "Cash, UPI, bank, cheque or adjusted — full, partial or advance." },
    { title: "WhatsApp reach", body: "Invite offline members, nudge dues, share award & loan summaries." },
    { title: "PDF & CSV ledgers", body: "Month dues, receipts, day book, award slips and loan schedules." },
    { title: "Three languages", body: "Run the whole product in English, Hindi or Marathi." },
    { title: "Member visibility", body: "Shared phones see only their bhishi — not your other books." },
    { title: "Always free", body: "Create and run as many groups as you need. No paid plans." },
  ],
  statsEyebrow: "Built for scale",
  statsTitle: "Reliable books organisers can trust",
  statsSub: "From a single family circle to dozens of hands — the same honest ledger.",
  stats: [
    { value: "5", label: "Bhishi styles" },
    { value: "3", label: "Languages" },
    { value: "PDF", label: "Reports & slips" },
    { value: "₹0", label: "Forever free" },
  ],
  finalTitle: "Ready to run this month’s hapta on clear books?",
  finalSub: "Sign up with your mobile number, pick a language, and create your first bhishi in minutes — free.",
  finalCta: "Open Bhishi Circle",
  footerTagline: "Save Together. Grow Together.",
  footerLegal: "Bhishi Circle is a record-keeping utility for organisers. It is not a bank, NBFC or escrow service.",
  footerLogin: "Already have an account? Log in",
  demoCreate: "Create",
  demoCollect: "Collect",
  demoAward: "Award",
  demoReport: "Report",
};

const hi: LandingCopy = {
  ...en,
  metaTitle: "Bhishi Circle — डिजिटल भिसी व चिट बही-खाता",
  metaDescription:
    "मुफ़्त भिसी प्रबंधन: नीलामी, फिक्स्ड, लकी ड्रॉ, बलिदान हाथ और लोन। हप्ता वसूली, व्हील स्पिन, अवॉर्ड, PDF — हिन्दी, अंग्रेज़ी, मराठी।",
  metaKeywords: "भिसी ऐप, लकी ड्रॉ चिट्ठी, नीलामी भिसी, लोन भिसी, हप्ता वसूली, Bhishi Circle",
  langTitle: "अपनी भाषा चुनें",
  langHint: "Bhishi Circle अंग्रेज़ी, हिन्दी और मराठी में चलता है। कभी भी बदल सकते हैं।",
  langContinue: "आगे बढ़ें",
  navHow: "प्रॉडक्ट",
  navFeatures: "सुविधाएँ",
  navTypes: "भिसी प्रकार",
  navLogin: "लॉग इन",
  navStart: "शुरू करें",
  navOpenApp: "ऐप खोलें",
  heroEyebrow: "Bhishi Circle",
  heroTitle: "हर भिसी के लिए",
  heroTitleAccent: "साफ़ किताबें",
  heroSub:
    "समूह बनाएँ, हप्ता वसूलें, लकी ड्रॉ घुमाएँ, पॉट अवॉर्ड करें और PDF प्रमाण भेजें — आयोजकों के लिए एक पारदर्शी लेजर।",
  heroCta: "मुफ़्त शुरू करें",
  heroSecondary: "प्रॉडक्ट देखें",
  heroTrust: "हमेशा मुफ़्त · अंग्रेज़ी · हिन्दी · मराठी",
  trustLabel: "महाराष्ट्र शैली के वृत्त और भारत भर के आयोजकों के लिए",
  demoEyebrow: "प्रॉडक्ट डेमो",
  demoTitle: "आयोजक को जो चाहिए — एक स्क्रीन पर",
  demoSub: "लाइव होम कार्ड, हप्ता रजिस्टर और समूह ओवरव्यू — असली Bhishi Circle ऐप से।",
  demoCards: [
    { title: "तुरंत समूह सेटअप", body: "शैली चुनें, पॉट व हाथ सेट करें, डायरेक्टरी या फोनबुक से सदस्य जोड़ें।" },
    { title: "ईमानदार हप्ता", body: "कैश, UPI, बैंक या एडजस्टेड — गेट्स से कैश-ऑन-हैंड ऋण नहीं होता।" },
    { title: "आगे भेजने लायक प्रमाण", body: "अवॉर्ड/लोन PDF राउंड बंद होते ही WhatsApp पर।" },
  ],
  flowEyebrow: "वर्कफ़्लो",
  flowTitle: "खाली किताब से पूरे चक्र तक",
  flowSub: "तीन पल जो हर महीने आते हैं — हर एक असली स्क्रीन से मिलाया गया।",
  flowItems: [
    {
      title: "भिसी बनाएँ",
      body: "नीलामी, फिक्स्ड, लकी ड्रॉ, बलिदान या लोन। गाइडेड विज़ार्ड में पॉट, हाथ, हप्ता, कमीशन।",
      points: ["+/− से मल्टी-हैंड", "फोनबुक व डायरेक्टरी", "सदस्य-दृश्य पासबुक"],
    },
    {
      title: "हर हप्ता वसूलें",
      body: "सभी समूहों का डे-बुक। कैश/UPI फ़िल्टर, सदस्य खोज, रसीद PDF।",
      points: ["आंशिक व एडवांस", "WhatsApp रिमाइंडर", "गलती पर अनडू"],
    },
    {
      title: "अवॉर्ड व साफ़ बंद",
      body: "बकाया, कैश-ऑन-हैंड, कमीशन कार्ड — फिर शेयर करने योग्य स्लिप।",
      points: ["अवॉर्ड-फर्स्ट या कलेक्ट-फर्स्ट", "कमीशन व डिविडेंड", "WhatsApp या PDF"],
    },
  ],
  typesEyebrow: "भिसी प्रकार",
  typesTitle: "हर लोकप्रिय शैली। एक साफ़ लेजर।",
  typesSub: "नियम एक बार चुनें — कसर, डिविडेंड, ब्याज और सेटलमेंट सुसंगत रहें।",
  types: [
    {
      title: "नीलामी भिसी",
      body: "सदस्य कसर बोली लगाते हैं। कलेक्ट-फर्स्ट या ऑक्शन-फर्स्ट — दोनों।",
      points: ["बोली ÷ हाथ", "आयोजक कमीशन", "कसर डिविडेंड"],
    },
    {
      title: "फिक्स्ड / कमिटी",
      body: "पॉट हाथ सूची के क्रम से। सबका एक हप्ता, शुरू से पहले क्रम बदलें।",
      points: ["फिक्स्ड क्रम", "एक किस्त", "स्पष्ट समाप्ति"],
    },
    {
      title: "लकी ड्रॉ (चिट्ठी)",
      body: "अप्राइज़्ड हाथों पर रंगीन व्हील घुमाएँ — या सीधे चुनें, परिणाम शेयर करें।",
      points: ["व्हील स्पिन", "बंद से पहले बदलाव", "शेयर कार्ड"],
    },
    {
      title: "बलिदान हाथ",
      body: "शुरुआती विजेता एक पूरा हप्ता डिविडेंड छोड़ते हैं; अंतिम हाथ पूरा पॉट लेता है।",
      points: ["शुरुआती कट → डिविडेंड", "अंतिम हाथ पूरा पॉट", "बाकी समान हप्ता"],
    },
    {
      title: "लोन भिसी",
      body: "कैश-ऑन-हैंड से लोन, प्रति-लोन ब्याज — EMI या अंत में मूल — पूरी PDF सारणी।",
      points: ["ब्याज तुरंत या अगले महीने", "EMI / बल्लून", "लोन रिपोर्ट PDF"],
    },
  ],
  luckyEyebrow: "लकी ड्रॉ",
  luckyTitle: "असली चिट्ठी व्हील — सिक्का नहीं",
  luckySub: "योग्य हाथ रंगीन व्हील पर। स्पिन, लैंड, आवंटन — हप्ता बंद करने से पहले विजेता बदल सकते हैं।",
  luckyPoints: [
    "केवल अप्राइज़्ड हाथ",
    "निष्पक्ष लैंड के साथ स्पिन",
    "ज़रूरत हो तो सीधे चुनें",
    "समूह के साथ परिणाम कार्ड",
  ],
  luckyCta: "Bhishi Circle मुफ़्त आज़माएँ",
  toolsEyebrow: "सुविधाएँ",
  toolsTitle: "शक्तिशाली टूल। सहज अनुभव।",
  toolsSub: "डिजिटल भिसी किताबें चलाने के लिए जो चाहिए — मुफ़्त।",
  tools: [
    { title: "हप्ता वसूली", body: "कैश, UPI, बैंक, चेक या एडजस्टेड — पूर्ण, आंशिक या एडवांस।" },
    { title: "WhatsApp पहुँच", body: "ऑफ़लाइन सदस्यों को आमंत्रित करें, बकाया याद दिलाएँ, सारांश भेजें।" },
    { title: "PDF व CSV लेजर", body: "मासिक बकाया, रसीद, डे-बुक, अवॉर्ड स्लिप और लोन शेड्यूल।" },
    { title: "तीन भाषाएँ", body: "पूरा उत्पाद अंग्रेज़ी, हिन्दी या मराठी में।" },
    { title: "सदस्य दृश्यता", body: "साझा फ़ोन केवल अपनी भिसी देखते हैं।" },
    { title: "हमेशा मुफ़्त", body: "जितनी चाहें समूह — कोई पेड प्लान नहीं।" },
  ],
  statsEyebrow: "स्केल के लिए",
  statsTitle: "भरोसेमंद किताबें",
  statsSub: "एक परिवार वृत्त से दर्जनों हाथ तक — वही ईमानदार लेजर।",
  stats: [
    { value: "5", label: "भिसी शैलियाँ" },
    { value: "3", label: "भाषाएँ" },
    { value: "PDF", label: "रिपोर्ट व स्लिप" },
    { value: "₹0", label: "हमेशा मुफ़्त" },
  ],
  finalTitle: "इस महीने का हप्ता साफ़ किताबों पर?",
  finalSub: "मोबाइल से साइन अप करें, भाषा चुनें, मिनटों में पहली भिसी — मुफ़्त।",
  finalCta: "Bhishi Circle खोलें",
  footerTagline: "एक साथ बचत। एक साथ विकास।",
  footerLegal: "Bhishi Circle आयोजकों के लिए रिकॉर्ड-कीपिंग उपयोगिता है। यह बैंक, NBFC या एस्क्रो नहीं है।",
  footerLogin: "पहले से खाता है? लॉग इन करें",
  demoCreate: "बनाएँ",
  demoCollect: "वसूली",
  demoAward: "अवॉर्ड",
  demoReport: "रिपोर्ट",
};

const mr: LandingCopy = {
  ...en,
  metaTitle: "Bhishi Circle — डिजिटल भिशी व चिट वही-खाते",
  metaDescription:
    "मोफत भिशी व्यवस्थापन: लिलाव, फिक्स्ड, लकी ड्रॉ, बलिदान हात आणि कर्ज. हप्ता वसुली, चाक फिरवा, अवॉर्ड, PDF — मराठी, हिंदी, इंग्रजी.",
  metaKeywords: "भिशी अॅप, लकी ड्रॉ चिट्ठी, लिलाव भिशी, कर्ज भिशी, हप्ता वसुली, Bhishi Circle",
  langTitle: "तुमची भाषा निवडा",
  langHint: "Bhishi Circle इंग्रजी, हिंदी आणि मराठीत चालते. कधीही बदलू शकता.",
  langContinue: "पुढे जा",
  navHow: "प्रॉडक्ट",
  navFeatures: "वैशिष्ट्ये",
  navTypes: "भिशी प्रकार",
  navLogin: "लॉग इन",
  navStart: "सुरू करा",
  navOpenApp: "अॅप उघडा",
  heroEyebrow: "Bhishi Circle",
  heroTitle: "प्रत्येक भिशीसाठी",
  heroTitleAccent: "स्वच्छ वही",
  heroSub:
    "गट तयार करा, हप्ता वसूल करा, लकी ड्रॉ फिरवा, पॉट अवॉर्ड करा आणि PDF पुरावा पाठवा — आयोजकांसाठी पारदर्शक लेजर.",
  heroCta: "मोफत सुरू करा",
  heroSecondary: "प्रॉडक्ट पहा",
  heroTrust: "नेहमी मोफत · इंग्रजी · हिंदी · मराठी",
  trustLabel: "महाराष्ट्र शैलीची वर्तुळे आणि भारतभरातील आयोजकांसाठी",
  demoEyebrow: "प्रॉडक्ट डेमो",
  demoTitle: "आयोजकाला हवे ते — एका स्क्रीनवर",
  demoSub: "लाइव्ह होम कार्ड, हप्ता रजिस्टर आणि गट ओव्हरव्ह्यू — खऱ्या Bhishi Circle अॅपमधून.",
  demoCards: [
    { title: "त्वरित गट सेटअप", body: "शैली निवडा, पॉट व हात सेट करा, डिरेक्टरी किंवा फोनबुकमधून सदस्य जोडा." },
    { title: "प्रामाणिक हप्ता", body: "रोख, UPI, बँक किंवा अॅडजस्टेड — गेट्सने कॅश-ऑन-हँड ऋण होत नाही." },
    { title: "पुढे पाठवता येणारा पुरावा", body: "अवॉर्ड/कर्ज PDF राउंड बंद होताच WhatsApp वर." },
  ],
  flowEyebrow: "वर्कफ्लो",
  flowTitle: "रिकाम्या वहीपासून पूर्ण चक्रापर्यंत",
  flowSub: "दर महिन्याचे तीन क्षण — प्रत्येक खऱ्या स्क्रीनशी जुळवलेला.",
  flowItems: [
    {
      title: "भिशी तयार करा",
      body: "लिलाव, फिक्स्ड, लकी ड्रॉ, बलिदान किंवा कर्ज. गाइडेड विझार्डमध्ये पॉट, हात, हप्ता, कमिशन.",
      points: ["+/− मल्टी-हँड", "फोनबुक व डिरेक्टरी", "सदस्य-दृश्य पासबुक"],
    },
    {
      title: "प्रत्येक हप्ता वसूल करा",
      body: "सर्व गटांचे डे-बुक. रोख/UPI फिल्टर, सदस्य शोध, पावती PDF.",
      points: ["अंशतः व अॅडव्हान्स", "WhatsApp रिमाइंडर", "चूक झाली तर अनडू"],
    },
    {
      title: "अवॉर्ड व स्वच्छ बंद",
      body: "थकबाकी, कॅश-ऑन-हँड, कमिशन कार्ड — नंतर शेअर करता येणारी स्लिप.",
      points: ["अवॉर्ड-फर्स्ट किंवा कलेक्ट-फर्स्ट", "कमिशन व डिव्हिडंड", "WhatsApp किंवा PDF"],
    },
  ],
  typesEyebrow: "भिशी प्रकार",
  typesTitle: "प्रत्येक लोकप्रिय शैली. एक स्वच्छ लेजर.",
  typesSub: "नियम एकदा निवडा — कसर, डिव्हिडंड, व्याज आणि सेटलमेंट सुसंगत राहतील.",
  types: [
    {
      title: "लिलाव भिशी",
      body: "सदस्य कसर बोली लावतात. कलेक्ट-फर्स्ट किंवा ऑक्शन-फर्स्ट — दोन्ही.",
      points: ["बोली ÷ हात", "आयोजक कमिशन", "कसर डिव्हिडंड"],
    },
    {
      title: "फिक्स्ड / कमिटी",
      body: "पॉट हात यादीच्या क्रमाने. सर्वांना समान हप्ता, सुरू होण्यापूर्वी क्रम बदला.",
      points: ["फिक्स्ड क्रम", "समान हप्ता", "स्पष्ट समाप्ती"],
    },
    {
      title: "लकी ड्रॉ (चिट्ठी)",
      body: "अप्राइज्ड हातांवर रंगीत चाक फिरवा — किंवा थेट निवडा, निकाल शेअर करा.",
      points: ["चाक फिरवा", "बंद होण्यापूर्वी बदला", "शेअर कार्ड"],
    },
    {
      title: "बलिदान हात",
      body: "सुरुवातीचे विजेते एक पूर्ण हप्ता डिव्हिडंड सोडतात; शेवटचा हात पूर्ण पॉट घेतो.",
      points: ["सुरुवातीची कपात → डिव्हिडंड", "शेवटचा हात पूर्ण पॉट", "इतरत्र समान हप्ता"],
    },
    {
      title: "कर्ज भिशी",
      body: "कॅश-ऑन-हँडमधून कर्ज, प्रति-कर्ज व्याज — EMI किंवा शेवटी मुद्दल — पूर्ण PDF वेळापत्रक.",
      points: ["व्याज लगेच किंवा पुढच्या महिन्यात", "EMI / बल्लून", "कर्ज अहवाल PDF"],
    },
  ],
  luckyEyebrow: "लकी ड्रॉ",
  luckyTitle: "खरे चिट्ठी चाक — नाणे नाही",
  luckySub: "पात्र हात रंगीत चाकावर. फिरवा, लँड, वाटप — हप्ता बंद होण्यापूर्वी विजेता बदलता येतो.",
  luckyPoints: [
    "फक्त अप्राइज्ड हात",
    "निष्पक्ष लँडसह स्पिन",
    "गरज असल्यास थेट निवडा",
    "गटासाठी निकाल कार्ड",
  ],
  luckyCta: "Bhishi Circle मोफत वापरून पहा",
  toolsEyebrow: "वैशिष्ट्ये",
  toolsTitle: "शक्तिशाली साधने. सहज अनुभव.",
  toolsSub: "डिजिटल भिशी वह्या चालवण्यासाठी जे हवे — मोफत.",
  tools: [
    { title: "हप्ता वसुली", body: "रोख, UPI, बँक, चेक किंवा अॅडजस्टेड — पूर्ण, अंशतः किंवा अॅडव्हान्स." },
    { title: "WhatsApp पोहोच", body: "ऑफलाइन सदस्यांना आमंत्रित करा, थकबाकी आठवा, सारांश पाठवा." },
    { title: "PDF व CSV लेजर", body: "महिन्याची थकबाकी, पावती, डे-बुक, अवॉर्ड स्लिप आणि कर्ज वेळापत्रक." },
    { title: "तीन भाषा", body: "संपूर्ण उत्पादन इंग्रजी, हिंदी किंवा मराठीत." },
    { title: "सदस्य दृश्यमानता", body: "सामायिक फोन फक्त त्यांची भिशी पाहतात." },
    { title: "नेहमी मोफत", body: "जितके हवे तितके गट — पेड योजना नाही." },
  ],
  statsEyebrow: "स्केलसाठी",
  statsTitle: "विश्वासार्ह वही",
  statsSub: "एका कुटुंबीय वर्तुळापासून डझनभर हातांपर्यंत — तोच प्रामाणिक लेजर.",
  stats: [
    { value: "5", label: "भिशी शैली" },
    { value: "3", label: "भाषा" },
    { value: "PDF", label: "अहवाल व स्लिप" },
    { value: "₹0", label: "नेहमी मोफत" },
  ],
  finalTitle: "या महिन्याचा हप्ता स्वच्छ वहीवर?",
  finalSub: "मोबाइलने साइन अप करा, भाषा निवडा, मिनिटांत पहिली भिशी — मोफत.",
  finalCta: "Bhishi Circle उघडा",
  footerTagline: "एकत्र बचत. एकत्र वाढ.",
  footerLegal: "Bhishi Circle आयोजकांसाठी रेकॉर्ड-कीपिंग उपयुक्तता आहे. ही बँक, NBFC किंवा एस्क्रो नाही.",
  footerLogin: "आधीच खाते आहे? लॉग इन करा",
  demoCreate: "तयार करा",
  demoCollect: "वसुली",
  demoAward: "अवॉर्ड",
  demoReport: "अहवाल",
};

export const LANDING: Record<GuestLang, LandingCopy> = { en, hi, mr };

export function landingCopy(lang: GuestLang): LandingCopy {
  return LANDING[lang] || en;
}
