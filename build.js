/* Reproducible native web/desktop artifact. deploy_unit20 is generated only. */
'use strict';
const fs = require('fs'),
  path = require('path');
require('./exact-startup/build.cjs');
const root = __dirname,
  out = path.join(root, 'deploy_unit20');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'h25'), { recursive: true });
for (const name of ['index.html', 'css', 'js'])
  fs.cpSync(path.join(root, name), path.join(out, 'h25', name), {
    recursive: true,
  });
fs.cpSync(path.join(root, 'ku'), path.join(out, 'ku'), { recursive: true });
const kuIndex = path.join(out, 'ku', 'index.html');
fs.writeFileSync(
  kuIndex,
  fs
    .readFileSync(kuIndex, 'utf8')
    .replaceAll('../css/', '../h25/css/')
    .replaceAll('../js/', '../h25/js/')
    .replace(
      /window\.UNIT20_H25_ENTRY\s*=\s*[\'\"]\.\.\/index\.html[\'\"]/,
      "window.UNIT20_H25_ENTRY='../h25/index.html'",
    ),
);
// The accepted original-layout HMI is now the public entry, not the old redesign.
fs.copyFileSync(path.join(root, 'unit20.html'), path.join(out, 'unit20.html'));
for (const entry of ['index.html', 'h25/index.html']) {
  fs.copyFileSync(path.join(root, 'exact-startup', 'standalone.html'), path.join(out, entry));
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(
  path.join(out, 'version.json'),
  JSON.stringify(
    {
      version: require('./package.json').version,
      renderer: 'native-original-layout-svg',
      layout: 'fill-viewport',
      bottomScreenTabs: false,
      f24: 'white when FFD < live KD4H; independent SVG sector',
      sources: 'exact-startup/ + js/engine.js',
      model: 'educational, not OEM certified',
    },
    null,
    2,
  ) + '\n',
);
console.log('Built native H25 + KU-20. No reference images included.');
