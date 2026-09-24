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
  demosEyebrow: string;
  demosTitle: string;
  demosSub: string;
  demos: { id: string; short: string; title: string; body: string; points: string[] }[];
  walkEyebrow: string;
  walkTitle: string;
  walkSub: string;
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
  navHow: "Demos",
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
  heroSecondary: "Watch the demos",
  heroTrust: "Always free · English · Hindi · Marathi",
  trustLabel: "Built for Maharashtra-style circles & pan-India organisers",
  demosEyebrow: "Live product demos",
  demosTitle: "See the real app move — not static screenshots",
  demosSub: "Six guided animations from the Bhishi Circle product. Tap a step, watch the phone.",
  demos: [
    {
      id: "create",
      short: "Create",
      title: "How to create a bhishi",
      body: "Guided wizard from style to hapta order — auction, fixed, lucky draw, sacrifice or loan in a few taps.",
      points: ["Step-by-step setup", "Pot, hands & hapta", "Award-first or collect-first"],
    },
    {
      id: "award",
      short: "Award",
      title: "How to award bhishi",
      body: "Spin the lucky-draw wheel or allot a winner, then move into collect and close with clear books.",
      points: ["Live chitthi wheel", "Fair spin & land", "Change before you close"],
    },
    {
      id: "payments",
      short: "Payments",
      title: "How to record payments",
      body: "Mark cash, UPI or bank against each hand. Expected vs collected stays honest as you go.",
      points: ["One-tap record", "Partial & full hapta", "Cash-on-hand gates"],
    },
    {
      id: "reports",
      short: "Reports",
      title: "How to share reports",
      body: "Day-book PDF and per-receipt slips — share proof to WhatsApp the moment you need it.",
      points: ["Day book PDF", "Receipt PDFs", "Forward-ready proof"],
    },
    {
      id: "members",
      short: "Members",
      title: "How to see members",
      body: "Every seat, remaining balance and WhatsApp invite — swap hands when someone needs to change.",
      points: ["Seat overview", "WhatsApp invites", "Swap hands easily"],
    },
    {
      id: "collections",
      short: "Collections",
      title: "How to see collections",
      body: "Register across groups with cash / UPI splits, member totals and hapta filters.",
      points: ["Cross-group register", "Cash vs UPI", "Filter by day or week"],
    },
  ],
  walkEyebrow: "Full walkthrough",
  walkTitle: "From create to collections — every move on a phone",
  walkSub: "Scroll the story. Each section plays the matching animation inside a freestanding device.",
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
  navHow: "डेमो",
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
  heroSecondary: "डेमो देखें",
  heroTrust: "हमेशा मुफ़्त · अंग्रेज़ी · हिन्दी · मराठी",
  trustLabel: "महाराष्ट्र शैली के वृत्त और भारत भर के आयोजकों के लिए",
  demosEyebrow: "लाइव प्रॉडक्ट डेमो",
  demosTitle: "असली ऐप की हरकत देखें — स्थिर स्क्रीनशॉट नहीं",
  demosSub: "Bhishi Circle से छह गाइडेड एनिमेशन। स्टेप चुनें, फ़ोन में देखें।",
  demos: [
    {
      id: "create",
      short: "बनाएँ",
      title: "भिसी कैसे बनाएँ",
      body: "शैली से हप्ता क्रम तक गाइडेड विज़ार्ड — नीलामी, फिक्स्ड, लकी ड्रॉ, बलिदान या लोन।",
      points: ["स्टेप-बाय-स्टेप सेटअप", "पॉट, हाथ व हप्ता", "अवॉर्ड-फर्स्ट या कलेक्ट-फर्स्ट"],
    },
    {
      id: "award",
      short: "अवॉर्ड",
      title: "भिसी कैसे अवॉर्ड करें",
      body: "लकी-ड्रॉ व्हील घुमाएँ या विजेता चुनें — फिर वसूली और साफ़ बंद।",
      points: ["लाइव चिट्ठी व्हील", "निष्पक्ष स्पिन", "बंद से पहले बदलाव"],
    },
    {
      id: "payments",
      short: "पेमेंट",
      title: "पेमेंट कैसे रिकॉर्ड करें",
      body: "हर हाथ पर कैश, UPI या बैंक मार्क करें। अपेक्षित बनाम वसूली साफ़ रहती है।",
      points: ["वन-टैप रिकॉर्ड", "आंशिक व पूर्ण", "कैश-ऑन-हैंड गेट्स"],
    },
    {
      id: "reports",
      short: "रिपोर्ट",
      title: "रिपोर्ट कैसे शेयर करें",
      body: "डे-बुक PDF और रसीद स्लिप — ज़रूरत होते ही WhatsApp पर।",
      points: ["डे-बुक PDF", "रसीद PDF", "आगे भेजने लायक"],
    },
    {
      id: "members",
      short: "सदस्य",
      title: "सदस्य कैसे देखें",
      body: "हर सीट, बाकी रकम और WhatsApp आमंत्रण — ज़रूरत पर हाथ स्वैप करें।",
      points: ["सीट ओवरव्यू", "WhatsApp आमंत्रण", "आसानी से स्वैप"],
    },
    {
      id: "collections",
      short: "वसूली",
      title: "वसूली कैसे देखें",
      body: "सभी समूहों का रजिस्टर — कैश/UPI विभाजन, सदस्य कुल और फ़िल्टर।",
      points: ["क्रॉस-ग्रुप रजिस्टर", "कैश बनाम UPI", "दिन/सप्ताह फ़िल्टर"],
    },
  ],
  walkEyebrow: "पूरा वॉकथ्रू",
  walkTitle: "बनाएँ से वसूली तक — हर कदम फ़ोन पर",
  walkSub: "स्क्रॉल करें। हर सेक्शन में मैचिंग एनिमेशन चलती है।",
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
  navHow: "डेमो",
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
  heroSecondary: "डेमो पहा",
  heroTrust: "नेहमी मोफत · इंग्रजी · हिंदी · मराठी",
  trustLabel: "महाराष्ट्र शैलीची वर्तुळे आणि भारतभरातील आयोजकांसाठी",
  demosEyebrow: "लाइव्ह प्रॉडक्ट डेमो",
  demosTitle: "खरे अॅप हलताना पहा — स्थिर स्क्रीनशॉट नाही",
  demosSub: "Bhishi Circle मधील सहा गाइडेड अॅनिमेशन. स्टेप निवडा, फोनमध्ये पहा.",
  demos: [
    {
      id: "create",
      short: "तयार",
      title: "भिशी कशी तयार करावी",
      body: "शैली ते हप्ता क्रम — लिलाव, फिक्स्ड, लकी ड्रॉ, बलिदान किंवा कर्ज काही टॅपमध्ये.",
      points: ["स्टेप-बाय-स्टेप सेटअप", "पॉट, हात व हप्ता", "अवॉर्ड-फर्स्ट किंवा कलेक्ट-फर्स्ट"],
    },
    {
      id: "award",
      short: "अवॉर्ड",
      title: "भिशी कशी अवॉर्ड करावी",
      body: "लकी-ड्रॉ चाक फिरवा किंवा विजेता निवडा — नंतर वसुली आणि स्वच्छ बंद.",
      points: ["लाइव्ह चिट्ठी चाक", "निष्पक्ष स्पिन", "बंद होण्यापूर्वी बदला"],
    },
    {
      id: "payments",
      short: "पेमेंट",
      title: "पेमेंट कसे नोंदवावे",
      body: "प्रत्येक हातावर रोख, UPI किंवा बँक मार्क करा. अपेक्षित विरुद्ध वसूल स्पष्ट राहते.",
      points: ["वन-टॅप रेकॉर्ड", "अंशतः व पूर्ण", "कॅश-ऑन-हँड गेट्स"],
    },
    {
      id: "reports",
      short: "अहवाल",
      title: "अहवाल कसे शेअर करावे",
      body: "डे-बुक PDF आणि पावती स्लिप — गरज लागताच WhatsApp वर.",
      points: ["डे-बुक PDF", "पावती PDF", "पुढे पाठवता येणारे"],
    },
    {
      id: "members",
      short: "सदस्य",
      title: "सदस्य कसे पाहावे",
      body: "प्रत्येक सीट, बाकी रक्कम आणि WhatsApp आमंत्रण — गरज असल्यास हात स्वॅप करा.",
      points: ["सीट ओव्हरव्ह्यू", "WhatsApp आमंत्रण", "सुलभ स्वॅप"],
    },
    {
      id: "collections",
      short: "वसुली",
      title: "वसुली कशी पाहावी",
      body: "सर्व गटांचे रजिस्टर — रोख/UPI विभागणी, सदस्य एकूण आणि फिल्टर.",
      points: ["क्रॉस-ग्रुप रजिस्टर", "रोख विरुद्ध UPI", "दिवस/आठवडा फिल्टर"],
    },
  ],
  walkEyebrow: "पूर्ण वॉकथ्रू",
  walkTitle: "तयार करण्यापासून वसुलीपर्यंत — प्रत्येक पाऊल फोनवर",
  walkSub: "स्क्रोल करा. प्रत्येक विभागात जुळणारे अॅनिमेशन चालते.",
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
