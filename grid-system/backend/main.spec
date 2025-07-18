# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.win32.versioninfo import (
    VSVersionInfo,
    FixedFileInfo,
    StringFileInfo,
    StringTable,
    StringStruct,
    VarFileInfo,
    VarStruct
)

block_cipher = None

version_info = VSVersionInfo(
    ffi=FixedFileInfo(
        filevers=(1, 0, 0, 0),
        prodvers=(1, 0, 0, 0),
        mask=0x3f,
        flags=0x0,
        OS=0x40004,
        fileType=0x1,
        subtype=0x0,
        date=(0, 0)
    ),
    kids=[
        StringFileInfo(
            [
                StringTable(
                    '040904b0',
                    [
                        StringStruct('CompanyName', 'ThadoSoft'),
                        StringStruct('FileDescription', 'Grid Caller Button For Woker To Call Robot Application'),
                        StringStruct('FileVersion', '1.0.0.0'),
                        StringStruct('InternalName', 'ThadoSoftCallerSystem'),
                        StringStruct('LegalCopyright', 'Copyright (C) 2025 ThadoSoft'),
                        StringStruct('OriginalFilename', 'ThadoSoftCaller.exe'),
                        StringStruct('ProductName', 'ThadoSoftCaller'),
                        StringStruct('ProductVersion', '1.0.0.0')
                    ]
                )
            ]
        ),
        VarFileInfo([VarStruct('Translation', [1033, 1200])])
    ]
)

a = Analysis(
    ['main.py'],
    pathex=['D:\\Project\\Honda_F1\\thadosoftcaller.client_24_4\\thadosoftcaller.client_21_4\\thadosoftcaller.client_21_4\\thadosoftcaller.client\\grid-system\\backend'],
    binaries=[],
    datas=[
        ('dist', 'dist'),
        ('app_config.py', '.'),
        ('static/*', 'static'),
        ('config.json', '.'),
        ('READ_ME.txt', '.'),  
    ],
    hiddenimports=[
        'fastapi',
        'pymongo',
        'redis',
        'pydantic_settings',
        'pydantic',
        'uvicorn',
        'database.mongodb',
        'database.redis',
        'services.data_service',
        'services.websocket',
        'services.scheduler',
        'apscheduler',
        'apscheduler.schedulers.asyncio',
        'app_config',
        'bson'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2'],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ThadoSoftCaller',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version=version_info,
)
