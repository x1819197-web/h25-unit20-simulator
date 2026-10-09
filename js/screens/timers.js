/* Screen 15 - TIMERS. */
window.SCR_TIM = {
  id: "tim",
  bg: "ref/15_timer.png",
  title: "15 TIMER",
  nav: "TIMERS",
  navList: ["START-UP", "START CHECK", "TIMERS", "TRIP MONITOR", "DATA REPORT 1", "DATA REPORT 2", "MENU"],
  values: [
    ["EOH_L", 367, 86, 121, 22, 13, "hrs"],
    ["EOH_R", 795, 86, 121, 23, 13, "hrs"],
    ["AOH_L", 367, 158, 121, 17, 12, "hrs"],
    ["GAS_L", 367, 182, 121, 17, 12, "hrs"],
    ["AOH_R", 795, 158, 121, 17, 12, "hrs"],
    ["GAS_R", 795, 183, 121, 17, 12, "hrs"],
    ["FS_N", 367, 265, 121, 17, 12, "CNT"],
    ["ET_NT", 367, 289, 121, 17, 12, "CNT"],
    ["TOT_ST", 367, 314, 121, 16, 12, "CNT"],
    ["TOT_ET", 367, 337, 121, 16, 12, "CNT"],
    ["FS_N_R", 795, 265, 121, 17, 12, "CNT"],
    ["ET_NT_R", 795, 290, 121, 17, 12, "CNT"],
    ["TOT_ST_R", 795, 314, 121, 17, 12, "CNT"],
    ["TOT_ET_R", 795, 337, 121, 17, 12, "CNT"],
    ["RST_DATE", 842, 427, 110, 19, 11, ""],
    ["RST_TIME", 964, 427, 111, 19, 11, ""],
  ],
  buttons: [
    {x:596, y:399, w:104, h:14, fs:9, label:"COUNTER RESET", g:null, v:null, act:"countreset"},
    {x:933, y:467, w:102, h:30, fs:10, label:"MASTER RESET", g:null, v:null, act:"reset"},
    {x:1039, y:466, w:69, h:32, fs:11, label:"TRIP", g:null, v:null, act:"trip"},
  ],
  render: function (page) { renderOverlay(page, this); }
};
