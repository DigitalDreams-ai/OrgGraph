$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logsDir = Join-Path $repoRoot 'logs'
$exePath = Join-Path $repoRoot 'apps\desktop\src-tauri\target\release\orgumented-desktop.exe'
$stdoutLog = Join-Path $logsDir 'desktop-release-smoke.stdout.log'
$stderrLog = Join-Path $logsDir 'desktop-release-smoke.stderr.log'
$healthArtifact = Join-Path $logsDir 'desktop-release-smoke-health.json'
$readyArtifact = Join-Path $logsDir 'desktop-release-smoke-ready.json'
$askArtifact = Join-Path $logsDir 'desktop-release-smoke-ask.json'
$orgStatusArtifact = Join-Path $logsDir 'desktop-release-smoke-org-status.json'
$sessionBeforeArtifact = Join-Path $logsDir 'desktop-release-smoke-session-before.json'
$sessionAliasesArtifact = Join-Path $logsDir 'desktop-release-smoke-session-aliases.json'
$sessionConnectArtifact = Join-Path $logsDir 'desktop-release-smoke-session-connect.json'
$sessionAfterConnectArtifact = Join-Path $logsDir 'desktop-release-smoke-session-after-connect.json'
$sessionSwitchArtifact = Join-Path $logsDir 'desktop-release-smoke-session-switch.json'
$sessionAfterSwitchArtifact = Join-Path $logsDir 'desktop-release-smoke-session-after-switch.json'
$sessionRestoreArtifact = Join-Path $logsDir 'desktop-release-smoke-session-restore.json'
$resultArtifact = Join-Path $logsDir 'desktop-release-smoke-result.json'

function Stop-PackagedProcesses {
  $targets = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -in @('orgumented-desktop.exe', 'node.exe') -and (
        $_.ExecutablePath -like "*OrgGraph\\apps\\desktop\\src-tauri\\target\\release*" -or
        $_.CommandLine -like "*OrgGraph\\apps\\desktop\\src-tauri\\target\\release*"
      )
    }
  if ($targets) {
    $targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  }
}

function Invoke-JsonGet([string]$Url, [string]$ArtifactPath) {
  $response = Invoke-RestMethod -Method Get -Uri $Url
  $response | ConvertTo-Json -Depth 12 | Set-Content -Path $ArtifactPath
  return $response
}

function Invoke-JsonPost([string]$Url, [string]$ArtifactPath, [object]$Body = $null) {
  $params = @{
    Method = 'Post'
    Uri = $Url
  }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = $Body | ConvertTo-Json -Depth 12
  }
  $response = Invoke-RestMethod @params
  $response | ConvertTo-Json -Depth 12 | Set-Content -Path $ArtifactPath
  return $response
}

function Resolve-PreferredAlias([string[]]$KnownAliases, [string]$RequestedAlias, [string]$CurrentAlias, [string]$ActiveAlias) {
  if (-not [string]::IsNullOrWhiteSpace($RequestedAlias)) {
    if ($KnownAliases -notcontains $RequestedAlias) {
      throw "Requested smoke alias '$RequestedAlias' was not found in /org/session/aliases."
    }
    return $RequestedAlias
  }
  if (-not [string]::IsNullOrWhiteSpace($CurrentAlias) -and $KnownAliases -contains $CurrentAlias) {
    return $CurrentAlias
  }
  if (-not [string]::IsNullOrWhiteSpace($ActiveAlias) -and $KnownAliases -contains $ActiveAlias) {
    return $ActiveAlias
  }
  if ($KnownAliases.Count -gt 0) {
    return $KnownAliases[0]
  }
  return $null
}

function Resolve-SwitchAlias([string[]]$KnownAliases, [string]$RequestedAlias, [string]$ConnectedAlias) {
  if (-not [string]::IsNullOrWhiteSpace($RequestedAlias)) {
    if ($KnownAliases -notcontains $RequestedAlias) {
      throw "Requested smoke switch alias '$RequestedAlias' was not found in /org/session/aliases."
    }
    if ($RequestedAlias -eq $ConnectedAlias) {
      throw "Requested smoke switch alias '$RequestedAlias' matches the connected alias."
    }
    return $RequestedAlias
  }
  return @($KnownAliases | Where-Object { $_ -ne $ConnectedAlias } | Select-Object -First 1)[0]
}

