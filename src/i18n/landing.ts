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
  navHowItWorks: string;
  navLogin: string;
  navStart: string;
  navOpenApp: string;
  heroBrand: string;
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
  howEyebrow: string;
  howTitle: string;
  howSub: string;
  howSteps: { title: string; body: string }[];
  forWhomEyebrow: string;
  forWhomTitle: string;
  forWhomSub: string;
  forWhom: { title: string; body: string }[];
  compareEyebrow: string;
  compareTitle: string;
  compareSub: string;
  compareBeforeTitle: string;
  compareAfterTitle: string;
  compareBefore: string[];
  compareAfter: string[];
  faqEyebrow: string;
  faqTitle: string;
  faqSub: string;
  faq: { q: string; a: string }[];
  stats: { value: string; label: string }[];
  finalTitle: string;
  finalSub: string;
  finalCta: string;
  footerTagline: string;
  footerLegal: string;
  footerCopyright: string;
  footerTerms: string;
  footerPrivacy: string;
  footerContact: string;
  footerLogin: string;
  demoCollect: string;
  legalNavBack: string;
  termsTitle: string;
  termsUpdated: string;
  termsSections: { heading: string; body: string[] }[];
  privacyTitle: string;
  privacyUpdated: string;
  privacySections: { heading: string; body: string[] }[];
  contactTitle: string;
  contactSub: string;
  contactEmailLabel: string;
  contactEmail: string;
  contactWhatsAppLabel: string;
  contactWhatsApp: string;
  contactFormName: string;
  contactFormEmail: string;
  contactFormMessage: string;
  contactFormSubmit: string;
  contactNote: string;
};

const TERMS_EN: LandingCopy["termsSections"] = [
  {
    heading: "1. About Bhishi Circle",
    body: [
      "Bhishi Circle is a digital bookkeeping product for organisers of rotating savings and credit associations (ROSCAs), commonly called bhishi, chit, committee, or similar group savings circles in India.",
      "We provide software to record groups, members (hands), hapta collections, awards, lucky draws, loans within a circle, and shareable PDF reports. Bhishi Circle is free to use.",
    ],
  },
  {
    heading: "2. Not a financial institution",
    body: [
      "Bhishi Circle is not a bank, NBFC, payment system, escrow agent, or trustee. We do not hold member money, settle payouts, guarantee collections, or underwrite credit.",
      "All cash, UPI, bank, or other transfers happen outside the app between organisers and members. Records in the app are organiser-managed ledgers only.",
    ],
  },
  {
    heading: "3. Your account",
    body: [
      "You must provide accurate registration details (typically a mobile number) and keep your login credentials confidential.",
      "You are responsible for activity under your account and for the accuracy of the books you maintain for your groups.",
    ],
  },
  {
    heading: "4. Acceptable use",
    body: [
      "Use Bhishi Circle only for lawful record-keeping of genuine group savings circles you organise or assist.",
      "Do not misuse the service to deceive members, launder funds, harass others, scrape or attack our systems, or violate applicable Indian law.",
    ],
  },
  {
    heading: "5. Organiser responsibility",
    body: [
      "As organiser, you decide group rules, member lists, hapta amounts, awards, and what you share with members (including WhatsApp messages and PDFs generated from your data).",
      "Members who access shared or invite views see only the bhishi you expose to them — you remain responsible for consent and fair disclosure within your circle.",
    ],
  },
  {
    heading: "6. Languages & availability",
    body: [
      "The product is offered in English, Hindi, and Marathi. Features and translations may improve over time.",
      "We aim for reliable uptime but do not guarantee uninterrupted access. Planned maintenance or outages may occur.",
    ],
  },
  {
    heading: "7. Intellectual property",
    body: [
      "Bhishi Circle branding, software, and documentation remain our property. You retain rights to the data you enter about your groups and members.",
    ],
  },
  {
    heading: "8. Disclaimer & limitation",
    body: [
      "The service is provided “as is” for bookkeeping convenience. We are not liable for disputes between members, missed collections, incorrect entries you make, or losses arising from reliance on the app as a substitute for legal or financial advice.",
      "To the extent permitted by law, our aggregate liability related to the service is limited to ₹1,000.",
    ],
  },
  {
    heading: "9. Changes & contact",
    body: [
      "We may update these Terms. Continued use after changes means you accept the revised Terms.",
      "Questions: support@bhishicircle.in",
    ],
  },
];

