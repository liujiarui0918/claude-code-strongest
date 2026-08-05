$ErrorActionPreference = 'SilentlyContinue'
try {
    $inputText = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputText)) { exit 0 }
    $logDir = 'C:\Users\liujiarui\.codex\logs'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $payload = $null
    try { $payload = $inputText | ConvertFrom-Json -ErrorAction Stop } catch { $payload = $null }
    $parts = New-Object System.Collections.Generic.List[string]
    if ($null -ne $payload) {
        foreach ($name in @('type','tool','command','cmd','path','file_path')) {
            if ($payload.PSObject.Properties.Name -contains $name) {
                $value = [string]$payload.$name
                if (-not [string]::IsNullOrWhiteSpace($value)) { $parts.Add("$name=$value") }
            }
        }
    }
    if ($parts.Count -eq 0) { $parts.Add('event=post-tool-use') }
    $line = '{0}`t{1}' -f ([DateTime]::UtcNow.ToString('o')), (($parts.ToArray()) -join ' ')
    Add-Content -Path (Join-Path $logDir 'commands.log') -Value $line -Encoding UTF8
} catch {
}
exit 0
