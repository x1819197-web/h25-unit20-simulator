/* UNIT-20 build: MANBA bitta (repo ildizi), deploy_unit20/ faqat chiqish.
 * Qo'lda tahrirlanmaydi — har safar shu skript generatsiya qiladi:
 *   node build.js   (h25 + ku nusxalarini yangilaydi)
 * Shunda ikki nusxa ajralib ketmaydi (talab 5). */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_H25 = path.join(ROOT, "deploy_unit20", "h25");

function copyDir(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip && skip.includes(f.name)) continue;
    const s = path.join(src, f.name), d = path.join(dst, f.name);
    if (f.isDirectory()) n += copyDir(s, d, skip);
    else { fs.copyFileSync(s, d); n++; }
  }
  return n;
}

let total = 0;
// h25: index + css + js + ref (manba: AUDIT/tests/tools/build o'zi chiqmaydi)
fs.copyFileSync(path.join(ROOT, "index.html"), path.join(OUT_H25, "index.html"));
total++;
total += copyDir(path.join(ROOT, "css"), path.join(OUT_H25, "css"));
total += copyDir(path.join(ROOT, "js"), path.join(OUT_H25, "js"));
total += copyDir(path.join(ROOT, "ref"), path.join(OUT_H25, "ref"));

console.log(`BUILD h25 -> deploy_unit20/h25: ${total} fayl`);
// TODO(2D): KU manbai D:\\qozon\\simulyatsiya\\index.html shu repo'ga ko'chirilgach,
// build.js ku nusxani ham generatsiya qiladi. Hozir ku qo'lda (muzlatilgan).
console.log("BUILD ku: SKIP (2D-blokda ulanadi)");