const PRIVACY_EN: LandingCopy["privacySections"] = [
  {
    heading: "1. Who we are",
    body: [
      "Bhishi Circle (“we”, “us”) operates a free ROSCA / bhishi bookkeeping web and mobile experience for organisers in India. This Privacy Policy explains what we collect and how we use it.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "Account data: mobile number, optional profile name, language preference, and authentication tokens.",
      "Group data you enter: bhishi names, styles, hapta schedules, member names and phone numbers, payment marks, awards, lucky-draw outcomes, loan notes, and generated reports.",
      "Technical data: device/browser type, approximate logs needed for security and reliability (IP, timestamps), and crash diagnostics where available.",
    ],
  },
  {
    heading: "3. How we use information",
    body: [
      "To provide and improve the ledger, sync your books across devices, send transactional messages you trigger (for example WhatsApp invite text you choose to share), and keep the service secure.",
      "We do not sell your personal data. We do not use member ledgers for third-party advertising.",
    ],
  },
  {
    heading: "4. Sharing",
    body: [
      "We use trusted infrastructure providers (hosting, database, authentication) strictly to run the product.",
      "When you share a PDF, invite link, or message, that content leaves our control under your direction. Shared member views show only what you expose for that bhishi.",
      "We may disclose information if required by Indian law or to protect the service against abuse.",
    ],
  },
  {
    heading: "5. Retention & security",
    body: [
      "We retain account and group data while your account is active and for a reasonable period afterward for backup and dispute handling, unless you request deletion where feasible.",
      "We apply industry-standard safeguards; no method of transmission or storage is perfectly secure.",
    ],
  },
  {
    heading: "6. Your choices",
    body: [
      "You may update profile and language settings in the app, export or share reports you generate, and contact us to correct or delete account data subject to operational and legal limits.",
      "If you store other people’s phone numbers or names, you are responsible for having a lawful basis to do so (typically your relationship as organiser).",
    ],
  },
  {
    heading: "7. Children",
    body: [
      "Bhishi Circle is intended for adult organisers. Do not use the service to collect data about children under 18 for group membership without appropriate guardian consent.",
    ],
  },
  {
    heading: "8. Contact",
    body: [
      "Privacy questions: support@bhishicircle.in",
      "We may update this Policy; the “Last updated” date above will change when we do.",
    ],
  },
];

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
  navHow: "Preview",
  navFeatures: "Features",
  navTypes: "Types",
  navHowItWorks: "How it works",
  navLogin: "Log in",
  navStart: "Get started",
  navOpenApp: "Open app",
  heroBrand: "Bhishi Circle",
  heroTitle: "Clear books for every",
  heroTitleAccent: "bhishi you run",
  heroSub:
    "Create groups, collect hapta, spin lucky draws, award pots and share PDF proof — one ledger for transparent organisers.",
  heroCta: "Get started free",
  heroSecondary: "How it works",
  heroTrust: "Always free · English · Hindi · Marathi",
  trustLabel: "Trusted by organisers running Maharashtra-style circles across India",
  demosEyebrow: "Platform preview",
  demosTitle: "Experience a ledger that feels effortless to use",
  demosSub: "Two short recordings from the real Bhishi Circle app — create a group, then award a pot.",
  demos: [
    {
      id: "create",
      short: "Create",
      title: "How to create a bhishi",
      body: "Guided wizard from style to hapta order — auction, fixed, lucky draw, sacrifice or loan.",
      points: ["Step-by-step setup", "Pot, hands & hapta", "Award-first or collect-first"],
    },
    {
      id: "award",
      short: "Award",
      title: "How to award bhishi",
      body: "Spin the lucky-draw wheel or allot a winner, then collect and close with clear books.",
      points: ["Live chitthi wheel", "Fair spin & land", "Change before you close"],
    },
    {
      id: "payments",
      short: "Payments",
      title: "How to record payments",
      body: "Mark cash, UPI or bank against each hand. Expected vs collected stays honest.",
      points: ["One-tap record", "Partial & full hapta", "Cash-on-hand gates"],
    },
    {
      id: "reports",
      short: "Reports",
      title: "How to share reports",
      body: "Day-book PDF and receipt slips — share proof on WhatsApp when you need it.",
      points: ["Day book PDF", "Receipt PDFs", "Forward-ready proof"],
    },
    {
      id: "members",
      short: "Members",
      title: "How to see members",
      body: "Every seat, remaining balance and WhatsApp invite — swap hands when needed.",
      points: ["Seat overview", "WhatsApp invites", "Swap hands easily"],
    },
    {
      id: "collections",
      short: "Collections",
      title: "How to see collections",
      body: "Register across groups with cash / UPI splits, member totals and filters.",
      points: ["Cross-group register", "Cash vs UPI", "Filter by day or week"],
    },
  ],
  typesEyebrow: "Bhishi types",
  typesTitle: "Every popular style. One ledger.",
  typesSub: "Choose the rules once — kasr, dividends, interest and settlement stay consistent.",
  types: [
    {
      title: "Auction bhishi",
      body: "Members bid a discount (kasr). Collect-first or auction-first peer settlement — both supported.",
      points: ["Winning bid ÷ hands", "Organiser commission", "Kasr as dividends"],
    },
    {
      title: "Fixed / committee",
      body: "Payout follows the hand list you set. Same hapta for everyone; reorder before you start.",
      points: ["Fixed order seats", "Same instalment", "Clear end date"],
    },
    {
      title: "Lucky draw (chitthi)",
      body: "Spin a colour wheel among unprized hands — or pick a winner, then share the result.",
      points: ["Spin the wheel", "Change before close", "Shareable result"],
    },
    {
      title: "Sacrifice hand",
      body: "Early winners leave one full hapta as cash dividends; the last hand takes the full pot.",
      points: ["Early cut → dividends", "Last hand full pot", "Same hapta otherwise"],
    },
    {
      title: "Loan bhishi",
      body: "Disburse from cash on hand with per-loan interest — EMI or principal at end — plus PDF schedule.",
      points: ["Interest at give or next month", "EMI / balloon principal", "Loan report PDF"],
    },
  ],
  luckyEyebrow: "Lucky draw",
  luckyTitle: "A real chitthi wheel — not a coin flip",
  luckySub:
    "Eligible hands land on a colour wheel. Spin, allot, and still change the winner before you close the hapta.",
  luckyPoints: [
    "Only unprized hands on the wheel",
    "Spin animation with fair land",
    "Pick winner directly if needed",
    "Share result card with the group",
  ],
  luckyCta: "Try Bhishi Circle free",
  toolsEyebrow: "Core features",
  toolsTitle: "Everything you need to stay in full control",
  toolsSub: "Collections, WhatsApp reach, PDFs and three languages — in one clean ledger.",
  tools: [
    { title: "Hapta collections", body: "Cash, UPI, bank, cheque or adjusted — full, partial or advance." },
    { title: "WhatsApp reach", body: "Invite offline members, nudge dues, share award & loan summaries." },
    { title: "PDF & CSV ledgers", body: "Month dues, receipts, day book, award slips and loan schedules." },
    { title: "Three languages", body: "Run the whole product in English, Hindi or Marathi." },
    { title: "Member visibility", body: "Shared phones see only their bhishi — not your other books." },
  ],
  howEyebrow: "How it works",
  howTitle: "Four steps to clear books",
  howSub: "From first group to shared proof — without spreadsheets.",
  howSteps: [
    { title: "Create your bhishi", body: "Pick style, pot, hands and hapta order in a short wizard." },
    { title: "Collect hapta", body: "Mark each hand paid — cash, UPI or bank — with honest totals." },
    { title: "Award the pot", body: "Auction, fixed seat, sacrifice, loan or spin the lucky wheel." },
    { title: "Share the proof", body: "Send day-book and receipt PDFs so the circle stays aligned." },
  ],
  forWhomEyebrow: "Who it’s for",
  forWhomTitle: "Built for people who actually run the circle",
  forWhomSub: "Whether you organise one society committee or a dozen neighbourhood groups.",
  forWhom: [
    {
      title: "Society & office organisers",
      body: "Keep hapta, awards and loan notes in one place your members can trust.",
    },
    {
      title: "Family & neighbourhood circles",
      body: "Replace paper notebooks and scattered WhatsApp chats with a shared ledger.",
    },
    {
      title: "Multi-group bookkeepers",
      body: "Run auction, fixed, lucky, sacrifice and loan styles without juggling sheets.",
    },
  ],
  compareEyebrow: "Built for trust",
  compareTitle: "Built to protect what your circle cares about",
  compareSub: "Same circle rules — far less confusion when someone asks “who paid?”",
  compareBeforeTitle: "Typical notebook / chat",
  compareAfterTitle: "With Bhishi Circle",
  compareBefore: [
    "Hapta marks lost across diaries and chats",
    "Award disputes with no shareable proof",
    "Lucky draw felt unfair or hard to explain",
    "Loan EMIs tracked on separate scraps",
  ],
  compareAfter: [
    "Every hand, hapta and mode in one register",
    "Day-book & receipt PDFs you can forward",
    "Visible wheel spin with change-before-close",
    "Interest and schedules inside the same bhishi",
  ],
  faqEyebrow: "Trust",
  faqTitle: "Straightforward answers",
  faqSub: "What organisers ask before they move their books.",
  faq: [
    {
      q: "Is Bhishi Circle really free?",
      a: "Yes. Create and run as many groups as you need. There are no paid plans or upgrade walls.",
    },
    {
      q: "Do you hold our group’s money?",
      a: "No. We are a record-keeping utility only — not a bank, NBFC or escrow. Transfers stay between you and members.",
    },
    {
      q: "Which languages are supported?",
      a: "English, Hindi and Marathi across the product, including reports where available.",
    },
    {
      q: "Can members see my other groups?",
      a: "Shared or invite views show only the bhishi you expose. Your other books stay private to you.",
    },
    {
      q: "Does it work on phone and desktop?",
      a: "Yes. Use Bhishi Circle in the browser on mobile or desktop. The same login keeps your books in sync.",
    },
    {
      q: "What about auction kasr and loan interest?",
      a: "Auction supports collect-first and auction-first settlement. Loan bhishi tracks interest, EMI or balloon principal, and printable schedules.",
    },
  ],
  stats: [
    { value: "5", label: "Bhishi styles" },
    { value: "3", label: "Languages" },
    { value: "PDF", label: "Reports & slips" },
    { value: "₹0", label: "Forever free" },
  ],
  finalTitle: "Run this month’s hapta on clear books",
  finalSub: "Sign up with your mobile number, pick a language, and create your first bhishi in minutes.",
  finalCta: "Open Bhishi Circle",
  footerTagline: "Save Together. Grow Together.",
  footerLegal:
    "Bhishi Circle is a record-keeping utility for organisers. It is not a bank, NBFC or escrow service.",
  footerCopyright: "© Bhishi Circle. Made for Indian ROSCA organisers.",
  footerTerms: "Terms",
  footerPrivacy: "Privacy",
  footerContact: "Contact",
  footerLogin: "Already have an account? Log in",
  demoCollect: "Collect",
  legalNavBack: "Back to home",
  termsTitle: "Terms of use",
  termsUpdated: "Last updated: 25 September 2026",
  termsSections: TERMS_EN,
  privacyTitle: "Privacy policy",
  privacyUpdated: "Last updated: 25 September 2026",
  privacySections: PRIVACY_EN,
  contactTitle: "Contact us",
  contactSub: "Questions about your books, account or the product — we read every message.",
  contactEmailLabel: "Email",
  contactEmail: "support@bhishicircle.in",
  contactWhatsAppLabel: "Support inbox",
  contactWhatsApp: "support@bhishicircle.in",
  contactFormName: "Your name",
  contactFormEmail: "Email or mobile",
  contactFormMessage: "How can we help?",
  contactFormSubmit: "Send via email",
  contactNote:
    "The form opens your email app addressed to support@bhishicircle.in. Prefer WhatsApp? Email us and we will reply with the support number.",
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
  navHow: "प्रीव्यू",
  navFeatures: "सुविधाएँ",
  navTypes: "प्रकार",
  navHowItWorks: "कैसे काम करता है",
  navLogin: "लॉग इन",
  navStart: "शुरू करें",
  navOpenApp: "ऐप खोलें",
  heroBrand: "Bhishi Circle",
  heroTitle: "हर भिसी के लिए",
  heroTitleAccent: "साफ़ किताबें",
  heroSub:
    "समूह बनाएँ, हप्ता वसूलें, लकी ड्रॉ घुमाएँ, पॉट अवॉर्ड करें और PDF प्रमाण भेजें — पारदर्शी आयोजकों के लिए एक लेजर।",
  heroCta: "मुफ़्त शुरू करें",
  heroSecondary: "कैसे काम करता है",
  heroTrust: "हमेशा मुफ़्त · अंग्रेज़ी · हिन्दी · मराठी",
  trustLabel: "महाराष्ट्र शैली के वृत्त और भारत भर के आयोजकों के लिए",
  demosEyebrow: "प्लेटफ़ॉर्म प्रीव्यू",
  demosTitle: "एक लेजर जो इस्तेमाल में आसान लगे",
  demosSub: "असली Bhishi Circle से दो छोटी रिकॉर्डिंग — समूह बनाएँ, फिर पॉट अवॉर्ड करें।",
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
  typesEyebrow: "भिसी प्रकार",
  typesTitle: "हर लोकप्रिय शैली। एक लेजर।",
  typesSub: "नियम एक बार चुनें — कसर, डिविडेंड, ब्याज और सेटलमेंट सुसंगत रहें।",
  types: [
    {
      title: "नीलामी भिसी",
      body: "सदस्य कसर बोली लगाते हैं। कलेक्ट-फर्स्ट या ऑक्शन-फर्स्ट — दोनों।",
      points: ["बोली ÷ हाथ", "आयोजक कमीशन", "कसर डिविडेंड"],
    },
    {
      title: "फिक्स्ड / कमिटी",
      body: "पॉट हाथ सूची के क्रम से। सबका एक हप्ता; शुरू से पहले क्रम बदलें।",
      points: ["फिक्स्ड क्रम", "एक किस्त", "स्पष्ट समाप्ति"],
    },
    {
      title: "लकी ड्रॉ (चिट्ठी)",
      body: "अप्राइज़्ड हाथों पर रंगीन व्हील — या सीधे चुनें, परिणाम शेयर करें।",
      points: ["व्हील स्पिन", "बंद से पहले बदलाव", "शेयर कार्ड"],
    },
    {
      title: "बलिदान हाथ",
      body: "शुरुआती विजेता एक पूरा हप्ता डिविडेंड छोड़ते हैं; अंतिम हाथ पूरा पॉट लेता है।",
      points: ["शुरुआती कट → डिविडेंड", "अंतिम हाथ पूरा पॉट", "बाकी समान हप्ता"],
    },
    {
      title: "लोन भिसी",
      body: "कैश-ऑन-हैंड से लोन, प्रति-लोन ब्याज — EMI या अंत में मूल — PDF सारणी।",
      points: ["ब्याज तुरंत या अगले महीने", "EMI / बल्लून", "लोन रिपोर्ट PDF"],
    },
  ],
  luckyEyebrow: "लकी ड्रॉ",
  luckyTitle: "असली चिट्ठी व्हील — सिक्का नहीं",
  luckySub: "योग्य हाथ रंगीन व्हील पर। स्पिन, आवंटन — हप्ता बंद करने से पहले विजेता बदल सकते हैं।",
  luckyPoints: [
    "केवल अप्राइज़्ड हाथ",
    "निष्पक्ष लैंड के साथ स्पिन",
    "ज़रूरत हो तो सीधे चुनें",
    "समूह के साथ परिणाम कार्ड",
  ],
  luckyCta: "Bhishi Circle मुफ़्त आज़माएँ",
  toolsEyebrow: "मुख्य फ़ीचर्स",
  toolsTitle: "पूरी कंट्रोल के लिए जो चाहिए",
  toolsSub: "वसूली, WhatsApp, PDF और तीन भाषाएँ — एक साफ़ लेजर में।",
  tools: [
    { title: "हप्ता वसूली", body: "कैश, UPI, बैंक, चेक या एडजस्टेड — पूर्ण, आंशिक या एडवांस।" },
    { title: "WhatsApp पहुँच", body: "ऑफ़लाइन सदस्यों को आमंत्रित करें, बकाया याद दिलाएँ, सारांश भेजें।" },
    { title: "PDF व CSV लेजर", body: "मासिक बकाया, रसीद, डे-बुक, अवॉर्ड स्लिप और लोन शेड्यूल।" },
    { title: "तीन भाषाएँ", body: "पूरा उत्पाद अंग्रेज़ी, हिन्दी या मराठी में।" },
    { title: "सदस्य दृश्यता", body: "साझा फ़ोन केवल अपनी भिसी देखते हैं।" },
  ],
  howEyebrow: "कैसे काम करता है",
  howTitle: "साफ़ किताबों के चार कदम",
  howSub: "पहले समूह से शेयर किए गए प्रमाण तक — बिना स्प्रेडशीट।",
  howSteps: [
    { title: "भिसी बनाएँ", body: "शैली, पॉट, हाथ और हप्ता क्रम छोटे विज़ार्ड में चुनें।" },
    { title: "हप्ता वसूलें", body: "हर हाथ पर कैश, UPI या बैंक मार्क करें — कुल साफ़।" },
    { title: "पॉट अवॉर्ड करें", body: "नीलामी, फिक्स्ड, बलिदान, लोन या लकी व्हील।" },
    { title: "प्रमाण शेयर करें", body: "डे-बुक और रसीद PDF भेजें ताकि वृत्त एकजुट रहे।" },
  ],
  forWhomEyebrow: "किसके लिए",
  forWhomTitle: "उनके लिए जो वाकई वृत्त चलाते हैं",
  forWhomSub: "एक सोसाइटी कमिटी हो या दर्जन भर पड़ोसी समूह — एक ही लेजर।",
  forWhom: [
    {
      title: "सोसाइटी व ऑफिस आयोजक",
      body: "हप्ता, अवॉर्ड और लोन नोट एक जगह — सदस्य भरोसा करें।",
    },
    {
      title: "परिवार व मोहल्ला वृत्त",
      body: "कापी और बिखरी WhatsApp चैट की जगह साझा किताब।",
    },
    {
      title: "कई समूह के बही-खाता वाले",
      body: "नीलामी, फिक्स्ड, लकी, बलिदान, लोन — बिना शीट झंझट।",
    },
  ],
  compareEyebrow: "भरोसे के लिए",
  compareTitle: "आपके सर्कल की बात सुरक्षित रखें",
  compareSub: "वही नियम — “किसने दिया?” पूछने पर बहुत कम भ्रम।",
  compareBeforeTitle: "आम कापी / चैट",
  compareAfterTitle: "Bhishi Circle के साथ",
  compareBefore: [
    "हप्ता निशान डायरी और चैट में खो जाते हैं",
    "अवॉर्ड विवाद — शेयर करने लायक प्रमाण नहीं",
    "लकी ड्रॉ अन्यायपूर्ण या समझाना मुश्किल लगता है",
    "लोन EMI अलग पर्चियों पर",
  ],
  compareAfter: [
    "हर हाथ, हप्ता और माध्यम एक रजिस्टर में",
    "डे-बुक व रसीद PDF आगे भेजें",
    "दिखने वाला व्हील स्पिन — बंद से पहले बदलें",
    "ब्याज और शेड्यूल उसी भिसी में",
  ],
  faqEyebrow: "भरोसा",
  faqTitle: "सीधे जवाब",
  faqSub: "किताबें बदलने से पहले आयोजक यही पूछते हैं।",
  faq: [
    {
      q: "क्या Bhishi Circle वाकई मुफ़्त है?",
      a: "हाँ। जितनी चाहें समूह बनाएँ और चलाएँ। कोई पेड प्लान या अपग्रेड दीवार नहीं।",
    },
    {
      q: "क्या आप हमारे पैसे रखते हैं?",
      a: "नहीं। हम केवल रिकॉर्ड-कीपिंग उपयोगिता हैं — बैंक, NBFC या एस्क्रो नहीं। लेन-देन आपके और सदस्यों के बीच रहता है।",
    },
    {
      q: "कौन सी भाषाएँ समर्थित हैं?",
      a: "अंग्रेज़ी, हिन्दी और मराठी — उत्पाद और उपलब्ध रिपोर्टों में।",
    },
    {
      q: "क्या सदस्य मेरे अन्य समूह देख सकते हैं?",
      a: "शेयर/आमंत्रण दृश्य केवल वह भिसी दिखाते हैं जो आप खोलते हैं। बाकी किताबें निजी रहती हैं।",
    },
    {
      q: "क्या फ़ोन और डेस्कटॉप दोनों पर चलता है?",
      a: "हाँ। मोबाइल या डेस्कटॉप ब्राउज़र में उपयोग करें। एक लॉगिन से किताबें सिंक रहती हैं।",
    },
    {
      q: "नीलामी कसर और लोन ब्याज?",
      a: "नीलामी में कलेक्ट-फर्स्ट व ऑक्शन-फर्स्ट। लोन भिसी में ब्याज, EMI या बल्लून मूल, और प्रिंट शेड्यूल।",
    },
  ],
  stats: [
    { value: "5", label: "भिसी शैलियाँ" },
    { value: "3", label: "भाषाएँ" },
    { value: "PDF", label: "रिपोर्ट व स्लिप" },
    { value: "₹0", label: "हमेशा मुफ़्त" },
  ],
  finalTitle: "इस महीने का हप्ता साफ़ किताबों पर",
  finalSub: "मोबाइल से साइन अप करें, भाषा चुनें, मिनटों में पहली भिसी बनाएँ।",
  finalCta: "Bhishi Circle खोलें",
  footerTagline: "एक साथ बचत। एक साथ विकास।",
  footerLegal: "Bhishi Circle आयोजकों के लिए रिकॉर्ड-कीपिंग उपयोगिता है। यह बैंक, NBFC या एस्क्रो नहीं है।",
  footerCopyright: "© Bhishi Circle. भारतीय ROSCA आयोजकों के लिए।",
  footerTerms: "नियम",
  footerPrivacy: "गोपनीयता",
  footerContact: "संपर्क",
  footerLogin: "पहले से खाता है? लॉग इन करें",
  demoCollect: "वसूली",
  legalNavBack: "होम पर वापस",
  termsTitle: "उपयोग की शर्तें",
  termsUpdated: "अंतिम अपडेट: 25 सितंबर 2026",
  privacyTitle: "गोपनीयता नीति",
  privacyUpdated: "अंतिम अपडेट: 25 सितंबर 2026",
  contactTitle: "संपर्क करें",
  contactSub: "किताबों, खाते या उत्पाद के बारे में प्रश्न — हम हर संदेश पढ़ते हैं।",
  contactEmailLabel: "ईमेल",
  contactWhatsAppLabel: "WhatsApp",
  contactFormName: "आपका नाम",
  contactFormEmail: "ईमेल या मोबाइल",
  contactFormMessage: "हम कैसे मदद करें?",
  contactFormSubmit: "ईमेल से भेजें",
  contactNote: "फ़ॉर्म आपका ईमेल ऐप support@bhishicircle.in पर खोलता है। WhatsApp नंबर प्रकाशन तक प्लेसहोल्डर है।",
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
  navHow: "प्रीव्ह्यू",
  navFeatures: "वैशिष्ट्ये",
  navTypes: "प्रकार",
  navHowItWorks: "कसे काम करते",
  navLogin: "लॉग इन",
  navStart: "सुरू करा",
  navOpenApp: "अॅप उघडा",
  heroBrand: "Bhishi Circle",
  heroTitle: "प्रत्येक भिशीसाठी",
  heroTitleAccent: "स्वच्छ वही",
  heroSub:
    "गट तयार करा, हप्ता वसूल करा, लकी ड्रॉ फिरवा, पॉट अवॉर्ड करा आणि PDF पुरावा पाठवा — पारदर्शक आयोजकांसाठी एक लेजर.",
  heroCta: "मोफत सुरू करा",
  heroSecondary: "कसे काम करते",
  heroTrust: "नेहमी मोफत · इंग्रजी · हिंदी · मराठी",
  trustLabel: "महाराष्ट्र शैलीची वर्तुळे आणि भारतभरातील आयोजकांसाठी",
  demosEyebrow: "प्लॅटफॉर्म प्रीव्ह्यू",
  demosTitle: "वापरण्यास सोपे वाटणारे लेजर अनुभवा",
  demosSub: "खऱ्या Bhishi Circle मधील दोन छोटी रेकॉर्डिंग — गट तयार करा, नंतर पॉट अवॉर्ड करा.",
  demos: [
    {
      id: "create",
      short: "तयार",
      title: "भिशी कशी तयार करावी",
      body: "शैली ते हप्ता क्रम — लिलाव, फिक्स्ड, लकी ड्रॉ, बलिदान किंवा कर्ज.",
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
  typesEyebrow: "भिशी प्रकार",
  typesTitle: "प्रत्येक लोकप्रिय शैली. एक लेजर.",
  typesSub: "नियम एकदा निवडा — कसर, डिव्हिडंड, व्याज आणि सेटलमेंट सुसंगत राहतील.",
  types: [
    {
      title: "लिलाव भिशी",
      body: "सदस्य कसर बोली लावतात. कलेक्ट-फर्स्ट किंवा ऑक्शन-फर्स्ट — दोन्ही.",
      points: ["बोली ÷ हात", "आयोजक कमिशन", "कसर डिव्हिडंड"],
    },
    {
      title: "फिक्स्ड / कमिटी",
      body: "पॉट हात यादीच्या क्रमाने. सर्वांना समान हप्ता; सुरू होण्यापूर्वी क्रम बदला.",
      points: ["फिक्स्ड क्रम", "समान हप्ता", "स्पष्ट समाप्ती"],
    },
    {
      title: "लकी ड्रॉ (चिट्ठी)",
      body: "अप्राइज्ड हातांवर रंगीत चाक — किंवा थेट निवडा, निकाल शेअर करा.",
      points: ["चाक फिरवा", "बंद होण्यापूर्वी बदला", "शेअर कार्ड"],
    },
    {
      title: "बलिदान हात",
      body: "सुरुवातीचे विजेते एक पूर्ण हप्ता डिव्हिडंड सोडतात; शेवटचा हात पूर्ण पॉट घेतो.",
      points: ["सुरुवातीची कपात → डिव्हिडंड", "शेवटचा हात पूर्ण पॉट", "इतरत्र समान हप्ता"],
    },
    {
      title: "कर्ज भिशी",
      body: "कॅश-ऑन-हँडमधून कर्ज, प्रति-कर्ज व्याज — EMI किंवा शेवटी मुद्दल — PDF वेळापत्रक.",
      points: ["व्याज लगेच किंवा पुढच्या महिन्यात", "EMI / बल्लून", "कर्ज अहवाल PDF"],
    },
  ],
  luckyEyebrow: "लकी ड्रॉ",
  luckyTitle: "खरे चिट्ठी चाक — नाणे नाही",
  luckySub: "पात्र हात रंगीत चाकावर. फिरवा, वाटप — हप्ता बंद होण्यापूर्वी विजेता बदलता येतो.",
  luckyPoints: [
    "फक्त अप्राइज्ड हात",
    "निष्पक्ष लँडसह स्पिन",
    "गरज असल्यास थेट निवडा",
    "गटासाठी निकाल कार्ड",
  ],
  luckyCta: "Bhishi Circle मोफत वापरून पहा",
  toolsEyebrow: "मुख्य वैशिष्ट्ये",
  toolsTitle: "पूर्ण नियंत्रणासाठी जे हवे",
  toolsSub: "वसुली, WhatsApp, PDF आणि तीन भाषा — एका स्वच्छ लेजरमध्ये.",
  tools: [
    { title: "हप्ता वसुली", body: "रोख, UPI, बँक, चेक किंवा अॅडजस्टेड — पूर्ण, अंशतः किंवा अॅडव्हान्स." },
    { title: "WhatsApp पोहोच", body: "ऑफलाइन सदस्यांना आमंत्रित करा, थकबाकी आठवा, सारांश पाठवा." },
    { title: "PDF व CSV लेजर", body: "महिन्याची थकबाकी, पावती, डे-बुक, अवॉर्ड स्लिप आणि कर्ज वेळापत्रक." },
    { title: "तीन भाषा", body: "संपूर्ण उत्पादन इंग्रजी, हिंदी किंवा मराठीत." },
    { title: "सदस्य दृश्यमानता", body: "सामायिक फोन फक्त त्यांची भिशी पाहतात." },
  ],
  howEyebrow: "कसे काम करते",
  howTitle: "स्वच्छ वहीसाठी चार पावले",
  howSub: "पहिल्या गटापासून शेअर केलेल्या पुराव्यापर्यंत — स्प्रेडशीटशिवाय.",
  howSteps: [
    { title: "भिशी तयार करा", body: "शैली, पॉट, हात आणि हप्ता क्रम छोट्या विझार्डमध्ये निवडा." },
    { title: "हप्ता वसूल करा", body: "प्रत्येक हातावर रोख, UPI किंवा बँक मार्क करा — एकूण स्पष्ट." },
    { title: "पॉट अवॉर्ड करा", body: "लिलाव, फिक्स्ड, बलिदान, कर्ज किंवा लकी चाक." },
    { title: "पुरावा शेअर करा", body: "डे-बुक आणि पावती PDF पाठवा जेणेकरून वर्तुळ एकत्र राहील." },
  ],
  forWhomEyebrow: "कोणासाठी",
  forWhomTitle: "जे खरोखर वर्तुळ चालवतात त्यांच्यासाठी",
  forWhomSub: "एक सोसायटी कमिटी असो किंवा डझनभर शेजारी गट — एकच वही.",
  forWhom: [
    {
      title: "सोसायटी व ऑफिस आयोजक",
      body: "हप्ता, अवॉर्ड आणि कर्ज नोट एकत्र — सदस्य विश्वास ठेवतील.",
    },
    {
      title: "कुटुंब व परिसर वर्तुळे",
      body: "कॉपी आणि विखुरलेल्या WhatsApp चॅटऐवजी सामायिक वही.",
    },
    {
      title: "अनेक गटांचे बहीखाते",
      body: "लिलाव, फिक्स्ड, लकी, बलिदान, कर्ज — शीटशिवाय.",
    },
  ],
  compareEyebrow: "विश्वासासाठी",
  compareTitle: "तुमच्या सर्कलची काळजी सुरक्षित ठेवा",
  compareSub: "तेच नियम — “कोणाने दिले?” विचारले की कमी गोंधळ.",
  compareBeforeTitle: "सामान्य कॉपी / चॅट",
  compareAfterTitle: "Bhishi Circle सोबत",
  compareBefore: [
    "हप्ता चिन्हे डायरी व चॅटमध्ये हरवतात",
    "अवॉर्ड वाद — शेअर करण्याजोगा पुरावा नाही",
    "लकी ड्रॉ अन्यायकारक किंवा समजावणे कठीण",
    "कर्ज EMI वेगळ्या चिठ्ठ्यांवर",
  ],
  compareAfter: [
    "प्रत्येक हात, हप्ता व माध्यम एका रजिस्टरमध्ये",
    "डे-बुक व पावती PDF फॉरवर्ड करा",
    "दिसेल असे चाक — बंद होण्यापूर्वी बदला",
    "व्याज व वेळापत्रक त्याच भिशीत",
  ],
  faqEyebrow: "विश्वास",
  faqTitle: "सरळ उत्तरे",
  faqSub: "वही हलवण्यापूर्वी आयोजक हेच विचारतात.",
  faq: [
    {
      q: "Bhishi Circle खरोखर मोफत आहे का?",
      a: "हो. जितके हवे तितके गट तयार करा आणि चालवा. पेड योजना किंवा अपग्रेड भिंत नाही.",
    },
    {
      q: "तुम्ही आमचे पैसे ठेवता का?",
      a: "नाही. आम्ही फक्त रेकॉर्ड-कीपिंग उपयुक्तता आहोत — बँक, NBFC किंवा एस्क्रो नाही. व्यवहार तुमच्या आणि सदस्यांमध्ये राहतात.",
    },
    {
      q: "कोणत्या भाषा समर्थित आहेत?",
      a: "इंग्रजी, हिंदी आणि मराठी — उत्पादन आणि उपलब्ध अहवालांमध्ये.",
    },
    {
      q: "सदस्य माझे इतर गट पाहू शकतात का?",
      a: "शेअर/आमंत्रण दृश्य फक्त तुम्ही उघडलेली भिशी दाखवतात. इतर वही खाजगी राहतात.",
    },
    {
      q: "फोन आणि डेस्कटॉप दोन्हीवर चालते का?",
      a: "हो. मोबाइल किंवा डेस्कटॉप ब्राउझरमध्ये वापरा. एक लॉगिनने वही सिंक राहतात.",
    },
    {
      q: "लिलाव कसर आणि कर्ज व्याज?",
      a: "लिलावात कलेक्ट-फर्स्ट व ऑक्शन-फर्स्ट. कर्ज भिशीत व्याज, EMI किंवा बल्लून मूळ, व प्रिंट वेळापत्रक.",
    },
  ],
  stats: [
    { value: "5", label: "भिशी शैली" },
    { value: "3", label: "भाषा" },
    { value: "PDF", label: "अहवाल व स्लिप" },
    { value: "₹0", label: "नेहमी मोफत" },
  ],
  finalTitle: "या महिन्याचा हप्ता स्वच्छ वहीवर",
  finalSub: "मोबाइलने साइन अप करा, भाषा निवडा, मिनिटांत पहिली भिशी तयार करा.",
  finalCta: "Bhishi Circle उघडा",
  footerTagline: "एकत्र बचत. एकत्र वाढ.",
  footerLegal: "Bhishi Circle आयोजकांसाठी रेकॉर्ड-कीपिंग उपयुक्तता आहे. ही बँक, NBFC किंवा एस्क्रो नाही.",
  footerCopyright: "© Bhishi Circle. भारतीय ROSCA आयोजकांसाठी.",
  footerTerms: "अटी",
  footerPrivacy: "गोपनीयता",
  footerContact: "संपर्क",
  footerLogin: "आधीच खाते आहे? लॉग इन करा",
  demoCollect: "वसुली",
  legalNavBack: "होमवर परत",
  termsTitle: "वापराच्या अटी",
  termsUpdated: "शेवटचे अपडेट: 25 सप्टेंबर 2026",
  privacyTitle: "गोपनीयता धोरण",
  privacyUpdated: "शेवटचे अपडेट: 25 सप्टेंबर 2026",
  contactTitle: "आमच्याशी संपर्क साधा",
  contactSub: "वही, खाते किंवा उत्पादनाबद्दल प्रश्न — आम्ही प्रत्येक संदेश वाचतो.",
  contactEmailLabel: "ईमेल",
  contactWhatsAppLabel: "WhatsApp",
  contactFormName: "तुमचे नाव",
  contactFormEmail: "ईमेल किंवा मोबाइल",
  contactFormMessage: "आम्ही कशी मदत करू?",
  contactFormSubmit: "ईमेलने पाठवा",
  contactNote: "फॉर्म तुमचे ईमेल अॅप support@bhishicircle.in वर उघडतो. WhatsApp क्रमांक प्रकाशन होईपर्यंत प्लेसहोल्डर आहे.",
};

export const LANDING: Record<GuestLang, LandingCopy> = { en, hi, mr };

export function landingCopy(lang: GuestLang): LandingCopy {
  return LANDING[lang] || en;
}
