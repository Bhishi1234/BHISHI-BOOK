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
  waEnquire: string;
  waPrefill: string;
  problemEyebrow: string;
  problemTitle: string;
  problemSub: string;
  problems: { title: string; body: string }[];
  promise: string;
  storyTap: string;
  storyScreens: { kicker: string; title: string; button: string; done: string; lines: string[] }[];
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
    "Bhishi admins still run the month on WhatsApp and a notebook. Bhishi Circle is the free book for hapta, awards and PDF proof — we never hold the money.",
  metaKeywords:
    "bhishi app, lucky draw chitthi, auction bhishi, loan bhishi, hapta collection, Marathi bhishi, Hindi chit books, Bhishi Circle",
  langTitle: "Choose your language",
  langHint: "Bhishi Circle works in English, Hindi and Marathi. You can change this anytime.",
  langContinue: "Continue",
  langEn: "English",
  langHi: "हिन्दी",
  langMr: "मराठी",
  navHow: "For admins",
  navFeatures: "The problem",
  navTypes: "Styles",
  navHowItWorks: "How it works",
  navLogin: "Log in",
  navStart: "Get started",
  navOpenApp: "Open app",
  heroBrand: "Bhishi Circle",
  heroTitle: "Still running bhishi in",
  heroTitleAccent: "WhatsApp and a notebook?",
  heroSub:
    "Someone asks who paid. You scroll the group, then the diary, and the two totals don’t match. Bhishi Circle is the admin book for that same circle.",
  heroCta: "Start this month’s books",
  heroSecondary: "Enquire more",
  heroTrust: "Free for organisers · We never hold the money",
  waEnquire: "Enquire more",
  waPrefill: "Hi, I want to know more about Bhishi Circle.",
  problemEyebrow: "The month, as it is",
  problemTitle: "The books are the group chat",
  problemSub: "Organisers are not short of effort. They are short of one place that still matches after the hapta is collected.",
  problems: [
    {
      title: "Who paid this hapta?",
      body: "Cash in person, UPI at night, and “I’ll send” in the group. By morning the total is a guess.",
    },
    {
      title: "The notebook and the chat disagree",
      body: "One missed line, one edited message, and two people remember two different amounts.",
    },
    {
      title: "Award day becomes an argument",
      body: "Kasr, whose turn, or the lucky draw — if it isn’t written in one place, the circle argues.",
    },
    {
      title: "Proof is a photo of a page",
      body: "Next month someone asks again. You scroll up and hope the picture is still in the chat.",
    },
  ],
  promise:
    "You still collect cash, UPI, bank or cheque yourself. Bhishi Circle only keeps the book — who is in, who paid, who won, and a PDF the group can check. We never hold the money.",
  storyTap: "Tap",
  trustLabel: "Trusted by organisers running Maharashtra-style circles across India",
  demosEyebrow: "A month, with an admin",
  demosTitle: "What you actually do after you sign up",
  demosSub: "Four slow steps. Watch the tap land, then the book change. Create once — then every hapta is collect, award, and proof.",
  storyScreens: [
    {
      kicker: "Create",
      title: "Open the circle",
      button: "Create bhishi",
      done: "The circle is open. Add hands next — not in a new diary.",
      lines: ["Office circle", "Pot ₹10,000", "20 hands · monthly"],
    },
    {
      kicker: "Collect",
      title: "Hapta 4",
      button: "Mark cash paid",
      done: "Anita · cash · this hapta is in the book.",
      lines: ["Anita · due ₹500", "Rahul · paid · UPI", "Meera · paid · cash"],
    },
    {
      kicker: "Award",
      title: "Award this hapta",
      button: "Award Meera",
      done: "Meera takes this pot. The group and the book match.",
      lines: ["Pot ₹10,000", "Unawarded hands left", "Auction, turn, or wheel"],
    },
    {
      kicker: "Proof",
      title: "Hapta 4 ledger",
      button: "Share on WhatsApp",
      done: "A PDF is ready to forward. Not a photo of a page.",
      lines: ["Collected ₹9,500", "Due ₹500", "Winner · Meera"],
    },
  ],
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
  typesEyebrow: "The rules you already use",
  typesTitle: "Pick the style. The book follows it.",
  typesSub: "You should not learn a new bhishi. You set the rules once — auction, fixed turn, lucky draw, sacrifice hand, or a loan from cash in hand.",
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
  toolsEyebrow: "What the admin gets",
  toolsTitle: "The work you already do, with one true book",
  toolsSub: "WhatsApp can stay the notice board. The numbers move here, so a question in the group has an answer you can send back.",
  tools: [
    { title: "Hapta, written once", body: "Full, partial or advance. Cash, UPI, bank, cheque or adjusted. The month total is the book, not the chat." },
    { title: "Award without a fresh argument", body: "Auction kasr, a fixed turn, the lucky-draw wheel, a sacrifice hand, or a loan from cash already collected." },
    { title: "WhatsApp for the message", body: "Invite a member, nudge a due, share the award. The group still talks there. The maths stays here." },
    { title: "A report you can forward", body: "Day book, dues, receipts, award slips and loan schedules as PDF. CSV when you want a sheet." },
    { title: "Members see only their circle", body: "A shared phone opens the bhishi you gave them. Your other groups stay yours." },
    { title: "The language they already speak", body: "English, Hindi or Marathi — for you, and for the screens you hand to members." },
  ],
  howEyebrow: "The admin loop",
  howTitle: "Every hapta is the same four moves",
  howSub: "Create the circle once. After that, the month is collect, award, and send proof back to the group.",
  howSteps: [
    { title: "Create the circle", body: "Style, pot, hands and how often the hapta comes. One wizard, then the book exists." },
    { title: "Mark who paid", body: "Each hand, each mode. Partial payments stay visible instead of living in someone’s memory." },
    { title: "Award this hapta", body: "The winner is written down before the group starts remembering it differently." },
    { title: "Send the proof", body: "A PDF the member can open. You stop photographing the notebook." },
  ],
  forWhomEyebrow: "Who it’s for",
  forWhomTitle: "Made for the person who collects the hapta",
  forWhomSub: "One office circle or a handful of neighbourhood groups. Not a bank, and not branch software for a chit-fund company.",
  forWhom: [
    {
      title: "You run the office or society circle",
      body: "The group already trusts you with the notebook. Give them a book that answers “who paid?” without a phone call.",
    },
    {
      title: "You run family and neighbourhood circles",
      body: "The WhatsApp group stays. The diary does not have to. Names, haptas and awards live in one place.",
    },
    {
      title: "You run more than one style",
      body: "Auction in one group, lucky draw in another, a loan from cash in a third — without three diaries.",
    },
  ],
  compareEyebrow: "Same circle, new book",
  compareTitle: "What changes for the admin",
  compareSub: "The members, the rules and the money stay yours. The remembering moves.",
  compareBeforeTitle: "WhatsApp + notebook",
  compareAfterTitle: "Bhishi Circle",
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
      q: "Can I ask someone before I sign up?",
      a: "Yes. Enquire on WhatsApp at 99679 66631. We’ll walk through how an organiser keeps the month.",
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
  finalTitle: "Start this month’s books — free",
  finalSub: "Or enquire on WhatsApp before you move a single name across.",
  finalCta: "Create your free account",
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
    "भिसी एडमिन अभी भी महीना WhatsApp और कापी पर चलाते हैं। Bhishi Circle हप्ता, अवॉर्ड और PDF प्रमाण की मुफ़्त बही है — हम पैसे नहीं रखते।",
  metaKeywords: "भिसी ऐप, लकी ड्रॉ चिट्ठी, नीलामी भिसी, लोन भिसी, हप्ता वसूली, Bhishi Circle",
  langTitle: "अपनी भाषा चुनें",
  langHint: "Bhishi Circle अंग्रेज़ी, हिन्दी और मराठी में चलता है। कभी भी बदल सकते हैं।",
  langContinue: "आगे बढ़ें",
  navHow: "एडमिन के लिए",
  navFeatures: "समस्या",
  navTypes: "शैलियाँ",
  navHowItWorks: "कैसे काम करता है",
  navLogin: "लॉग इन",
  navStart: "शुरू करें",
  navOpenApp: "ऐप खोलें",
  heroBrand: "Bhishi Circle",
  heroTitle: "अभी भी भिसी चल रही है",
  heroTitleAccent: "WhatsApp और कापी में?",
  heroSub:
    "कोई पूछता है किसने हप्ता दिया। आप ग्रुप स्क्रॉल करते हैं, फिर डायरी, और दोनों जोड़ नहीं मिलते। Bhishi Circle उसी सर्कल की एडमिन बही है।",
  heroCta: "इस महीने की किताब शुरू करें",
  heroSecondary: "और पूछें",
  heroTrust: "आयोजकों के लिए मुफ़्त · हम पैसे नहीं रखते",
  waEnquire: "और पूछें",
  waPrefill: "नमस्ते, मुझे Bhishi Circle के बारे में और जानना है।",
  problemEyebrow: "महीना, जैसा अभी है",
  problemTitle: "किताबें ग्रुप चैट में पड़ी हैं",
  problemSub: "आयोजकों के पास मेहनत कम नहीं है। उनके पास एक जगह कम है जो हप्ता वसूलने के बाद भी मेल खाए।",
  problems: [
    { title: "इस हफ्ते किसने दिया?", body: "सामने नकद, रात को UPI, और ग्रुप में “भेज दूँगा”। सुबह तक जोड़ अंदाज़ा है।" },
    { title: "कापी और चैट अलग बोलती हैं", body: "एक छूटी लाइन, एक बदला मैसेज, और दो लोगों को दो रकम याद है।" },
    { title: "अवॉर्ड का दिन बहस बन जाता है", body: "कसर, किसकी बारी, या लकी ड्रॉ — एक जगह न लिखा हो तो सर्कल झगड़ता है।" },
    { title: "प्रमाण पन्ने की फोटो है", body: "अगले महीने फिर पूछा जाता है। आप ऊपर स्क्रॉल करते हैं, उम्मीद कि फोटो चैट में बची हो।" },
  ],
  promise:
    "नकद, UPI, बैंक या चेक आप खुद लेते हैं। Bhishi Circle सिर्फ़ बही रखती है — कौन है, किसने दिया, किसने जीता, और एक PDF जो ग्रुप जाँच सके। हम पैसे नहीं रखते।",
  storyTap: "टैप",
  storyScreens: [
    { kicker: "बनाएँ", title: "सर्कल खोलें", button: "भिसी बनाएँ", done: "सर्कल खुल गया। हाथ आगे जोड़ें — नई डायरी में नहीं।", lines: ["ऑफिस सर्कल", "पॉट ₹10,000", "20 हाथ · मासिक"] },
    { kicker: "वसूली", title: "हप्ता 4", button: "नकद दिया मार्क करें", done: "अनीता · नकद · यह हप्ता बही में आ गया।", lines: ["अनीता · बाकी ₹500", "राहुल · दिया · UPI", "मीरा · दिया · नकद"] },
    { kicker: "अवॉर्ड", title: "यह हप्ता दें", button: "मीरा को दें", done: "मीरा यह पॉट लेती है। ग्रुप और बही एक हैं।", lines: ["पॉट ₹10,000", "बचे हाथ", "नीलामी, बारी, या चाक"] },
    { kicker: "प्रमाण", title: "हप्ता 4 की बही", button: "WhatsApp पर भेजें", done: "PDF आगे भेजने को तैयार है। पन्ने की फोटो नहीं।", lines: ["वसूली ₹9,500", "बाकी ₹500", "विजेता · मीरा"] },
  ],
  trustLabel: "महाराष्ट्र शैली के वृत्त और भारत भर के आयोजकों के लिए",
  demosEyebrow: "एडमिन का महीना",
  demosTitle: "साइन अप के बाद आप असल में क्या करते हैं",
  demosSub: "चार धीमे कदम। टैप रुकता है, फिर बही बदलती है। एक बार बनाएँ — फिर हर हप्ता वसूली, अवॉर्ड और प्रमाण है।",
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
  typesEyebrow: "जो नियम आप पहले से चलाते हैं",
  typesTitle: "शैली चुनें। बही उसी पर चले।",
  typesSub: "नई भिसी सीखने की ज़रूरत नहीं। नियम एक बार रखें — नीलामी, तय बारी, लकी ड्रॉ, बलिदान हाथ, या हाथ में जमा नकद से लोन।",
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
  toolsEyebrow: "एडमिन को क्या मिलता है",
  toolsTitle: "जो काम आप पहले से करते हैं, एक सच्ची बही के साथ",
  toolsSub: "WhatsApp सूचना पट्ट रह सकता है। आँकड़े यहाँ आते हैं, ताकि ग्रुप के सवाल का जवाब आप वापस भेज सकें।",
  tools: [
    { title: "हप्ता, एक बार लिखा", body: "पूरा, आंशिक या अग्रिम। नकद, UPI, बैंक, चेक या समायोजित। महीने का जोड़ बही है, चैट नहीं।" },
    { title: "बिना नई बहस के अवॉर्ड", body: "नीलामी कसर, तय बारी, लकी-ड्रॉ चाक, बलिदान हाथ, या पहले से जमा नकद से लोन।" },
    { title: "WhatsApp संदेश के लिए", body: "सदस्य बुलाएँ, बकाया याद दिलाएँ, अवॉर्ड भेजें। बातचीत वहीं। हिसाब यहाँ।" },
    { title: "आगे भेजने लायक रिपोर्ट", body: "डे बुक, बकाया, रसीद, अवॉर्ड स्लिप और लोन शेड्यूल PDF में। शीट चाहिए तो CSV।" },
    { title: "सदस्य सिर्फ़ अपना सर्कल देखें", body: "शेयर किया फ़ोन वही भिसी खोलता है जो आपने दी। बाकी समूह आपके पास रहते हैं।" },
    { title: "जो भाषा वे बोलते हैं", body: "अंग्रेज़ी, हिन्दी या मराठी — आपके लिए, और सदस्यों को दी स्क्रीन के लिए।" },
  ],
  howEyebrow: "एडमिन का चक्र",
  howTitle: "हर हप्ता वही चार कदम",
  howSub: "सर्कल एक बार बनाएँ। उसके बाद महीना है वसूली, अवॉर्ड, और प्रमाण वापस ग्रुप में।",
  howSteps: [
    { title: "सर्कल बनाएँ", body: "शैली, पॉट, हाथ और हप्ता कितनी बार। एक विज़ार्ड, फिर बही मौजूद है।" },
    { title: "किसने दिया, लिखें", body: "हर हाथ, हर तरीका। आंशिक भुगतान दिखता रहता है — किसी की याद में नहीं।" },
    { title: "यह हप्ता दें", body: "विजेता लिख दिया जाता है, इससे पहले कि ग्रुप उसे अलग-अलग याद करे।" },
    { title: "प्रमाण भेजें", body: "PDF जो सदस्य खोल सके। कापी की फोटो बंद।" },
  ],
  forWhomEyebrow: "किसके लिए",
  forWhomTitle: "उसके लिए जो हप्ता वसूलता है",
  forWhomSub: "एक ऑफिस सर्कल या कुछ मोहल्ले के समूह। बैंक नहीं, और चिट फंड कंपनी का ब्रांच सॉफ़्टवेयर नहीं।",
  forWhom: [
    { title: "आप ऑफिस या सोसाइटी सर्कल चलाते हैं", body: "ग्रुप आपको कापी सौंप चुका है। उन्हें ऐसी बही दें जो “किसने दिया?” का जवाब बिना कॉल दे।" },
    { title: "आप परिवार और मोहल्ले के सर्कल चलाते हैं", body: "WhatsApp ग्रुप रहे। डायरी ज़रूरी नहीं। नाम, हप्ता और अवॉर्ड एक जगह।" },
    { title: "आप एक से ज़्यादा शैली चलाते हैं", body: "एक में नीलामी, दूसरे में लकी ड्रॉ, तीसरे में नकद से लोन — तीन डायरियों के बिना।" },
  ],
  compareEyebrow: "वही सर्कल, नई बही",
  compareTitle: "एडमिन के लिए क्या बदलता है",
  compareSub: "सदस्य, नियम और पैसा आपके पास रहते हैं। याद रखना बदलता है।",
  compareBeforeTitle: "WhatsApp + कापी",
  compareAfterTitle: "Bhishi Circle",
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
      q: "साइन अप से पहले किसी से पूछ सकता हूँ?",
      a: "हाँ। WhatsApp पर 99679 66631 पर पूछें। हम बताएँगे आयोजक महीना कैसे रखता है।",
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
  finalTitle: "इस महीने की किताब शुरू करें — मुफ़्त",
  finalSub: "या एक भी नाम ले जाने से पहले WhatsApp पर पूछें।",
  finalCta: "मुफ़्त खाता बनाएँ",
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
    "भिशी अ‍ॅडमिन अजूनही महिना WhatsApp आणि वहीवर चालवतात. Bhishi Circle हप्ता, अवॉर्ड आणि PDF पुराव्याची मोफत वही आहे — आम्ही पैसे ठेवत नाही.",
  metaKeywords: "भिशी अॅप, लकी ड्रॉ चिट्ठी, लिलाव भिशी, कर्ज भिशी, हप्ता वसुली, Bhishi Circle",
  langTitle: "तुमची भाषा निवडा",
  langHint: "Bhishi Circle इंग्रजी, हिंदी आणि मराठीत चालते. कधीही बदलू शकता.",
  langContinue: "पुढे जा",
  navHow: "अ‍ॅडमिनसाठी",
  navFeatures: "समस्या",
  navTypes: "शैली",
  navHowItWorks: "कसे काम करते",
  navLogin: "लॉग इन",
  navStart: "सुरू करा",
  navOpenApp: "अ‍ॅप उघडा",
  heroBrand: "Bhishi Circle",
  heroTitle: "अजूनही भिशी चालते",
  heroTitleAccent: "WhatsApp आणि वहीत?",
  heroSub:
    "कोणी विचारते कोणाने हप्ता दिला. तुम्ही ग्रुप स्क्रोल करता, मग वही, आणि दोन्ही बेरीज जुळत नाही. Bhishi Circle त्याच वर्तुळाची अ‍ॅडमिन वही आहे.",
  heroCta: "या महिन्याची वही सुरू करा",
  heroSecondary: "अधिक विचारा",
  heroTrust: "आयोजकांसाठी मोफत · आम्ही पैसे ठेवत नाही",
  waEnquire: "अधिक विचारा",
  waPrefill: "नमस्कार, मला Bhishi Circle बद्दल अधिक जाणून घ्यायचे आहे.",
  problemEyebrow: "महिना, जसा आहे",
  problemTitle: "वही ग्रुप चॅटमध्ये आहे",
  problemSub: "आयोजकांकडे मेहनत कमी नाही. एक जागा कमी आहे जी हप्ता वसूल झाल्यावरही जुळते.",
  problems: [
    { title: "या हप्त्यात कोणाने दिले?", body: "समोर रोख, रात्री UPI, आणि ग्रुपमध्ये “पाठवतो”. सकाळपर्यंत बेरीज अंदाज असते." },
    { title: "वही आणि चॅट वेगळे बोलतात", body: "एक राहिलेली ओळ, एक बदललेला मेसेज, आणि दोघांना दोन रकमा आठवतात." },
    { title: "अवॉर्डचा दिवस वाद होतो", body: "कसर, कोणाची पाळी, किंवा लकी ड्रॉ — एका जागी नसेल तर वर्तुळ भांडते." },
    { title: "पुरावा पानाचा फोटो आहे", body: "पुढच्या महिन्यात पुन्हा विचारतात. तुम्ही वर स्क्रोल करता, फोटो चॅटमध्ये असेल या आशेने." },
  ],
  promise:
    "रोख, UPI, बँक किंवा चेक तुम्ही स्वतः घेता. Bhishi Circle फक्त वही ठेवते — कोण आहे, कोणाने दिले, कोण जिंकले, आणि एक PDF जो गट तपासू शकेल. आम्ही पैसे ठेवत नाही.",
  storyTap: "टॅप",
  storyScreens: [
    { kicker: "तयार", title: "वर्तुळ उघडा", button: "भिशी तयार करा", done: "वर्तुळ उघडले. हात पुढे जोडा — नवीन वहीत नाही.", lines: ["ऑफिस वर्तुळ", "पॉट ₹10,000", "20 हात · मासिक"] },
    { kicker: "वसुली", title: "हप्ता 4", button: "रोख दिले मार्क करा", done: "अनिता · रोख · हा हप्ता वहीत आला.", lines: ["अनिता · बाकी ₹500", "राहुल · दिले · UPI", "मीरा · दिले · रोख"] },
    { kicker: "अवॉर्ड", title: "हा हप्ता द्या", button: "मीराला द्या", done: "मीरा हा पॉट घेते. गट आणि वही एक आहेत.", lines: ["पॉट ₹10,000", "उरलेले हात", "लिलाव, पाळी, किंवा चाक"] },
    { kicker: "पुरावा", title: "हप्ता 4 ची वही", button: "WhatsApp वर पाठवा", done: "PDF फॉरवर्ड करायला तयार आहे. पानाचा फोटो नाही.", lines: ["वसुली ₹9,500", "बाकी ₹500", "विजेती · मीरा"] },
  ],
  trustLabel: "महाराष्ट्र शैलीची वर्तुळे आणि भारतभरातील आयोजकांसाठी",
  demosEyebrow: "अ‍ॅडमिनचा महिना",
  demosTitle: "साइन अप नंतर तुम्ही प्रत्यक्षात काय करता",
  demosSub: "चार संथ पावले. टॅप थांबतो, मग वही बदलते. एकदा तयार करा — मग प्रत्येक हप्ता वसुली, अवॉर्ड आणि पुरावा आहे.",
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
  typesEyebrow: "जे नियम तुम्ही आधीच चालवता",
  typesTitle: "शैली निवडा. वही त्यानुसार चालते.",
  typesSub: "नवीन भिशी शिकायची गरज नाही. नियम एकदा ठेवा — लिलाव, ठरावीक पाळी, लकी ड्रॉ, बलिदान हात, किंवा हातात जमा रोखीतून कर्ज.",
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
  toolsEyebrow: "अ‍ॅडमिनला काय मिळते",
  toolsTitle: "जे काम तुम्ही आधीच करता, एका खरी वहीसह",
  toolsSub: "WhatsApp सूचना फलक राहू शकतो. आकडे येथे येतात, म्हणजे गटाच्या प्रश्नाचे उत्तर तुम्ही परत पाठवू शकता.",
  tools: [
    { title: "हप्ता, एकदा लिहिलेला", body: "पूर्ण, अंशतः किंवा आगाऊ. रोख, UPI, बँक, चेक किंवा समायोजित. महिन्याची बेरीज वही आहे, चॅट नाही." },
    { title: "नव्या वादाशिवाय अवॉर्ड", body: "लिलाव कसर, ठरावीक पाळी, लकी-ड्रॉ चाक, बलिदान हात, किंवा आधी जमा रोखीतून कर्ज." },
    { title: "WhatsApp संदेशासाठी", body: "सदस्य बोलावा, थकबाकी आठवण, अवॉर्ड पाठवा. बोलणे तिथे. हिशोब येथे." },
    { title: "फॉरवर्ड करता येणारा अहवाल", body: "डे-बुक, थकबाकी, पावती, अवॉर्ड स्लिप आणि कर्ज वेळापत्रक PDF मध्ये. शीट हवी तर CSV." },
    { title: "सदस्य फक्त त्यांचे वर्तुळ पाहतात", body: "शेअर केलेला फोन तीच भिशी उघडतो जी तुम्ही दिली. इतर गट तुमच्याकडे राहतात." },
    { title: "जी भाषा ते बोलतात", body: "इंग्रजी, हिंदी किंवा मराठी — तुमच्यासाठी, आणि सदस्यांना दिलेल्या स्क्रीनसाठी." },
  ],
  howEyebrow: "अ‍ॅडमिनचे चक्र",
  howTitle: "प्रत्येक हप्ता तीच चार पावले",
  howSub: "वर्तुळ एकदा तयार करा. त्यानंतर महिना म्हणजे वसुली, अवॉर्ड, आणि पुरावा परत गटात.",
  howSteps: [
    { title: "वर्तुळ तयार करा", body: "शैली, पॉट, हात आणि हप्ता किती वेळा. एक विझार्ड, मग वही अस्तित्वात आहे." },
    { title: "कोणाने दिले, लिहा", body: "प्रत्येक हात, प्रत्येक मार्ग. अंशतः पेमेंट दिसते राहते — आठवणीत नाही." },
    { title: "हा हप्ता द्या", body: "विजेता लिहून ठेवला जातो, गट त्याला वेगळे आठवण्यापूर्वी." },
    { title: "पुरावा पाठवा", body: "PDF जो सदस्य उघडू शकेल. वहीच्या फोटोचा शेवट." },
  ],
  forWhomEyebrow: "कोणासाठी",
  forWhomTitle: "जो हप्ता वसूल करतो त्याच्यासाठी",
  forWhomSub: "एक ऑफिस वर्तुळ किंवा काही परिसराचे गट. बँक नाही, आणि चिट फंड कंपनीचे ब्रँच सॉफ्टवेअर नाही.",
  forWhom: [
    { title: "तुम्ही ऑफिस किंवा सोसायटी वर्तुळ चालवता", body: "गटाने तुम्हाला वही सोपवली आहे. त्यांना अशी वही द्या जी “कोणाने दिले?” चे उत्तर कॉलशिवाय देते." },
    { title: "तुम्ही कुटुंब आणि परिसराची वर्तुळे चालवता", body: "WhatsApp गट राहतो. डायरी गरजेची नाही. नावे, हप्ते आणि अवॉर्ड एका जागी." },
    { title: "तुम्ही एकापेक्षा जास्त शैली चालवता", body: "एकात लिलाव, दुसऱ्यात लकी ड्रॉ, तिसऱ्यात रोखीतून कर्ज — तीन वह्यांशिवाय." },
  ],
  compareEyebrow: "तेच वर्तुळ, नवी वही",
  compareTitle: "अ‍ॅडमिनसाठी काय बदलते",
  compareSub: "सदस्य, नियम आणि पैसे तुमच्याकडे राहतात. आठवणे बदलते.",
  compareBeforeTitle: "WhatsApp + वही",
  compareAfterTitle: "Bhishi Circle",
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
      q: "साइन अपपूर्वी कोणाला विचारू शकतो का?",
      a: "हो. WhatsApp वर 99679 66631 वर विचारा. आम्ही सांगू आयोजक महिना कसा ठेवतो.",
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
  finalTitle: "या महिन्याची वही सुरू करा — मोफत",
  finalSub: "किंवा एकही नाव हलवण्यापूर्वी WhatsApp वर विचारा.",
  finalCta: "मोफत खाते तयार करा",
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
