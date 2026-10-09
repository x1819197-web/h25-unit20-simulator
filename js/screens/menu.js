/* MENU - unified screen list. One program, all 19 screens.
 * No ref background (bg:null -> refbg hidden, clean panel). */
window.SCR_MENU = {
  id: "menu",
  bg: null,
  title: "MENU",
  nav: "MENU",
  navList: ["START-UP", "FFD CONTROL", "SYNCHRO. &EXC. OPE.", "FUEL GAS", "LUBE OIL",
    "GENERATOR", "VENTILATION", "IBH CONTROL", "MOTORS", "BEARING OIL",
    "EXHAUST", "VIBRATION", "WHEEL SPACE", "START CHECK", "TIMERS", "TRIP MONITOR",
    "DATA REPORT 1", "DATA REPORT 2", "OVERSPEED"],
  headers: [
    {x:254, y:8, w:600, h:30, fs:18, text:"H25 GAS TURBINE GENERATOR - UNIT-20"},
    {x:404, y:42, w:300, h:22, fs:13, text:"SCREEN MENU"},
  ],
  values: [
    ["GEN_POWER", 504, 70, 100, 20, 13, "MW"],
    ["SPEED", 504, 94, 100, 20, 13, "min-1"],
    ["FOFFD", 504, 118, 100, 20, 13, "FFD"],
  ],
  buttons: [
    {x:154, y:150, w:320, h:32, fs:13, label:"1 START-UP", act:"goto", to:"startup"},
    {x:634, y:150, w:320, h:32, fs:13, label:"2 FFD CONTROL", act:"goto", to:"ffd"},
    {x:154, y:186, w:320, h:32, fs:13, label:"3 SYNCHRO. &EXC. OPE.", act:"goto", to:"sync"},
    {x:634, y:186, w:320, h:32, fs:13, label:"4 FUEL GAS", act:"goto", to:"fuelgas"},
    {x:154, y:222, w:320, h:32, fs:13, label:"5 LUBE OIL", act:"goto", to:"lube"},
    {x:634, y:222, w:320, h:32, fs:13, label:"6 GENERATOR", act:"goto", to:"gen"},
    {x:154, y:258, w:320, h:32, fs:13, label:"7 VENTILATION", act:"goto", to:"vent"},
    {x:634, y:258, w:320, h:32, fs:13, label:"8 IBH CONTROL", act:"goto", to:"ibh"},
    {x:154, y:294, w:320, h:32, fs:13, label:"9 MOTORS", act:"goto", to:"motors"},
    {x:634, y:294, w:320, h:32, fs:13, label:"10 BEARING OIL", act:"goto", to:"brg"},
    {x:154, y:330, w:320, h:32, fs:13, label:"11 EXHAUST", act:"goto", to:"exh"},
    {x:634, y:330, w:320, h:32, fs:13, label:"12 VIBRATION", act:"goto", to:"vib"},
    {x:154, y:366, w:320, h:32, fs:13, label:"13 WHEEL SPACE", act:"goto", to:"ws"},
    {x:634, y:366, w:320, h:32, fs:13, label:"14 START CHECK", act:"goto", to:"sc"},
    {x:154, y:402, w:320, h:32, fs:13, label:"15 TIMERS", act:"goto", to:"tim"},
    {x:634, y:402, w:320, h:32, fs:13, label:"16 TRIP MONITOR", act:"goto", to:"tripm"},
    {x:154, y:438, w:320, h:32, fs:13, label:"17 DATA REPORT 1", act:"goto", to:"dr1"},
    {x:634, y:438, w:320, h:32, fs:13, label:"18 DATA REPORT 2", act:"goto", to:"dr2"},
    {x:394, y:474, w:320, h:32, fs:13, label:"19 OVERSPEED", act:"goto", to:"os"},
  ],
  render: function (page) { renderOverlay(page, this); }
};
