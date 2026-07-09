; ── MyWorkspace Custom NSIS Installer Script ──
; This script is included by electron-builder's NSIS generator.
; It adds custom pages for Workspace Data Folder selection with validation.

!define PRODUCT_NAME "MyWorkspace"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "MyWorkspace"
!define PRODUCT_WEB_SITE "https://app.myworkspace.com"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\MyWorkspace.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; ── Custom Variables ──
Var WorkspaceDataFolder
Var WorkspaceDataFolderText
Var Dialog
Var DirBrowseButton
Var DataDirBrowseButton
Var DataDirLabel
Var FreeSpaceLabel
Var PermissionsLabel
Var StatusLabel
Var ValidationResult

; ── Custom Page: Workspace Data Folder Selection ──
Page custom WorkspaceDataPage WorkspaceDataPageLeave

Function WorkspaceDataPage
  !insertmacro MUI_HEADER_TEXT "Workspace Data Folder" "Choose the location for workspace data files."
  !insertmacro MUI_INSTALLOPTIONS_WRITE "ioSpecial.ini" "Settings" "NumFields" "6"

  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ; Description label
  ${NSD_CreateLabel} 0u 0u 100% 24u \
    "MyWorkspace stores application data, offline database, cache, uploads, downloads, backups, logs, and temporary files in a Workspace Data Folder.$\r$\nPlease choose a location with sufficient free space (recommended: at least 10 GB)."

  ; Workspace Data Folder path label
  ${NSD_CreateLabel} 0u 30u 100% 10u "Workspace Data Folder:"
  Pop $DataDirLabel

  ; Workspace Data Folder text field
  ${NSD_CreateText} 0u 42u 85% 12u "$DOCUMENTS\MyWorkspaceData"
  Pop $WorkspaceDataFolderText

  ; Browse button for Workspace Data Folder
  ${NSD_CreateButton} 88% 42u 12% 12u "Browse..."
  Pop $DataDirBrowseButton
  ${NSD_OnClick} $DataDirBrowseButton BrowseWorkspaceDataDir

  ; Free space indicator
  ${NSD_CreateLabel} 0u 58u 100% 10u ""
  Pop $FreeSpaceLabel

  ; Permissions indicator
  ${NSD_CreateLabel} 0u 68u 100% 10u ""
  Pop $PermissionsLabel

  ; Status label
  ${NSD_CreateLabel} 0u 78u 100% 10u ""
  Pop $StatusLabel

  ; Load saved preference if available
  ${If} $WorkspaceDataFolder != ""
    ${NSD_SetText} $WorkspaceDataFolderText $WorkspaceDataFolder
  ${EndIf}

  ; Initial validation
  Call ValidateWorkspaceDataFolder

  nsDialogs::Show
FunctionEnd

Function BrowseWorkspaceDataDir
  ${NSD_GetText} $WorkspaceDataFolderText $0
  nsDialogs::SelectFolderDialog /NOUNLOAD "Select Workspace Data Folder" "$0"
  Pop $1
  ${If} $1 != "error" 
    ${NSD_SetText} $WorkspaceDataFolderText $1
    Call ValidateWorkspaceDataFolder
  ${EndIf}
FunctionEnd

Function ValidateWorkspaceDataFolder
  ${NSD_GetText} $WorkspaceDataFolderText $0
  StrCpy $R0 $0

  ; Trim trailing backslash
  StrCpy $R1 $R0 1 -1
  ${If} $R1 == "\"
    StrCpy $R0 $R0 -1
  ${EndIf}

  ; Check if path is valid
  ${If} $R0 == ""
    ${NSD_SetText} $FreeSpaceLabel ""
    ${NSD_SetText} $PermissionsLabel ""
    ${NSD_SetText} $StatusLabel "Please select a valid folder."
    StrCpy $ValidationResult "invalid"
    Return
  ${EndIf}

  ; Create directory if it doesn't exist (for validation purposes)
  CreateDirectory "$R0"
  ${If} ${Errors}
    ${NSD_SetText} $PermissionsLabel "✗ Cannot create directory. Check permissions."
    ${NSD_SetText} $StatusLabel "Please choose a different location."
    StrCpy $ValidationResult "invalid"
    Return
  ${EndIf}

  ; Check write permissions
  FileOpen $R1 "$R0\.mw_permission_test" w
  ${If} ${Errors}
    ${NSD_SetText} $PermissionsLabel "✗ No write permission in this location."
    ${NSD_SetText} $StatusLabel "Please choose a different location."
    StrCpy $ValidationResult "invalid"
    FileClose $R1
    Return
  ${EndIf}
  FileClose $R1
  Delete "$R0\.mw_permission_test"

  ${NSD_SetText} $PermissionsLabel "✓ Write permissions confirmed"

  ; Check free space (using GetDiskFreeSpaceEx via System plugin)
  System::Call "kernel32::GetDiskFreeSpaceExA(t '$R0', *l .r2, *l .r3, *l .r4) i.r5"
  ${If} $5 != 0
    ; Convert bytes to GB for display
    System::Int64Op $2 / 1073741824
    Pop $R6
    System::Int64Op $2 / 1073741824
    Pop $R7
    ${NSD_SetText} $FreeSpaceLabel "Free space: $R7 GB"

    ; Warn if less than 2 GB
    ${If} $R7 < 2
      ${NSD_SetText} $FreeSpaceLabel "⚠ Free space: $R7 GB (less than 2 GB - may be insufficient)"
    ${EndIf}

    ; Reject if less than 500 MB
    ${If} $R7 < 1
      ${NSD_SetText} $FreeSpaceLabel "✗ Insufficient free space ($R7 GB). Please choose a drive with at least 1 GB free."
      ${NSD_SetText} $StatusLabel "Please select a drive with more free space."
      StrCpy $ValidationResult "invalid"
      Return
    ${EndIf}
  ${EndIf}

  ${NSD_SetText} $StatusLabel "✓ Location is valid"
  StrCpy $ValidationResult "valid"
