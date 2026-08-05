$ErrorActionPreference = 'SilentlyContinue'
try {
    $inputText = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputText)) { exit 0 }
    $payload = $inputText | ConvertFrom-Json -ErrorAction SilentlyContinue
    $title = 'Codex'
    $message = 'Codex turn complete.'
    if ($null -ne $payload) {
        if ($payload.type) { $message = "Codex event: $($payload.type)" }
        if ($payload.'turn-id') { $message = "$message turn=$($payload.'turn-id')" }
    }
    if (Get-Module -ListAvailable -Name BurntToast) {
        Import-Module BurntToast -ErrorAction SilentlyContinue
        New-BurntToastNotification -Text $title, $message | Out-Null
    }
} catch {
}
exit 0
