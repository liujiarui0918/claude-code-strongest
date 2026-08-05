$ErrorActionPreference = 'SilentlyContinue'
function Get-CommandText($Payload) {
    if ($null -eq $Payload) { return '' }
    foreach ($name in @('command','cmd','script','input')) {
        if ($Payload.PSObject.Properties.Name -contains $name) { return [string]$Payload.$name }
    }
    if ($Payload.tool_input) { return Get-CommandText $Payload.tool_input }
    if ($Payload.arguments) { return Get-CommandText $Payload.arguments }
    return ''
}
try {
    $inputText = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputText)) { exit 0 }
    $payload = $inputText | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($null -eq $payload) { exit 0 }
    $command = Get-CommandText $payload
    if ([string]::IsNullOrWhiteSpace($command)) { exit 0 }
    $patterns = @(
        '(?i)\bFormat-Volume\b',
        '(?i)\bStop-Computer\b',
        '(?i)\bRestart-Computer\b',
        '(?i)\bClear-RecycleBin\b',
        '(?i)\bRemove-PSDrive\b',
        '(?i)\bgit\s+push\b[^\r\n]*--force(?:\b|=)',
        '(?i)\bgit\s+reset\s+--hard\b',
        '(?i)\bgit\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*d|\bgit\s+clean\s+-[a-zA-Z]*d[a-zA-Z]*f',
        '(?i)(?:^|\s)--no-verify(?:\s|$)'
    )
    foreach ($pattern in $patterns) {
        if ($command -match $pattern) {
            Write-Error 'Blocked dangerous command by Codex safety hook.'
            exit 2
        }
    }
} catch {
    exit 0
}
exit 0
