$ErrorActionPreference = 'SilentlyContinue'
function Get-TextFields($Value) {
    $items = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Value) { return $items }
    if ($Value -is [string]) { $items.Add($Value); return $items }
    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        foreach ($item in $Value) { foreach ($s in (Get-TextFields $item)) { $items.Add($s) } }
        return $items
    }
    foreach ($prop in $Value.PSObject.Properties) {
        if ($prop.Name -match 'path|file|command|cmd|script|input|content|args|arguments') {
            foreach ($s in (Get-TextFields $prop.Value)) { $items.Add($s) }
        }
    }
    return $items
}
try {
    $inputText = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputText)) { exit 0 }
    $payload = $inputText | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($null -eq $payload) { exit 0 }
    $text = ((Get-TextFields $payload) -join "`n")
    if ([string]::IsNullOrWhiteSpace($text)) { exit 0 }
    $patterns = @(
        '(?i)(^|[\\/\s"''])\.env(\.[^\\/\s"'']+)?($|[\\/\s"''])',
        '(?i)(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)($|[\.\\/\s"''])',
        '(?i)(^|[\\/])\.aws[\\/]credentials($|[\s"''])',
        '(?i)(^|[\\/\s"''])auth\.json($|[\\/\s"''])',
        '(?i)(^|[\\/\s"''])\.credentials\.json($|[\\/\s"''])'
    )
    foreach ($pattern in $patterns) {
        if ($text -match $pattern) {
            Write-Error 'Blocked access to likely secret file by Codex safety hook.'
            exit 2
        }
    }
} catch {
    exit 0
}
exit 0
