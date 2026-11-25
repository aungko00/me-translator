export const APP_VERSION = '1.1.20';
export const ANDROID_VERSION_CODE = 130;
export const DEFAULT_GITHUB_REPO = 'aungko00/me-translator';

export const RELEASE_HISTORY = [
  {
    version: '1.1.20',
    titleEn: 'Floating Quick Translator Background & System Overlay Fix',
    titleMy: 'အမြန်ဘာသာပြန်ဝင်းဒိုး နောက်ခံနှင့် တခြားအက်ပ်များအပေါ်မှ အသုံးပြုနိုင်မှု ပြင်ဆင်ချက်',
    notesEn: [
      'Floating Quick Translator Fix: Fixed an issue where Floating Quick Translator stopped when leaving the app. On Android, it now runs as a system-wide draggable floating bubble and translator window over other apps once "Display over other apps" permission is enabled.',
      'Quick Controls Outside App: Translate directly over messaging or social apps with language switching, Paste, Copy, Minimize to bubble, Maximize back to app, and Close controls.',
      'Background Mode & Desktop Pop-Out: Added Display Over Other Apps permission + Auto-Float settings in Permissions, plus always-on-top Picture-in-Picture support on desktop browsers.',
    ],
    notesMy: [
      'Floating Quick Translator ပြင်ဆင်မှု - အက်ပ်ထဲမှ ထွက်လိုက်သည့်အခါ အမြန်ဘာသာပြန်စနစ် ရပ်သွားသည့်ပြဿနာကို ပြင်ဆင်ပေးထားပါသည်။ Android တွင် "Display over other apps" ခွင့်ပြုချက်ဖွင့်ထားပါက တခြားအက်ပ်များအပေါ်မှ ဆက်လက်ဖွင့်ပြီး ဘာသာပြန်နိုင်ပါပြီ။',
      'အက်ပ်ပြင်ပ အမြန်လုပ်ဆောင်ချက်များ - တခြားအက်ပ်များပေါ်တွင်ပင် ဘာသာစကားရွေးခြင်း၊ Paste၊ Copy၊ ချုံ့ခြင်း (Bubble)၊ အက်ပ်အပြည့်ပြန်ဖွင့်ခြင်းနှင့် ပိတ်ခြင်းတို့ကို တိုက်ရိုက်အသုံးပြုနိုင်ပါပြီ။',
      'နောက်ခံချိန်ညှိမှုနှင့် Desktop Pop-Out - Settings > Permissions ထဲတွင် Display Over Other Apps ခွင့်ပြုချက်နှင့် Auto-Float ခလုတ် ထည့်သွင်းထားပြီး Desktop Browser များတွင်လည်း Picture-in-Picture ဖြင့် ထုတ်သုံးနိုင်ပါပြီ။',
    ],
  },
  {
    version: '1.1.19',
    titleEn: 'Floating Quick Translator & Persistent Changelog',
    titleMy: 'အမြန်ဘာသာပြန်ဝင်းဒိုးနှင့် ဗားရှင်းမှတ်တမ်းစနစ်',
    notesEn: [
      'Floating Quick Translator: Added a theme-matched top-right button to open a resizable Quick Translate window with Minimize, Maximize, and Close controls.',
      "Persistent Release History: Version What's New notes now stay preserved inside App Updates & Version after every update.",
    ],
    notesMy: [
      'အမြန်ဘာသာပြန် မျက်နှာပြင်အသစ် - ညာဘက်အပေါ်ထောင့်မှ ခလုတ်ဖြင့် ချုံ့ခြင်း၊ ချဲ့ခြင်းနှင့် ပိတ်ခြင်းတို့ ပြုလုပ်နိုင်သော အမြန်ဘာသာပြန်ဝင်းဒိုးကို အသုံးပြုနိုင်ပါပြီ။',
      'ဗားရှင်းမှတ်တမ်း ထိန်းသိမ်းမှု - အပ်ဒိတ်တင်ပြီးတိုင်း ဗားရှင်းတစ်ခုချင်းစီ၏ အသစ်ပါဝင်ချက်များကို အက်ပ်အပ်ဒိတ်စာမျက်နှာတွင် အမြဲတမ်းပြန်လည်ကြည့်ရှုနိုင်ပါပြီ။',
    ],
  },
  {
    version: '1.1.18',
    titleEn: 'Conversation Rename, Hover Polish & Settings Upgrade',
    titleMy: 'စကားပြောခန်း အမည်ပြောင်းခြင်းနှင့် ဆက်တင်အဆင့်မြှင့်တင်မှု',
    notesEn: [
      'Conversation Rename: Added an Edit button to rename saved chats anytime from a quick popup.',
      'Touch & Hover Polish: Added theme-matched button hover and press effects while preventing accidental text selection.',
      'Settings & About: Dropdowns now float cleanly over Save and Close buttons on smaller screens, plus a new AI accuracy notice in About.',
    ],
    notesMy: [
      'စကားပြောခန်း အမည်ပြောင်းခြင်း - သိမ်းဆည်းထားသော စကားပြောခန်းများကို အချိန်မရွေး အမည်ပြောင်းနိုင်ပါပြီ။',
      'ခလုတ်ဒီဇိုင်းနှင့် ထိတွေ့မှု - ခလုတ်များတွင် အပြင်အဆင်အလိုက် တုံ့ပြန်မှုပုံစံသစ်များ ထည့်သွင်းပြီး မလိုအပ်ဘဲ စာသားရွေးမိခြင်းကို ပိတ်ထားပါပြီ။',
      'ဆက်တင်နှင့် အသိပေးချက် - ဖန်သားပြင်သေးချိန် ရွေးချယ်မှုစာရင်းများ အပေါ်မှ ရှင်းလင်းစွာပေါ်စေပြီး ဘာသာပြန်တိကျမှုဆိုင်ရာ အသိပေးချက် ထည့်သွင်းထားပါပြီ။',
    ],
  },
  {
    version: '1.1.17',
    titleEn: 'Language Pair Switcher & Chat Favorites',
    titleMy: 'ဘာသာစကား အမြန်ပြောင်းစနစ်နှင့် စကားပြောခန်းမှတ်တမ်း',
    notesEn: [
      'Header Language Bar: Added quick source and target language selectors with one-tap swap in the top bar.',
      'Favorites & Search: Added conversation search and a dedicated Favorites tab inside Chat History.',
      'Isolated Settings Tabs: Appearance, Audio, and API settings now save independently without blocking each other.',
    ],
    notesMy: [
      'ဘာသာစကား အမြန်ရွေးစနစ် - အပေါ်ဘားမှတစ်ဆင့် မူရင်းနှင့် ဘာသာပြန်ဘာသာစကားများကို တိုက်ရိုက်ရွေးချယ် လဲလှယ်နိုင်ပါပြီ။',
      'မှတ်တမ်းရှာဖွေမှုနှင့် အကြိုက်ဆုံး - စကားပြောခန်းများကို ရှာဖွေနိုင်ပြီး အကြိုက်ဆုံးစာရင်း သီးသန့်သိမ်းဆည်းနိုင်ပါပြီ။',
      'သီးခြားဆက်တင်သိမ်းဆည်းမှု - အသွင်အပြင်၊ အသံနှင့် စနစ်ချိန်ညှိချက်များကို တစ်ခုချင်းစီ သီးခြားသိမ်းဆည်းနိုင်ပါပြီ။',
    ],
  },
  {
    version: '1.1.16',
    titleEn: 'In-App Updater, E2E Key Vault & Typography',
    titleMy: 'အလိုအလျောက် အပ်ဒိတ်စနစ်နှင့် မြန်မာစာလုံးဒီဇိုင်းများ',
    notesEn: [
      'In-App APK Updater: Automatic update detection and direct download/install flow inside Android.',
      'Encrypted API Vault: Local AES-GCM-256 encryption for saved Gemini and Groq API keys.',
      'Myanmar Typography Suite: Added curated Myanmar serif, gothic, and clean Unicode font pairings.',
    ],
    notesMy: [
      'အက်ပ်တွင်း အပ်ဒိတ်စနစ် - ဗားရှင်းအသစ်များကို အလိုအလျောက်စစ်ဆေးပြီး တိုက်ရိုက်ဒေါင်းလုဒ်ဆွဲ တပ်ဆင်နိုင်ပါပြီ။',
      'လုံခြုံရေးသော့သိမ်းဆည်းမှု - ထည့်သွင်းထားသော စနစ်သော့များကို စက်တွင်း၌ ကုဒ်ဝှက်စနစ်ဖြင့် လုံခြုံစွာသိမ်းဆည်းပေးပါသည်။',
      'မြန်မာဖောင့်အလှစုံ - ဖတ်ရှုရလွယ်ကူလှပသော မြန်မာစာလုံးပုံစံ အမျိုးမျိုးကို ရွေးချယ်နိုင်ပါပြီ။',
    ],
  },
];

