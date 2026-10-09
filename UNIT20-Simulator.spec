# -*- mode: python ; coding: utf-8 -*-
# UNIT-20: H25 gaz turbina + KU-20 qozon — bitta offline exe.
# Qayta yig'ish: build_unit20.bat

a = Analysis(
    ['unit20_launcher_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('index.html', 'app/h25'),
        ('css', 'app/h25/css'),
        ('js', 'app/h25/js'),
        ('ref', 'app/h25/ref'),
        (r'D:\qozon\simulyatsiya\index.html', 'app/ku'),
        (r'D:\qozon\simulyatsiya\ref', 'app/ku/ref'),
    ],
    hiddenimports=['webview', 'clr', 'clr_loader', 'pythonnet',
                   'webview.platforms.edgechromium',
                   'webview.platforms.winforms',
                   'webview.platforms.cef'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='UNIT20-Simulator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
