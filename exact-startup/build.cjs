/* Generate the standalone preview from the existing source of truth. No image assets. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
fs.writeFileSync(path.join(__dirname,'core.bundle.js'),['config','rng','exhaust-math','tags','engine'].map(n=>fs.readFileSync(path.join(root,'js',n+'.js'),'utf8')).join('\n;\n'));
fs.writeFileSync(path.join(__dirname,'startup-data.js'),fs.readdirSync(path.join(root,'js/screens')).filter(n=>n.endsWith('.js')).map(n=>fs.readFileSync(path.join(root,'js/screens',n),'utf8')).join('\n;\n')); 
console.log('Built H25 native SVG pages and shared controls; no raster assets.');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="screen.css">','<style>'+fs.readFileSync(path.join(__dirname,'screen.css'),'utf8')+'</style>');
for(const name of ['core.bundle.js','model-controls.js','startup-data.js','views.js','screen.js'])html=html.replace('<script src="'+name+'"></script>',()=>'<script>\n'+fs.readFileSync(path.join(__dirname,name),'utf8')+'\n</script>');
fs.writeFileSync(path.join(__dirname,'standalone.html'),html);
console.log('Wrote standalone.html (all code and styles embedded, no network dependencies).');