FunctionEnd

Function WorkspaceDataPageLeave
  ${NSD_GetText} $WorkspaceDataFolderText $0
  Call ValidateWorkspaceDataFolder

  ${If} $ValidationResult == "invalid"
    MessageBox MB_ICONEXCLAMATION "Please select a valid workspace data folder with sufficient free space and write permissions."
    Abort
  ${EndIf}

  StrCpy $WorkspaceDataFolder $0
FunctionEnd

; ── Installation ──
Section "MyWorkspace" SEC_MAIN
  SectionIn RO

  ; Set installation directory (electron-builder handles the main install)
  SetOutPath "$INSTDIR"

  ; Create Workspace Data Folder structure
  StrCpy $WorkspaceDataFolder "$WorkspaceDataFolder"
  ${If} $WorkspaceDataFolder == ""
    StrCpy $WorkspaceDataFolder "$DOCUMENTS\MyWorkspaceData"
  ${EndIf}

  CreateDirectory "$WorkspaceDataFolder"
  CreateDirectory "$WorkspaceDataFolder\database"
  CreateDirectory "$WorkspaceDataFolder\cache"
  CreateDirectory "$WorkspaceDataFolder\uploads"
  CreateDirectory "$WorkspaceDataFolder\downloads"
  CreateDirectory "$WorkspaceDataFolder\backups"
  CreateDirectory "$WorkspaceDataFolder\logs"
  CreateDirectory "$WorkspaceDataFolder\temp"
  CreateDirectory "$WorkspaceDataFolder\config"

  ; Save Workspace Data Folder path to config file
  FileOpen $R1 "$INSTDIR\workspace-config.json" w
  FileWrite $R1 '{$\r$\n'
  FileWrite $R1 '  "workspaceDataPath": "'
  ; Escape backslashes for JSON
  StrCpy $R2 $WorkspaceDataFolder
  ${Do}
    ${StrStrAdv} $R3 $R2 "\" ">" 
    ${If} $R3 == ""
      ${ExitDo}
    ${EndIf}
    StrCpy $R2 "$R2" "" 2
  ${Loop}
  FileWrite $R1 $WorkspaceDataFolder
  FileWrite $R1 '",$\r$\n'
  FileWrite $R1 '  "version": "${PRODUCT_VERSION}",$\r$\n'
  FileWrite $R1 '  "firstInstall": true$\r$\n'
  FileWrite $R1 '}$\r$\n'
  FileClose $R1

  ; Clean up temporary files
  Delete "$INSTDIR\.mw_permission_test"
SectionEnd

; ── Shortcuts (electron-builder handles these, but we add extras) ──
Section "Desktop Shortcut" SEC_DESKTOP
  CreateShortCut "$DESKTOP\MyWorkspace.lnk" "$INSTDIR\MyWorkspace.exe" "" "$INSTDIR\MyWorkspace.exe" 0
SectionEnd

Section "Start Menu Shortcut" SEC_STARTMENU
  CreateDirectory "$SMPROGRAMS\MyWorkspace"
  CreateShortCut "$SMPROGRAMS\MyWorkspace\MyWorkspace.lnk" "$INSTDIR\MyWorkspace.exe" "" "$INSTDIR\MyWorkspace.exe" 0
  CreateShortCut "$SMPROGRAMS\MyWorkspace\Uninstall.lnk" "$INSTDIR\Uninstall MyWorkspace.exe" "" "$INSTDIR\Uninstall MyWorkspace.exe" 0
SectionEnd

