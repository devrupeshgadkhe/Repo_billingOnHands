; Custom NSIS Installer & Uninstaller Hooks for Billing On Hand
; Ensures business mode lock persists across all app updates,
; and is cleared ONLY when the user explicitly uninstalls the application.

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}
    Delete "$APPDATA\${APP_FILENAME}\data\install-lock.json"
    !ifdef APP_PRODUCT_FILENAME
      Delete "$APPDATA\${APP_PRODUCT_FILENAME}\data\install-lock.json"
    !endif
    !ifdef APP_PACKAGE_NAME
      Delete "$APPDATA\${APP_PACKAGE_NAME}\data\install-lock.json"
    !endif
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}
  ${endif}
!macroend
