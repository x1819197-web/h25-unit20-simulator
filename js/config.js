/* H25 UNIT-20 markaziy konfiguratsiya — BARCHA konstantalar shu yerda.
 * Taxminiy (originali noaniq) qiymatlar TODO(Qn) bilan belgilangan.
 * AUDIT.md 7-bo'limdagi savollarga javob kelganda shu yerdan almashtiriladi. */

window.H25_CFG = {
  /* ---- simulyatsiya qadami ---- */
  TICK_MS: 500,          // qat'iy fizika qadami
  ACCUM_MS: 100,         // accumulator tekshiruvi (fon tabda yetib olish)
  MAX_DT_MS: 5000,       // bitta siklda maksimal yetib olish (cheklangan)
  SIM: {
    /* 1 = haqiqiy vaqt (PPE-10-1420 jadvali bo'yicha to'liq start 153 min).
     * Tezlashtirish: ?ts=60 yoki pastdagi SIM tugmasi (1/10/60/300).
     * Tezlik FAQAT vaqt o'lchovini ko'paytiradi — fizika qadami 5 s dan oshmaydi. */
    timeScale: 1,
    maxSubstepS: 5
  },

  /* ---- exhaust radar geometriyasi (PAGE koordinatalar: stage_y - 24) ----
   * O'lchov dalili (2026-10-06, ref/11_exhaust.png gradient+spoke tahlili):
   * halqalar/spoklar markazi STAGE (388,284), tashqi halqa R~183-186.
   * Eski poligon markazi PAGE (375,298) [STAGE (375,322)] edi:
   *   dx = +13 px (o'ngga), dy = -38 px (yuqoriga) siljish kerak.
   * Foydalanuvchi o'lchovi (+20,-55) bilan bir yo'nalishda. */
  PLOT: {
    cxPage: 388, cyPage: 260, R: 184,
    T_MIN: 0, T_MAX: 800
    // TODO(Q1): 200/400/600/800 halqa yozuvlari shu shkala (T/800*R) deb faraz
    // qilindi. Original halqa shkalasi boshqacha bo'lsa shu yerdan tuzatiladi.
  },

  /* ---- TC dinamikasi ---- */
  TC: {
    N: 18,
    tauRun: 4,        // TODO(Q3): birinchi tartibli kechikish, ish rejimida (s)
    tauGasCool: 30,   // TODO(Q3): flame-off gaz trakti tez inersiyasi (s)
    tauMetalRun: 120, // TODO(Q3): ish rejimida metall massasi (s)
    tauMetalCool: 330,// TODO(Q3): flame-off metall sekin inersiyasi (s) — 10 min da deyarli nol
    metalW: 0.65,     // TODO(Q3): ko'rsatkichdagi metall ulushi (0.35 gaz + 0.65 metall)
    biasMin: 0, biasMax: 0, // FOYDALANUVCHI TALABI: TC lar referens nuqtada
    // qoqiladi (displeyda suzish yo'q); dinamika (yuk/trip javobi) saqlangan
    seed: 20,         // takrorlanuvchi seed (UNIT-20)
    noiseMax: 0,    // shovqin o'chirilgan (displeyda miltillash yo'q)
    noiseT1: 47, noiseT2: 23, // TODO(Q3): past chastotali shovqin davrlari (s)
    noiseA1: 0, noiseA2: 0
  },

  /* ---- exhaust harorat / spread (FAQAT 18 TC dan) ---- */
  EXH: {
    // TODO(Q1): Exhaust Temp = TC o'rtachasi deb faraz qilindi.
    // Original formulasi (median/vaznli) ma'lum bo'lsa shu yerga yoziladi.
    tempFn: "mean",
    // TODO(Q1): Spread ta'riflari GE uslubi taxmini:
    // S1 = max-min, S2 = max - 2-eng-past, S3 = max - 3-eng-past.
    allowBase: 60,    // TODO(Q1): ALLOW_SPREAD = base + slope*(P/28.6); bazada 90 chiqadi
    allowSlope: 30,
    spreadAlarmS: 10, // TODO(Q1): chegaradan oshsa alarmgacha vaqt (s)
    spreadTripS: 20,  // TODO(Q1): ...va trip'gacha qo'shimcha emas, jami vaqt (s)
    spreadTripItem: "30SPT" // TRIP MONITOR dagi "High Exhaust Temperature Spread Trip"
  },

  /* ---- sync-check (43-25G / 43-25L relelari) ----
   * 84R = generator (running) kuchlanishi normal, 84I = tarmoq (incoming)
   * kuchlanishi normal. 52G faqat oynada yopiladi. */
  SYNC: {
    gridHz: 50.0,
    gridKV: 10.92,
    dfMax: 0.1,   // |df| <= 0.1 Hz
    dvPct: 5,     // |dV| <= 5 %
    dphiMax: 10   // |dphi| <= 10 grad
  },

  /* ---- start/stop sekvensiyasi (PPE-10-1420 "Plant Start-up/Shut-down") ----
   * Barcha vaqtlar daqiqada, real vaqtda. To'liq start (crank+purge+ignition
   * +accelerate+load) ~153 min; tezlashtirish faqat timeScale bilan. */
  SEQ: {
    purgeSpeed: 1456,        // 20 % nominal (purge / ignition speed)
    crankRatePctPerMin: 20,  // 0 -> 20 % krank
    purgeMin: 12,            // 20 % da purj (havo almashinuvi)
    ignitionHoldS: 60,       // olov barqarorlashguncha 20 % da ushlash
    warmupMin: 3,            // ignitiondan keyin istish (20 %)
    accelPctPerMin: 10.5,    // 20 % -> 100 % tezlanish
    fsplPct: 100,            // FSNL (full speed no load)
    ignFfd: 20,              // ignition fuel demand %
    warmFfd: 22,
    hold10Min: 30,           // 10 % (2.7 MW) ushlash — egri bo'yicha >30 min
    hold25Min: 30,           // 25 % (6.78 MW) ushlash
    p10MW: 2.7,              // 10 % boshlang'ich yuk
    p25MW: 6.78,             // 25 % ushlash yuki
    loadRate0to10: 0.12,     // MW/min
    loadRate10to25: 0.54,    // MW/min
    loadRate25plus: 1.36,    // MW/min
    unloadRate: 1.36,        // MW/min
    coastTauS: 420,          // trip/stop keyin rotor sekinlashuvi (s)
    coolTargetC: 66,         // wheelspace < 66 C -> Ready to Start
    coolTauOnS: 300,         // cooldown ON: turning gear bilan
    coolTauOffS: 900         // cooldown OFF: tabiiy sovish
  },

  /* ---- himoyalar (Karta ustavok GTU-2,3 2025) ---- */
  PROT: {
    overSpeedPct: 110,       // 12H   8008 rpm
    overSpeed2Pct: 111,      // 12H_P 8081 rpm
    vibTrip: 155,            // 39VTX um, 3 s
    vibDelayS: 3,
    genVibTrip: 150,
    lubePTrip: 0.059,        // 63QTX MPa, 3 s
    lubePAlarm: 0.078,
    lubePDelayS: 3,
    lubeTTrip: 80,           // 26QT degC
    lubeTAlarm: 74,
    fuelPTrip: 2.38,         // 63FGLT MPa, 15 s
    fuelPAlarm: 2.93,
    fuelPDelayS: 15,
    exhTripMargin: 22,       // 66TXT: EXH_REF + 22 C, 3 s
    exhDelayS: 3,
    hydTrip: 6.10,           // 63HQLT MPa, 2 s
    hydDelayS: 2,
    flameLossExhC: 300,      // 26DT: olov bor, EXH juda past, 3 s
    flameLossDelayS: 3
  },

  /* ---- KU-20 (2D-BLOKDA ishlatiladi; hozir faqat saqlanadi) ---- */
  KU: {
    // TODO(Q4): IAPWS-IF97 T_sat, Cv kalibrlash, klapan xarakteristikalari
    pNom: 31.8, feedNom: 55.5, steamNom: 51.0, blowNom: 3.9
  }
};