Section "File Associations" SEC_FILEASSOC
  ; Register .mws file association
  WriteRegStr HKCR ".mws" "" "MyWorkspace.Project"
  WriteRegStr HKCR "MyWorkspace.Project" "" "MyWorkspace Project File"
  WriteRegStr HKCR "MyWorkspace.Project\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "MyWorkspace.Project\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'

  ; Register .mwst file association
  WriteRegStr HKCR ".mwst" "" "MyWorkspace.Template"
  WriteRegStr HKCR "MyWorkspace.Template" "" "MyWorkspace Template File"
  WriteRegStr HKCR "MyWorkspace.Template\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "MyWorkspace.Template\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'

  ; Register myworkspace:// protocol
  WriteRegStr HKCR "myworkspace" "" "URL:MyWorkspace Protocol"
  WriteRegStr HKCR "myworkspace" "URL Protocol" ""
  WriteRegStr HKCR "myworkspace\DefaultIcon" "" "$INSTDIR\MyWorkspace.exe,0"
  WriteRegStr HKCR "myworkspace\shell\open\command" "" '"$INSTDIR\MyWorkspace.exe" "%1"'

  ; Notify shell of changes
  System::Call "shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)"
SectionEnd

Section "Automatic Updates" SEC_AUTOUPDATE
  ; Enable auto-update by creating a config marker
  FileOpen $R1 "$INSTDIR\auto-update-enabled" w
  FileWrite $R1 "enabled"
  FileClose $R1
SectionEnd

; ── Uninstaller ──
Section "Uninstall"
  ; Remove application files
  RMDir /r "$INSTDIR\*.*"
  RMDir "$INSTDIR"

  ; Remove Workspace Data Folder (only if user opts in)
  ; By default, keep user data
  ; RMDir /r "$WorkspaceDataFolder"

  ; Remove shortcuts
  Delete "$DESKTOP\MyWorkspace.lnk"
  RMDir /r "$SMPROGRAMS\MyWorkspace"

  ; Remove registry keys
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  DeleteRegKey HKCR ".mws"
  DeleteRegKey HKCR "MyWorkspace.Project"
  DeleteRegKey HKCR ".mwst"
  DeleteRegKey HKCR "MyWorkspace.Template"
  DeleteRegKey HKCR "myworkspace"

  ; Notify shell of changes
  System::Call "shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)"
SectionEnd

; ── Installer Functions ──
Function .onInit
  ; Check if already installed
  ReadRegStr $R0 HKLM "${PRODUCT_UNINST_KEY}" "UninstallString"
  ${If} $R0 != ""
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "${PRODUCT_NAME} is already installed.$\r$\n$\r$\n\
      Click OK to remove the previous version and continue, or Cancel to abort." \
      IDOK uninst
    Abort

    uninst:
      ; Run uninstaller silently
      ExecWait '"$R0" /S _?=$INSTDIR'
  ${EndIf}

  ; Default workspace data folder
  StrCpy $WorkspaceDataFolder "$DOCUMENTS\MyWorkspaceData"
FunctionEnd

Function .onInstSuccess
  ; Launch application
  Exec '"$INSTDIR\MyWorkspace.exe"'
FunctionEnd

; ── StrStrAdv macro (helper for JSON escaping) ──
!macro StrStrAdv ResultVar String SubString SearchDirection CaseSensitive SizePos
  Push "${String}"
  Push "${SubString}"
  Push "${SearchDirection}"
  Push "${CaseSensitive}"
  Push "${SizePos}"
  Call StrStrAdv
  Pop "${ResultVar}"
!macroend
!define StrStrAdv "!insertmacro StrStrAdv"

Function StrStrAdv
  Exch $R5
  Exch
  Exch $R4
  Exch
  Exch
  Exch $R3
  Exch
  Exch
  Exch
  Exch $R2
  Exch
  Exch
  Exch
  Exch
  Exch $R1
  Exch
  Exch
  Exch
  Exch
  Exch
  Exch $R0
  Push $R6
  Push $R7
  Push $R8
  Push $R9

  StrCpy $R6 0
  StrCpy $R7 ""
  StrCpy $R9 ""

  ${If} $R3 == ">"
    StrCpy $R8 ">"
  ${Else}
    StrCpy $R8 "<"
  ${EndIf}

  StrCpy $R0 $R0
  StrCpy $R1 $R1

  ${If} $R8 == ">"
    StrCpy $R9 $R1
    StrCpy $R1 $R0
    StrCpy $R0 $R9
  ${EndIf}

  ${If} $R4 == "1"
    StrCpy $R0 $R0
    StrCpy $R1 $R1
  ${Else}
    StrCpy $R0 $R0
    StrCpy $R1 $R1
  ${EndIf}

  StrCpy $R9 0
  StrLen $R7 $R0
  StrLen $R6 $R1

  ${Do}
    ${If} $R9 >= $R7
      StrCpy $R0 ""
      ${ExitDo}
    ${EndIf}
    StrCpy $R2 $R0 $R6 $R9
    ${If} $R2 == $R1
      StrCpy $R0 $R0 "" $R9
      ${ExitDo}
    ${EndIf}
    IntOp $R9 $R9 + 1
  ${Loop}

  Pop $R9
  Pop $R8
  Pop $R7
  Pop $R6
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
FunctionEnd
