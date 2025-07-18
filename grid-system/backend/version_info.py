from PyInstaller.utils.win32.versioninfo import (
    VSVersionInfo,
    FixedFileInfo,
    StringFileInfo,
    StringTable,
    StringStruct,
    VarFileInfo,
    VarStruct
)

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
                        StringStruct('FileDescription', 'Grid System Application'),
                        StringStruct('FileVersion', '1.0.0.0'),
                        StringStruct('InternalName', 'GridSystem'),
                        StringStruct('LegalCopyright', 'Copyright (C) 2025 ThadoSoft'),
                        StringStruct('OriginalFilename', 'main.exe'),
                        StringStruct('ProductName', 'Grid System'),
                        StringStruct('ProductVersion', '1.0.0.0')
                    ]
                )
            ]
        ),
        VarFileInfo([VarStruct('Translation', [1033, 1200])])
    ]
)