/* Screen 7 - VENTILATION. Pixel-measured overlays. */
window.SCR_VENT = {
  id: "vent",
  bg: "ref/07_ventilation.png",
  title: "7 VENTILATION",
  nav: "VENTILATION",
  navList: ["START-UP", "FFD CONTROL", "SYNCHRO. &EXC. OPE.", "FUEL GAS", "LUBE OIL", "GENERATOR", "VENTILATION", "IBH CONTROL", "MOTORS", "MENU"],
  values: [
    ["INLET_T1", 88, 68, 81, 17, 11, "degC"],
    ["INLET_T2", 88, 132, 81, 17, 11, "degC"],
    ["SC_FILT_DP", 283, 87, 80, 16, 10, "kPa"],
    ["HEPA_DP", 375, 87, 99, 16, 10, "kPa"],
    ["CPR_IN_T", 366, 135, 80, 16, 11, "degC"],
    ["TURB_COMPT_T", 671, 206, 80, 17, 11, "degC"],
    ["MW_REF", 294, 254, 56, 13, 10, ""],
    ["MW_FDBK", 294, 271, 56, 13, 10, ""],
    ["INNER_BARREL_T", 788, 260, 61, 13, 10, "degC"],
    ["EXH_T", 949, 242, 70, 17, 12, "degC"],
    ["SPEED", 949, 301, 69, 16, 12, "min-1"],
    ["SPEED_PCT", 949, 319, 69, 16, 12, "%"],
  ],
  motors: [
    {id:"evac1", x:275, y:128, d:23},
    {id:"ven1", x:726, y:113, d:22},
    {id:"ven2", x:818, y:113, d:22},
    {id:"bc1", x:686, y:404, d:21},
    {id:"bc2", x:774, y:404, d:21},
  ],
  pumps: [
    {id:"evac1", x:252, y:128, d:23, dir:"fan"},
    {id:"ven1", x:725, y:135, d:25, dir:"fan"},
    {id:"ven2", x:817, y:135, d:25, dir:"fan"},
    {id:"bc1", x:707, y:404, d:22, dir:"fan"},
    {id:"bc2", x:795, y:404, d:22, dir:"fan"},
  ],
  buttons: [
    {x:933, y:462, w:102, h:37, fs:10, label:"MASTER RESET", g:null, v:null, act:"reset"},
    {x:1038, y:462, w:72, h:37, fs:11, label:"TRIP", g:null, v:null, act:"trip"},
  ],
  render: function (page) { renderOverlay(page, this); }
};
