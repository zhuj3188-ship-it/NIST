; QuantumShield — Enhanced NSIS Include Script v2.2
; Handles Windows Defender / antivirus exclusion during installation
; Registered firewall rules and cleanup on uninstall
;
; This script is included by electron-builder during NSIS installer creation.
; It provides macros that run at install and uninstall time.

!include "MUI2.nsh"
!include "nsDialogs.nsh"

; ==========================================
; Post-install: Configure AV & Firewall
; ==========================================
!macro customInstall
  ; ─── 1. Windows Defender Exclusion ───
  ; Add installation directory to Defender exclusion list
  ; This is the #1 fix for Electron false positives
  DetailPrint "Configuring Windows Defender exclusions..."
  nsExec::ExecToLog 'powershell -NoProfile -NonInteractive -Command "\
    try { \
      Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue; \
      Add-MpPreference -ExclusionProcess \"QuantumShield.exe\" -ErrorAction SilentlyContinue; \
      Add-MpPreference -ExclusionProcess \"node.exe\" -ErrorAction SilentlyContinue; \
    } catch {}"'

  ; ─── 2. Windows Firewall Rule ───
  ; Allow QuantumShield to listen on localhost (for internal Express server)
  DetailPrint "Configuring Windows Firewall..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="QuantumShield" \
    dir=in action=allow program="$INSTDIR\QuantumShield.exe" \
    enable=yes profile=private description="QuantumShield PQC Migration Platform - Internal server"'

  ; ─── 3. Register as known application ───
  ; Write registry info for Add/Remove Programs (helps reputation)
  DetailPrint "Registering application..."
  WriteRegStr HKLM "SOFTWARE\QuantumShield" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\QuantumShield" "Version" "${VERSION}"
  WriteRegStr HKLM "SOFTWARE\QuantumShield" "Publisher" "QuantumShield Team"

  DetailPrint "Configuration complete."
!macroend

; ==========================================
; Post-uninstall: Clean up all modifications
; ==========================================
!macro customUnInstall
  ; Remove Windows Defender exclusions
  DetailPrint "Removing Windows Defender exclusions..."
  nsExec::ExecToLog 'powershell -NoProfile -NonInteractive -Command "\
    try { \
      Remove-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue; \
      Remove-MpPreference -ExclusionProcess \"QuantumShield.exe\" -ErrorAction SilentlyContinue; \
    } catch {}"'

  ; Remove firewall rule
  DetailPrint "Removing firewall rules..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="QuantumShield"'

  ; Remove registry entries
  DetailPrint "Cleaning up registry..."
  DeleteRegKey HKLM "SOFTWARE\QuantumShield"

  DetailPrint "Uninstall cleanup complete."
!macroend
