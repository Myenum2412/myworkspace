; ── MyWorkspace Custom NSIS Installer Script ──
; This script is included by electron-builder's NSIS generator.

!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "MyWorkspace"
!endif
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.0.0"
!endif
!ifndef PRODUCT_PUBLISHER
  !define PRODUCT_PUBLISHER "MyWorkspace"
!endif
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\MyWorkspace.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Section "MyWorkspace" SEC_MAIN
  SectionIn RO
  CreateDirectory "$DOCUMENTS\MyWorkspaceData"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\database"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\cache"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\uploads"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\downloads"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\backups"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\logs"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\temp"
  CreateDirectory "$DOCUMENTS\MyWorkspaceData\config"
  FileOpen $R1 "$INSTDIR\workspace-config.json" w
  FileWrite $R1 '{$\r$\n'
  FileWrite $R1 '  "workspaceDataPath": "$DOCUMENTS/MyWorkspaceData",$\r$\n'
  FileWrite $R1 '  "version": "${PRODUCT_VERSION}",$\r$\n'
  FileWrite $R1 '  "firstInstall": true$\r$\n'
  FileWrite $R1 '}$\r$\n'
  FileClose $R1
SectionEnd

Section "Desktop Shortcut" SEC_DESKTOP
  CreateShortCut "$DESKTOP\MyWorkspace.lnk" "$INSTDIR\MyWorkspace.exe"
SectionEnd

Section "Start Menu Shortcut" SEC_STARTMENU
  CreateDirectory "$SMPROGRAMS\MyWorkspace"
  CreateShortCut "$SMPROGRAMS\MyWorkspace\MyWorkspace.lnk" "$INSTDIR\MyWorkspace.exe"
  CreateShortCut "$SMPROGRAMS\MyWorkspace\Uninstall.lnk" "$INSTDIR\Uninstall MyWorkspace.exe"
SectionEnd

Section "File Associations" SEC_FILEASSOC
  WriteRegStr HKCR ".mws" "" "MyWorkspace.Project"
  WriteRegStr HKCR "MyWorkspace.Project" "" "MyWorkspace Project File"
  WriteRegStr HKCR "MyWorkspace.Project\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "MyWorkspace.Project\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'
  WriteRegStr HKCR ".mwst" "" "MyWorkspace.Template"
  WriteRegStr HKCR "MyWorkspace.Template" "" "MyWorkspace Template File"
  WriteRegStr HKCR "MyWorkspace.Template\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "MyWorkspace.Template\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'
  WriteRegStr HKCR "myworkspace" "" "URL:MyWorkspace Protocol"
  WriteRegStr HKCR "myworkspace" "URL Protocol" ""
  WriteRegStr HKCR "myworkspace\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "myworkspace\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'
  System::Call "shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)"
SectionEnd

Section "Automatic Updates" SEC_AUTOUPDATE
  FileOpen $R1 "$INSTDIR\auto-update-enabled" w
  FileWrite $R1 "enabled"
  FileClose $R1
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR\*.*"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\MyWorkspace.lnk"
  RMDir /r "$SMPROGRAMS\MyWorkspace"
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  DeleteRegKey HKCR ".mws"
  DeleteRegKey HKCR "MyWorkspace.Project"
  DeleteRegKey HKCR ".mwst"
  DeleteRegKey HKCR "MyWorkspace.Template"
  DeleteRegKey HKCR "myworkspace"
  System::Call "shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)"
SectionEnd


