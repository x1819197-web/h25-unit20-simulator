# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
root = Path(SPECPATH)
a = Analysis([str(root / 'unit20_launcher_app.py')], pathex=[str(root)],
             binaries=[], datas=[(str(root / 'deploy_unit20'), 'app')],
             hiddenimports=['webview.platforms.edgechromium', 'webview.platforms.winforms'],
             hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=[], noarchive=False)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name='UNIT20-Simulator',
          debug=False, strip=False, upx=True, console=False)
