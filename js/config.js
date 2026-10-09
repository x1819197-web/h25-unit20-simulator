/* H25 UNIT-20 markaziy konfiguratsiya — BARCHA konstantalar shu yerda.
 * Taxminiy (originali noaniq) qiymatlar TODO(Qn) bilan belgilangan.
 * AUDIT.md 7-bo'limdagi savollarga javob kelganda shu yerdan almashtiriladi. */

window.H25_CFG = {
  /* ---- simulyatsiya qadami ---- */
  TICK_MS: 500,          // qat'iy fizika qadami
  ACCUM_MS: 100,         // accumulator tekshiruvi (fon tabda yetib olish)
  MAX_DT_MS: 5000,       // bitta siklda maksimal yetib olish (cheklangan)

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
    biasMin: -4, biasMax: 4, // TODO(Q3): individual siljish oralig'i (degC), seedli
    seed: 20,         // takrorlanuvchi seed (UNIT-20)
    noiseMax: 0.3,    // shovqin chegarasi (degC) — bundan oshmaydi
    noiseT1: 47, noiseT2: 23, // TODO(Q3): past chastotali shovqin davrlari (s)
    noiseA1: 0.12, noiseA2: 0.08
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

  /* ---- sync-check (2C-BLOKDA ishlatiladi; hozir faqat saqlanadi) ---- */
  SYNC: {
    dfMax: 0.1,   // TODO(Q2): |df| <= 0.1 Hz taxmin
    dvPct: 5,     // TODO(Q2): |dV| <= 5 % taxmin
    dphiMax: 10   // TODO(Q2): |dphi| <= 10 grad taxmin
  },

  /* ---- KU-20 (2D-BLOKDA ishlatiladi; hozir faqat saqlanadi) ---- */
  KU: {
    // TODO(Q4): IAPWS-IF97 T_sat, Cv kalibrlash, klapan xarakteristikalari
    pNom: 31.8, feedNom: 55.5, steamNom: 51.0, blowNom: 3.9
  }
};