function Wait-ForReady {
  param(
    [string]$Url,
    [int]$Attempts = 30,
    [int]$DelaySeconds = 2
  )

  for ($i = 0; $i -lt $Attempts; $i += 1) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds $DelaySeconds
      continue
    }
    Start-Sleep -Seconds $DelaySeconds
  }

  throw "Timed out waiting for packaged desktop runtime readiness at $Url"
}

if (-not (Test-Path $exePath)) {
  throw "Packaged desktop executable missing at $exePath. Run 'pnpm desktop:build' first."
}

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
Remove-Item $stdoutLog, $stderrLog, $healthArtifact, $readyArtifact, $askArtifact, $orgStatusArtifact, $sessionBeforeArtifact, $sessionAliasesArtifact, $sessionConnectArtifact, $sessionAfterConnectArtifact, $sessionSwitchArtifact, $sessionAfterSwitchArtifact, $sessionRestoreArtifact, $resultArtifact -ErrorAction SilentlyContinue

$desktopProcess = $null
$sessionBefore = $null
$sessionRestoreStatus = 'not-needed'
$sessionConnectStatus = 'skipped-no-aliases'
$sessionSwitchStatus = 'skipped'
$sessionConnectAlias = $null
$sessionSwitchAlias = $null

try {
  Stop-PackagedProcesses

  $desktopProcess = Start-Process -FilePath $exePath -WorkingDirectory (Split-Path $exePath) -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

  Wait-ForReady -Url 'http://127.0.0.1:3100/ready'

  $health = Invoke-JsonGet -Url 'http://127.0.0.1:3100/health' -ArtifactPath $healthArtifact
  if ($health.status -ne 'ok') {
    throw "Health check did not return status=ok"
  }

  $ready = Invoke-JsonGet -Url 'http://127.0.0.1:3100/ready' -ArtifactPath $readyArtifact
  if ($ready.status -ne 'ready') {
    throw "Ready check did not return status=ready"
  }

  $askBody = @{
    query = 'What touches Opportunity.StageName?'
    maxCitations = 5
    consistencyCheck = $true
  } | ConvertTo-Json -Depth 8
  $ask = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3100/ask' -ContentType 'application/json' -Body $askBody
  $ask | ConvertTo-Json -Depth 12 | Set-Content -Path $askArtifact
  if ([string]::IsNullOrWhiteSpace($ask.trustLevel)) {
    throw 'Ask response missing trustLevel'
  }
  if (-not $ask.proof -or [string]::IsNullOrWhiteSpace($ask.proof.proofId) -or [string]::IsNullOrWhiteSpace($ask.proof.replayToken)) {
    throw 'Ask response missing deterministic proof identifiers'
  }

  $orgStatus = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/status' -ArtifactPath $orgStatusArtifact
  if (-not $orgStatus.sf) {
    throw 'Org status response missing sf tool status'
  }

  $sessionBefore = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/session' -ArtifactPath $sessionBeforeArtifact
  $sessionAliases = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/session/aliases' -ArtifactPath $sessionAliasesArtifact
  $knownAliases = @($sessionAliases.aliases | ForEach-Object { $_.alias } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  $preferredAlias = Resolve-PreferredAlias -KnownAliases $knownAliases -RequestedAlias $env:ORGUMENTED_DESKTOP_SMOKE_ALIAS -CurrentAlias $sessionBefore.activeAlias -ActiveAlias $sessionAliases.activeAlias

  if (-not [string]::IsNullOrWhiteSpace($preferredAlias)) {
    $connect = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/session/connect' -ArtifactPath $sessionConnectArtifact -Body @{ alias = $preferredAlias }
    if ($connect.status -ne 'connected' -or $connect.activeAlias -ne $preferredAlias) {
      throw "Packaged session connect did not attach alias $preferredAlias"
    }
    $sessionConnectStatus = 'verified'
    $sessionConnectAlias = $preferredAlias

    $sessionAfterConnect = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/session' -ArtifactPath $sessionAfterConnectArtifact
    if ($sessionAfterConnect.status -ne 'connected' -or $sessionAfterConnect.activeAlias -ne $preferredAlias) {
      throw "Packaged session status did not report connected alias $preferredAlias after connect"
    }

    $verifySwitch = $env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH -eq '1' -or -not [string]::IsNullOrWhiteSpace($env:ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS)
    if ($verifySwitch) {
      $switchAlias = Resolve-SwitchAlias -KnownAliases $knownAliases -RequestedAlias $env:ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS -ConnectedAlias $preferredAlias
      if ([string]::IsNullOrWhiteSpace($switchAlias)) {
        throw 'Packaged smoke switch verification requested, but no alternate alias is available.'
      }
      $switch = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/session/switch' -ArtifactPath $sessionSwitchArtifact -Body @{ alias = $switchAlias }
      if ($switch.status -ne 'connected' -or $switch.activeAlias -ne $switchAlias) {
        throw "Packaged session switch did not attach alias $switchAlias"
      }
      $sessionSwitchStatus = 'verified'
      $sessionSwitchAlias = $switchAlias

      $sessionAfterSwitch = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/session' -ArtifactPath $sessionAfterSwitchArtifact
      if ($sessionAfterSwitch.status -ne 'connected' -or $sessionAfterSwitch.activeAlias -ne $switchAlias) {
        throw "Packaged session status did not report connected alias $switchAlias after switch"
      }
    }
  }

  if ($sessionBefore) {
    if ($sessionBefore.status -eq 'connected' -and -not [string]::IsNullOrWhiteSpace($sessionBefore.activeAlias)) {
      if ($sessionSwitchStatus -eq 'verified' -or ($sessionConnectStatus -eq 'verified' -and $sessionBefore.activeAlias -ne $sessionConnectAlias)) {
        $restore = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/session/switch' -ArtifactPath $sessionRestoreArtifact -Body @{ alias = $sessionBefore.activeAlias }
        if ($restore.status -ne 'connected' -or $restore.activeAlias -ne $sessionBefore.activeAlias) {
          throw "Failed to restore original session alias $($sessionBefore.activeAlias)"
        }
        $sessionRestoreStatus = 'restored-alias'
      }
    } elseif ($sessionConnectStatus -eq 'verified') {
      $restore = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/session/disconnect' -ArtifactPath $sessionRestoreArtifact
      if ($restore.status -ne 'disconnected') {
        throw 'Failed to restore original disconnected session state'
      }
      $sessionRestoreStatus = 'restored-disconnected'
    }
  }

  $artifacts = @(
    'logs/desktop-release-smoke.stdout.log'
    'logs/desktop-release-smoke.stderr.log'
    'logs/desktop-release-smoke-health.json'
    'logs/desktop-release-smoke-ready.json'
    'logs/desktop-release-smoke-ask.json'
    'logs/desktop-release-smoke-org-status.json'
    'logs/desktop-release-smoke-session-before.json'
    'logs/desktop-release-smoke-session-aliases.json'
  )
  if ($sessionConnectStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-session-connect.json'
    $artifacts += 'logs/desktop-release-smoke-session-after-connect.json'
  }
  if ($sessionSwitchStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-session-switch.json'
    $artifacts += 'logs/desktop-release-smoke-session-after-switch.json'
  }
  if ($sessionRestoreStatus -ne 'not-needed') {
    $artifacts += 'logs/desktop-release-smoke-session-restore.json'
  }

  @{
    status = 'passed'
    desktopPid = $desktopProcess.Id
    healthStatus = $health.status
    readyStatus = $ready.status
    askTrustLevel = $ask.trustLevel
    askProofId = $ask.proof.proofId
    sessionConnectStatus = $sessionConnectStatus
    sessionConnectAlias = $sessionConnectAlias
    sessionSwitchStatus = $sessionSwitchStatus
    sessionSwitchAlias = $sessionSwitchAlias
    sessionRestoreStatus = $sessionRestoreStatus
    artifacts = $artifacts
  } | ConvertTo-Json -Depth 8 | Set-Content -Path $resultArtifact

  Get-Content $resultArtifact
} finally {
  if ($desktopProcess -and -not $desktopProcess.HasExited) {
    Stop-Process -Id $desktopProcess.Id -Force
  }
  Stop-PackagedProcesses
}
