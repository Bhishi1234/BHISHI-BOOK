/**
 * Bhishi Circle copy — grounded in common Maharashtra practice and
 * Chit Funds Act / Maharashtra Chit Funds Act vocabulary:
 * hapta (subscription), bhishi amount (chit amount / pot), kasr (discount),
 * labhansh (dividend), organiser (foreman), member (subscriber), hand (ticket).
 * Proper names (group title, person names) stay untranslated in the UI.
 */
export type Lang = "en" | "hi" | "mr";

export type Messages = {
  brand: string;
  nav: {
    home: string;
    dashboard: string;
    chits: string;
    collections: string;
    collect: string;
    people: string;
    customers: string;
    support: string;
    upgrade: string;
    profile: string;
    search: string;
    newChit: string;
    more: string;
    moreHint: string;
    signOut: string;
    plan: string;
  };
  moreHints: {
    search: string;
    newChit: string;
    support: string;
    upgrade: string;
    profile: string;
  };
  searchPlaceholder: string;
  common: {
    save: string;
    cancel: string;
    edit: string;
    active: string;
    viewAll: string;
    members: string;
    member: string;
    loading: string;
    notSet: string;
    all: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    close: string;
    share: string;
  };
  terms: {
    hapta: string;
    haptaRound: string;
    haptaShort: string;
    bhishiAmount: string;
    prizeAmount: string;
    kasr: string;
    dividend: string;
    commission: string;
    organiser: string;
    hand: string;
    hands: string;
    outstanding: string;
    collected: string;
    prized: string;
    unprized: string;
    collection: string;
    perHapta: string;
  };
  greeting: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  dash: {
    title: string;
    activeChits: string;
    activeHint: string;
    managed: string;
    managedHint: string;
    membersHint: string;
    collectedCycle: string;
    collectedHint: string;
    outstandingHint: string;
    onTrack: string;
    onTrackHint: string;
    yourChits: string;
    sharedWithMe: string;
    activeCount: string;
  };
  chitsPage: {
    title: string;
    subtitle: string;
    organise: string;
    tracking: string;
    shared: string;
    empty: string;
  };
  collections: {
    title: string;
    subtitle: string;
    dayBook: string;
    allChits: string;
    membersPaid: string;
    uniquePeople: string;
    register: string;
  };
  profile: {
    title: string;
    phone: string;
    name: string;
    email: string;
    language: string;
    languageHint: string;
    invite: string;
    inviteHint: string;
    danger: string;
    dangerHint: string;
    deleteAccount: string;
    deleteConfirm: string;
    phoneHint: string;
    editProfile: string;
    saving: string;
  };
  login: {
    tagline: string;
    firstName: string;
    lastName: string;
    phone: string;
    sendOtp: string;
    verify: string;
    signedIn: string;
    goDashboard: string;
    enterOtp: string;
  };
  newChit: {
    title: string;
    pickType: string;
    auctionStyle: string;
    fixedStyle: string;
    terms: string;
    membersStep: string;
    summary: string;
    settings: string;
    create: string;
    creating: string;
    groupName: string;
    groupNameHint: string;
    startDate: string;
    duration: string;
    memberCount: string;
    frequency: string;
    frequencyHint: string;
    addMember: string;
    addHand: string;
    memberVisible: string;
    memberVisibleHint: string;
  };
  type: {
    auction: string;
    fixed: string;
    base_premium: string;
    loan: string;
    lucky_draw: string;
    hand_sacrifice: string;
  };
  typeBody: {
    auction: string;
    fixed: string;
    loan: string;
  };
  auctionStyle: {
    collect_first: string;
    collect_first_body: string;
    auction_first: string;
    auction_first_body: string;
  };
  fixedStyle: {
    fixed_order: string;
    fixed_order_body: string;
    lucky_draw: string;
    lucky_draw_body: string;
    hand_sacrifice: string;
    hand_sacrifice_body: string;
  };
  freq: {
    daily: string;
    weekly: string;
    biweekly: string;
    monthly: string;
    quarterly: string;
    halfyearly: string;
    yearly: string;
  };
  freqHint: {
    daily: string;
    weekly: string;
    biweekly: string;
    monthly: string;
    quarterly: string;
    halfyearly: string;
    yearly: string;
  };
  mode: {
    cash: string;
    upi: string;
    bank: string;
    cheque: string;
    adjusted: string;
  };
  detail: {
    type: string;
    frequency: string;
    closeHapta: string;
    recordPayment: string;
    settings: string;
    overview: string;
    ledger: string;
  };
  status: {
    running: string;
    completed: string;
    cancelled: string;
    draft: string;
  };
};