export const RELEASE_WHATS_NEW =
  '• Floating Quick Translator Fix: Fixed Floating Quick Translator stopping when exiting the app — Android now supports a system-wide background floating bubble & translator window over other apps (with Display Over Other Apps permission).\n' +
  '• Outside-App Controls & Desktop Pop-Out: Translate over other apps with language switching, Paste, Copy, Minimize, Maximize, and Close, plus Desktop Browser Picture-in-Picture mode.\n\n' +
  '• Floating Quick Translator ပြင်ဆင်မှု - အက်ပ်ထဲမှ ထွက်လိုက်လျှင် အမြန်ဘာသာပြန်ဝင်းဒိုး ရပ်သွားသည့်ပြဿနာကို ပြင်ဆင်ထားပါသည်။ Android တွင် "Display over other apps" ခွင့်ပြုချက်ဖြင့် တခြားအက်ပ်များအပေါ်မှ နောက်ခံတွင် ဆက်လက်ဖွင့်ပြီး ဘာသာပြန်နိုင်ပါပြီ။\n' +
  '• အက်ပ်ပြင်ပ ထိန်းချုပ်မှုနှင့် Desktop Pop-Out - တခြားအက်ပ်များပေါ်မှ ဘာသာစကားပြောင်းခြင်း၊ Paste၊ Copy၊ ချုံ့/ချဲ့/ပိတ်ခြင်းများနှင့် Desktop Browser Picture-in-Picture စနစ်တို့ ထည့်သွင်းထားပါသည်။';
