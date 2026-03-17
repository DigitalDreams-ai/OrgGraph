$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRootPattern = $repoRoot.Replace('/', '\')
$logsDir = Join-Path $repoRoot 'logs'
$exePath = Join-Path $repoRoot 'apps\desktop\src-tauri\target\release\orgumented-desktop.exe'
$smokeAppDataRoot = Join-Path $logsDir 'desktop-release-smoke-appdata'
$stdoutLog = Join-Path $logsDir 'desktop-release-smoke.stdout.log'
$stderrLog = Join-Path $logsDir 'desktop-release-smoke.stderr.log'
$relaunchStdoutLog = Join-Path $logsDir 'desktop-release-smoke-relaunch.stdout.log'
$relaunchStderrLog = Join-Path $logsDir 'desktop-release-smoke-relaunch.stderr.log'
$healthArtifact = Join-Path $logsDir 'desktop-release-smoke-health.json'
$readyArtifact = Join-Path $logsDir 'desktop-release-smoke-ready.json'
$relaunchHealthArtifact = Join-Path $logsDir 'desktop-release-smoke-relaunch-health.json'
$relaunchReadyArtifact = Join-Path $logsDir 'desktop-release-smoke-relaunch-ready.json'
$askArtifact = Join-Path $logsDir 'desktop-release-smoke-ask.json'
$askRepeatArtifact = Join-Path $logsDir 'desktop-release-smoke-ask-repeat.json'
$proofArtifact = Join-Path $logsDir 'desktop-release-smoke-proof.json'
$recentProofsArtifact = Join-Path $logsDir 'desktop-release-smoke-recent-proofs.json'
$replayArtifact = Join-Path $logsDir 'desktop-release-smoke-replay.json'
$orgStatusArtifact = Join-Path $logsDir 'desktop-release-smoke-org-status.json'
$sessionBeforeArtifact = Join-Path $logsDir 'desktop-release-smoke-session-before.json'
$sessionAliasesArtifact = Join-Path $logsDir 'desktop-release-smoke-session-aliases.json'
$sessionConnectArtifact = Join-Path $logsDir 'desktop-release-smoke-session-connect.json'
$sessionAfterConnectArtifact = Join-Path $logsDir 'desktop-release-smoke-session-after-connect.json'
$sessionSwitchArtifact = Join-Path $logsDir 'desktop-release-smoke-session-switch.json'
$sessionAfterSwitchArtifact = Join-Path $logsDir 'desktop-release-smoke-session-after-switch.json'
$sessionRestoreArtifact = Join-Path $logsDir 'desktop-release-smoke-session-restore.json'
$metadataSearchArtifact = Join-Path $logsDir 'desktop-release-smoke-metadata-search.json'
$metadataRetrieveArtifact = Join-Path $logsDir 'desktop-release-smoke-metadata-retrieve.json'
$ingestLatestArtifact = Join-Path $logsDir 'desktop-release-smoke-ingest-latest.json'
$refreshSummaryArtifact = Join-Path $logsDir 'desktop-release-smoke-refresh-summary.json'
$refreshDiffArtifact = Join-Path $logsDir 'desktop-release-smoke-refresh-diff.json'
$orgPipelineArtifact = Join-Path $logsDir 'desktop-release-smoke-org-pipeline.json'
$staleSeedArtifact = Join-Path $logsDir 'desktop-release-smoke-stale-seed.json'
$resultArtifact = Join-Path $logsDir 'desktop-release-smoke-result.json'

function Test-PackagedProcessPath {
  param(
    [string]$ProcessPath
  )

  if ([string]::IsNullOrWhiteSpace($ProcessPath)) {
    return $false
  }

  return $ProcessPath -like "*$repoRootPattern\\apps\\desktop\\src-tauri\\target\\release*" -or
    $ProcessPath -like "*$repoRootPattern\\apps\\desktop\\src-tauri\\runtime*"
}

function Initialize-SmokeAppDataRoot {
  param(
    [string]$AppDataRoot,
    [string]$StaleSeedPath
  )

  Remove-Item $AppDataRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $AppDataRoot 'refresh') -Force | Out-Null

  $staleSnapshotPath = Join-Path $AppDataRoot 'refresh\semantic-snapshot.json'
  $staleSnapshot = @{
    snapshotId = 'desktop_release_smoke_stale_snapshot'
    fingerprint = 'desktop-release-smoke-stale-fingerprint'
    generatedAt = [DateTime]::UnixEpoch.ToString('o')
    sourcePath = (Join-Path $AppDataRoot 'sf-project\force-app\main\default')
    nodeCount = 25000
    edgeCount = 40000
    nodeDigest = 'desktop-release-smoke-stale-node-digest'
    edgeDigest = 'desktop-release-smoke-stale-edge-digest'
    nodeTypeCounts = @{
      OBJECT = 5000
      FIELD = 20000
      FLOW = 8000
    }
    relationCounts = @{
      references = 25000
      updates = 15000
    }
  }
  $staleSnapshot | ConvertTo-Json -Depth 8 | Set-Content -Path $staleSnapshotPath

  @{
    appDataRoot = $AppDataRoot
    staleSnapshotPath = $staleSnapshotPath
    seededAt = (Get-Date).ToString('o')
  } | ConvertTo-Json -Depth 4 | Set-Content -Path $StaleSeedPath
}

function Stop-PackagedProcesses {
  param(
    [int]$Attempts = 6,
    [int]$DelayMilliseconds = 500,
    [int]$RuntimePort = 3100
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    $processTargets = Get-Process -Name orgumented-desktop,node -ErrorAction SilentlyContinue |
      Where-Object {
        Test-PackagedProcessPath -ProcessPath $_.Path
      }
    $portTarget = Get-NetTCPConnection -LocalPort $RuntimePort -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    $targetIds = @(
      $processTargets | Select-Object -ExpandProperty Id
      $portTarget
    ) | Where-Object { $null -ne $_ } | Sort-Object -Unique

    if (-not $targetIds) {
      return
    }

    foreach ($targetId in $targetIds) {
      Stop-Process -Id $targetId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds $DelayMilliseconds
  }

  $remainingProcesses = Get-Process -Name orgumented-desktop,node -ErrorAction SilentlyContinue |
    Where-Object {
      Test-PackagedProcessPath -ProcessPath $_.Path
    }
  $remainingPort = Get-NetTCPConnection -LocalPort $RuntimePort -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($remainingProcesses -or $remainingPort) {
    throw "Failed to stop packaged desktop runtime processes before/after smoke."
  }
}

function Test-ListeningPort {
  param(
    [int]$LocalPort
  )

  return $null -ne (Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Wait-PortReleased {
  param(
    [int]$LocalPort,
    [int]$Attempts = 20,
    [int]$DelayMilliseconds = 500
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    if (-not (Test-ListeningPort -LocalPort $LocalPort)) {
      return
    }

    Start-Sleep -Milliseconds $DelayMilliseconds
  }

  $listener = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    throw "Port $LocalPort is still in use before packaged smoke launch (pid=$($listener.OwningProcess))."
  }

  throw "Port $LocalPort did not release before packaged smoke launch."
}

function Invoke-JsonGet([string]$Url, [string]$ArtifactPath) {
  $response = Invoke-WithTransientRetry -Description "GET $Url" -Operation { Invoke-RestMethod -Method Get -Uri $Url }
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
  $response = Invoke-WithTransientRetry -Description "POST $Url" -Operation { Invoke-RestMethod @params }
  $response | ConvertTo-Json -Depth 12 | Set-Content -Path $ArtifactPath
  return $response
}

function Test-TransientHttpFailure {
  param(
    [System.Management.Automation.ErrorRecord]$ErrorRecord
  )

  if ($null -eq $ErrorRecord) {
    return $false
  }

  $messages = @()
  if ($ErrorRecord.Exception) {
    $messages += $ErrorRecord.Exception.Message
    if ($ErrorRecord.Exception.InnerException) {
      $messages += $ErrorRecord.Exception.InnerException.Message
    }
  }
  if ($ErrorRecord.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($ErrorRecord.ErrorDetails.Message)) {
    $messages += $ErrorRecord.ErrorDetails.Message
  }

  $messageText = ($messages -join ' | ').ToLowerInvariant()
  $transientPatterns = @(
    'forcibly closed'
    'connection reset'
    'connection was closed'
    'connection refused'
    'actively refused'
    'timed out'
    'timeout'
    'temporarily unavailable'
    'no connection could be made'
  )
  foreach ($pattern in $transientPatterns) {
    if ($messageText.Contains($pattern)) {
      return $true
    }
  }

  $statusCode = $null
  try {
    if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.StatusCode) {
      $statusCode = [int]$ErrorRecord.Exception.Response.StatusCode
    }
  } catch {
  }
  if ($null -ne $statusCode -and @(
      500
      502
      503
      504
    ) -contains $statusCode) {
    return $true
  }

  return $false
}

function Invoke-WithTransientRetry {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Operation,
    [Parameter(Mandatory = $true)]
    [string]$Description,
    [int]$Attempts = 0,
    [int]$DelayMilliseconds = 0
  )

  if ($Attempts -le 0) {
    $Attempts = [Math]::Max(1, [int]($env:ORGUMENTED_DESKTOP_SMOKE_HTTP_ATTEMPTS ?? '4'))
  }
  if ($DelayMilliseconds -le 0) {
    $DelayMilliseconds = [Math]::Max(100, [int]($env:ORGUMENTED_DESKTOP_SMOKE_HTTP_DELAY_MS ?? '500'))
  }

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    try {
      return & $Operation
    } catch {
      if ($attempt -lt $Attempts -and (Test-TransientHttpFailure -ErrorRecord $_)) {
        Write-Host "Transient HTTP failure during $Description (attempt $attempt/$Attempts). Retrying in $DelayMilliseconds ms..."
        Start-Sleep -Milliseconds $DelayMilliseconds
        continue
      }

      throw
    }
  }

  throw "Failed to execute $Description after $Attempts attempts."
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

function Get-LogTail {
  param(
    [string]$Path,
    [int]$LineCount = 40
  )

  if (-not (Test-Path $Path)) {
    return "<missing: $Path>"
  }

  $lines = Get-Content -Path $Path -Tail $LineCount -ErrorAction SilentlyContinue
  if (-not $lines) {
    return "<empty: $Path>"
  }

  return ($lines -join [Environment]::NewLine)
}

function Wait-ForReady {
  param(
    [string]$Url,
    [System.Diagnostics.Process]$DesktopProcess = $null,
    [string]$StdoutLogPath = '',
    [string]$StderrLogPath = '',
    [int]$Attempts = 0,
    [int]$DelaySeconds = 0
  )

  if ($Attempts -le 0) {
    $Attempts = [Math]::Max(1, [int]($env:ORGUMENTED_DESKTOP_SMOKE_READY_ATTEMPTS ?? '90'))
  }
  if ($DelaySeconds -le 0) {
    $DelaySeconds = [Math]::Max(1, [int]($env:ORGUMENTED_DESKTOP_SMOKE_READY_DELAY_SECONDS ?? '2'))
  }

  for ($i = 0; $i -lt $Attempts; $i += 1) {
    if ($null -ne $DesktopProcess) {
      try {
        $DesktopProcess.Refresh()
      } catch {
      }
      if ($DesktopProcess.HasExited) {
        $stdoutTail = Get-LogTail -Path $StdoutLogPath
        $stderrTail = Get-LogTail -Path $StderrLogPath
        throw "Packaged desktop process exited before readiness (pid=$($DesktopProcess.Id) exitCode=$($DesktopProcess.ExitCode)).`nSTDOUT:`n$stdoutTail`nSTDERR:`n$stderrTail"
      }
    }

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

  $processState = 'unknown'
  if ($null -ne $DesktopProcess) {
    try {
      $DesktopProcess.Refresh()
      $processState = if ($DesktopProcess.HasExited) {
        "exited (pid=$($DesktopProcess.Id) exitCode=$($DesktopProcess.ExitCode))"
      } else {
        "still-running (pid=$($DesktopProcess.Id))"
      }
    } catch {
      $processState = 'unavailable'
    }
  }
  $stdoutTail = Get-LogTail -Path $StdoutLogPath
  $stderrTail = Get-LogTail -Path $StderrLogPath
  throw "Timed out waiting for packaged desktop runtime readiness at $Url after $Attempts attempts with $DelaySeconds second delay. ProcessState=$processState`nSTDOUT:`n$stdoutTail`nSTDERR:`n$stderrTail"
}

function Start-PackagedDesktop {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,
    [Parameter(Mandatory = $true)]
    [string]$StdoutLogPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrLogPath,
    [string]$ReadyUrl = 'http://127.0.0.1:3100/ready'
  )

  $launchAttempts = [Math]::Max(1, [int]($env:ORGUMENTED_DESKTOP_SMOKE_LAUNCH_ATTEMPTS ?? '2'))
  $launchRetryDelaySeconds = [Math]::Max(1, [int]($env:ORGUMENTED_DESKTOP_SMOKE_LAUNCH_RETRY_DELAY_SECONDS ?? '2'))
  $desktopProcess = $null

  for ($launchAttempt = 1; $launchAttempt -le $launchAttempts; $launchAttempt += 1) {
    Remove-Item $StdoutLogPath, $StderrLogPath -ErrorAction SilentlyContinue
    $desktopProcess = Start-Process -FilePath $ExecutablePath -WorkingDirectory (Split-Path $ExecutablePath) -RedirectStandardOutput $StdoutLogPath -RedirectStandardError $StderrLogPath -PassThru
    try {
      Wait-ForReady -Url $ReadyUrl -DesktopProcess $desktopProcess -StdoutLogPath $StdoutLogPath -StderrLogPath $StderrLogPath
      return @{
        Process = $desktopProcess
        LaunchAttemptsUsed = $launchAttempt
      }
    } catch {
      $message = $_.Exception.Message
      $canRetry = $launchAttempt -lt $launchAttempts -and $message -like '*exited before readiness*'
      if (-not $canRetry) {
        throw
      }

      Write-Host "Packaged desktop exited before readiness on launch attempt $launchAttempt of $launchAttempts. Retrying..."
      if ($desktopProcess -and -not $desktopProcess.HasExited) {
        Stop-Process -Id $desktopProcess.Id -Force -ErrorAction SilentlyContinue
      }
      Stop-PackagedProcesses
      Wait-PortReleased -LocalPort 3100
      Start-Sleep -Seconds $launchRetryDelaySeconds
    }
  }

  throw "Packaged desktop failed to reach readiness after $launchAttempts launch attempts."
}

if (-not (Test-Path $exePath)) {
  throw "Packaged desktop executable missing at $exePath. Run 'pnpm desktop:build' first."
}

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
Remove-Item $stdoutLog, $stderrLog, $healthArtifact, $readyArtifact, $askArtifact, $askRepeatArtifact, $proofArtifact, $recentProofsArtifact, $replayArtifact, $orgStatusArtifact, $sessionBeforeArtifact, $sessionAliasesArtifact, $sessionConnectArtifact, $sessionAfterConnectArtifact, $sessionSwitchArtifact, $sessionAfterSwitchArtifact, $sessionRestoreArtifact, $metadataSearchArtifact, $metadataRetrieveArtifact, $ingestLatestArtifact, $refreshSummaryArtifact, $refreshDiffArtifact, $orgPipelineArtifact, $staleSeedArtifact, $resultArtifact -ErrorAction SilentlyContinue
Remove-Item $relaunchStdoutLog, $relaunchStderrLog, $relaunchHealthArtifact, $relaunchReadyArtifact -ErrorAction SilentlyContinue
Initialize-SmokeAppDataRoot -AppDataRoot $smokeAppDataRoot -StaleSeedPath $staleSeedArtifact
Set-Item -Path Env:ORGUMENTED_APP_DATA_ROOT -Value $smokeAppDataRoot

$desktopProcess = $null
$sessionBefore = $null
$sessionRestoreStatus = 'not-needed'
$sessionConnectStatus = 'skipped-no-aliases'
$sessionSwitchStatus = 'skipped'
$sessionConnectAlias = $null
$sessionSwitchAlias = $null
$metadataSearchStatus = 'skipped-disconnected'
$metadataRetrieveStatus = 'skipped-disconnected'
$refreshWorkflowStatus = 'skipped-disconnected'
$refreshDiffStatus = 'skipped-disconnected'
$orgPipelineStatus = 'skipped-disconnected'
$metadataRetrieveArgCount = 0
$metadataRetrieveSnapshotId = ''
$refreshSnapshotId = ''
$launchAttemptsUsed = 0
$relaunchAttemptsUsed = 0
$relaunchVerified = $false

try {
  Stop-PackagedProcesses
  Wait-PortReleased -LocalPort 3100
  $launchResult = Start-PackagedDesktop -ExecutablePath $exePath -StdoutLogPath $stdoutLog -StderrLogPath $stderrLog
  $desktopProcess = $launchResult.Process
  $launchAttemptsUsed = $launchResult.LaunchAttemptsUsed

  $health = Invoke-JsonGet -Url 'http://127.0.0.1:3100/health' -ArtifactPath $healthArtifact
  if ($health.status -ne 'ok') {
    throw "Health check did not return status=ok"
  }

  $ready = Invoke-JsonGet -Url 'http://127.0.0.1:3100/ready' -ArtifactPath $readyArtifact
  if ($ready.status -ne 'ready') {
    throw "Ready check did not return status=ready"
  }
  if ($ready.checks.bootstrap.status -ne 'ready') {
    throw "Ready check reported unexpected bootstrap status: $($ready.checks.bootstrap.status)"
  }
  if ([string]::IsNullOrWhiteSpace($ready.checks.bootstrap.message) -or -not $ready.checks.bootstrap.message.StartsWith('runtime bootstrap ready snapshot=')) {
    throw "Ready check did not report stale-bootstrap recovery via runtime bootstrap message."
  }
  if (($ready.checks.db.nodeCount ?? 0) -le 0 -or ($ready.checks.db.edgeCount ?? 0) -le 0) {
    throw "Ready check reported an empty graph runtime."
  }
  if (-not ($ready.checks.evidence.ok)) {
    throw "Ready check reported missing evidence index."
  }

  $askBody = @{
    query = 'What touches Opportunity.StageName?'
    maxCitations = 5
    consistencyCheck = $true
  }
  $ask = Invoke-JsonPost -Url 'http://127.0.0.1:3100/ask' -ArtifactPath $askArtifact -Body $askBody
  if ([string]::IsNullOrWhiteSpace($ask.trustLevel)) {
    throw 'Ask response missing trustLevel'
  }
  if (-not $ask.proof -or [string]::IsNullOrWhiteSpace($ask.proof.proofId) -or [string]::IsNullOrWhiteSpace($ask.proof.replayToken)) {
    throw 'Ask response missing deterministic proof identifiers'
  }
  $askRepeat = Invoke-JsonPost -Url 'http://127.0.0.1:3100/ask' -ArtifactPath $askRepeatArtifact -Body $askBody
  if ([string]::IsNullOrWhiteSpace($askRepeat.trustLevel)) {
    throw 'Repeated ask response missing trustLevel'
  }
  if (-not $askRepeat.proof -or [string]::IsNullOrWhiteSpace($askRepeat.proof.proofId) -or [string]::IsNullOrWhiteSpace($askRepeat.proof.replayToken)) {
    throw 'Repeated ask response missing deterministic proof identifiers'
  }
  if ($ask.proof.proofId -ne $askRepeat.proof.proofId) {
    throw "Repeated ask changed proofId from $($ask.proof.proofId) to $($askRepeat.proof.proofId)"
  }
  if ($ask.proof.replayToken -ne $askRepeat.proof.replayToken) {
    throw "Repeated ask changed replayToken from $($ask.proof.replayToken) to $($askRepeat.proof.replayToken)"
  }
  $replay = Invoke-JsonPost -Url 'http://127.0.0.1:3100/ask/replay' -ArtifactPath $replayArtifact -Body @{ replayToken = $ask.proof.replayToken }
  if ($replay.status -ne 'implemented') {
    throw 'Ask replay did not return status=implemented'
  }
  if (-not $replay.matched -or -not $replay.corePayloadMatched -or -not $replay.metricsMatched) {
    throw 'Ask replay did not preserve deterministic, payload, and metric parity'
  }
  if ($replay.proofId -ne $ask.proof.proofId) {
    throw "Ask replay proofId $($replay.proofId) did not match original $($ask.proof.proofId)"
  }
  if ($replay.replayToken -ne $ask.proof.replayToken) {
    throw "Ask replay token $($replay.replayToken) did not match original $($ask.proof.replayToken)"
  }
  $proofLookup = Invoke-JsonGet -Url "http://127.0.0.1:3100/ask/proof/$($ask.proof.proofId)" -ArtifactPath $proofArtifact
  if ($proofLookup.status -ne 'implemented') {
    throw 'Ask proof lookup did not return status=implemented'
  }
  if ($proofLookup.proof.proofId -ne $ask.proof.proofId -or $proofLookup.proof.replayToken -ne $ask.proof.replayToken) {
    throw 'Ask proof lookup did not return the expected proof identifiers'
  }
  $recentProofs = Invoke-JsonGet -Url 'http://127.0.0.1:3100/ask/proofs/recent?limit=10' -ArtifactPath $recentProofsArtifact
  if ($recentProofs.status -ne 'implemented' -or $recentProofs.total -lt 1) {
    throw 'Recent proofs lookup did not return implemented status with at least one proof'
  }
  if ($recentProofs.proofs[0].proofId -ne $ask.proof.proofId) {
    throw "Recent proofs did not return the latest proof first (expected $($ask.proof.proofId))"
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
    $sessionForMetadata = Invoke-WithTransientRetry -Description 'GET http://127.0.0.1:3100/org/session for metadata validation' -Operation {
      Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3100/org/session'
    }
    if ($sessionForMetadata.status -eq 'connected' -and -not [string]::IsNullOrWhiteSpace($sessionForMetadata.activeAlias)) {
      $metadataSearch = Invoke-JsonGet -Url 'http://127.0.0.1:3100/org/metadata/search?q=Opportunity&limit=25' -ArtifactPath $metadataSearchArtifact
      if (($metadataSearch.totalResults ?? 0) -le 0 -or -not $metadataSearch.results) {
        throw 'Metadata search did not return any selectable results for retrieve handoff validation.'
      }
      $metadataSearchStatus = 'verified'

      $selectionResult = $metadataSearch.results | Select-Object -First 1
      $selectionType = [string]$selectionResult.type
      $selectionName = [string]$selectionResult.name
      $selectionKind = [string]$selectionResult.kind
      if ([string]::IsNullOrWhiteSpace($selectionType)) {
        throw 'Metadata search result did not include a type for retrieve handoff validation.'
      }

      $selection = @{
        type = $selectionType
      }
      if ($selectionKind -eq 'member' -and -not [string]::IsNullOrWhiteSpace($selectionName)) {
        $selection.members = @($selectionName)
      }

      $metadataRetrieve = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/metadata/retrieve' -ArtifactPath $metadataRetrieveArtifact -Body @{
        selections = @($selection)
        autoRefresh = $true
      }

      if ($metadataRetrieve.status -ne 'completed') {
        throw 'Metadata retrieve did not return status=completed for handoff validation.'
      }
      if ([string]::IsNullOrWhiteSpace($metadataRetrieve.alias)) {
        throw 'Metadata retrieve did not return a connected alias for handoff validation.'
      }
      if ([string]::IsNullOrWhiteSpace($metadataRetrieve.parsePath)) {
        throw 'Metadata retrieve did not return parsePath for handoff validation.'
      }
      if (-not $metadataRetrieve.metadataArgs -or $metadataRetrieve.metadataArgs.Count -le 0) {
        throw 'Metadata retrieve did not return metadata arguments for handoff validation.'
      }
      if (-not $metadataRetrieve.refresh) {
        throw 'Metadata retrieve did not include refresh summary for handoff validation.'
      }

      $metadataRetrieveArgCount = [int]$metadataRetrieve.metadataArgs.Count
      $metadataRetrieveStatus = 'verified'

      $latestIngest = Invoke-JsonGet -Url 'http://127.0.0.1:3100/ingest/latest' -ArtifactPath $ingestLatestArtifact
      if (-not $latestIngest.latest) {
        throw 'Latest ingest summary did not include a current refresh state for handoff validation.'
      }
      $metadataRetrieveSnapshotId = [string]$latestIngest.latest.snapshotId
      if ([string]::IsNullOrWhiteSpace($metadataRetrieveSnapshotId)) {
        throw 'Latest ingest summary did not include snapshotId for handoff validation.'
      }
      if ([string]$latestIngest.latest.sourcePath -ne [string]$metadataRetrieve.parsePath) {
        throw 'Latest ingest summary sourcePath did not match metadata retrieve parsePath for handoff validation.'
      }

      $refreshSummary = Invoke-JsonPost -Url 'http://127.0.0.1:3100/refresh' -ArtifactPath $refreshSummaryArtifact -Body @{
        mode = 'full'
        summaryOnly = $true
      }
      $refreshSnapshotId = [string]$refreshSummary.snapshotId
      if ([string]::IsNullOrWhiteSpace($refreshSnapshotId)) {
        throw 'Refresh summary did not include snapshotId for handoff validation.'
      }
      if ([string]$refreshSummary.sourcePath -ne [string]$metadataRetrieve.parsePath) {
        throw 'Refresh summary sourcePath did not match metadata retrieve parsePath for handoff validation.'
      }
      if (($refreshSummary.nodeCount ?? 0) -le 0 -or ($refreshSummary.edgeCount ?? 0) -le 0) {
        throw 'Refresh summary reported an empty graph for handoff validation.'
      }
      $refreshWorkflowStatus = 'verified'

      if ($metadataRetrieveSnapshotId -eq $refreshSnapshotId) {
        $refreshDiffStatus = 'skipped-same-snapshot'
      } else {
        $refreshDiff = Invoke-JsonGet -Url "http://127.0.0.1:3100/refresh/diff/$metadataRetrieveSnapshotId/$refreshSnapshotId" -ArtifactPath $refreshDiffArtifact
        if (
          [string]$refreshDiff.snapshots.from.snapshotId -ne $metadataRetrieveSnapshotId -or
          [string]$refreshDiff.snapshots.to.snapshotId -ne $refreshSnapshotId
        ) {
          throw 'Refresh diff snapshot lineage did not match the expected handoff-backed snapshot pair.'
        }
        if ([string]::IsNullOrWhiteSpace([string]$refreshDiff.meaningChangeSummary)) {
          throw 'Refresh diff did not include meaningChangeSummary for handoff validation.'
        }
        $refreshDiffStatus = 'verified'
      }

      $orgPipeline = Invoke-JsonPost -Url 'http://127.0.0.1:3100/org/retrieve' -ArtifactPath $orgPipelineArtifact -Body @{
        alias = $metadataRetrieve.alias
        runAuth = $false
        runRetrieve = $true
        autoRefresh = $true
        selections = @($selection)
      }
      if ($orgPipeline.status -ne 'completed') {
        throw 'Org pipeline did not return status=completed for handoff validation.'
      }
      if ([string]$orgPipeline.alias -ne [string]$metadataRetrieve.alias) {
        throw 'Org pipeline alias did not match metadata retrieve alias for handoff validation.'
      }
      if ([string]$orgPipeline.parsePath -ne [string]$metadataRetrieve.parsePath) {
        throw 'Org pipeline parsePath did not match metadata retrieve parsePath for handoff validation.'
      }
      if (-not $orgPipeline.metadataArgs -or $orgPipeline.metadataArgs.Count -le 0) {
        throw 'Org pipeline did not return metadata arguments for handoff validation.'
      }
      if (-not $orgPipeline.steps -or $orgPipeline.steps.Count -le 0) {
        throw 'Org pipeline did not return step summary for handoff validation.'
      }
      $retrieveStep = $orgPipeline.steps | Where-Object { $_.step -eq 'retrieve' } | Select-Object -First 1
      if (-not $retrieveStep -or $retrieveStep.status -ne 'completed') {
        throw 'Org pipeline did not report a completed retrieve step for handoff validation.'
      }
      $orgPipelineStatus = 'verified'
    }

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

  if ($desktopProcess -and -not $desktopProcess.HasExited) {
    Stop-Process -Id $desktopProcess.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-PackagedProcesses
  Wait-PortReleased -LocalPort 3100

  $relaunchResult = Start-PackagedDesktop -ExecutablePath $exePath -StdoutLogPath $relaunchStdoutLog -StderrLogPath $relaunchStderrLog
  $desktopProcess = $relaunchResult.Process
  $relaunchAttemptsUsed = $relaunchResult.LaunchAttemptsUsed

  $relaunchHealth = Invoke-JsonGet -Url 'http://127.0.0.1:3100/health' -ArtifactPath $relaunchHealthArtifact
  if ($relaunchHealth.status -ne 'ok') {
    throw "Relaunch health check did not return status=ok"
  }

  $relaunchReady = Invoke-JsonGet -Url 'http://127.0.0.1:3100/ready' -ArtifactPath $relaunchReadyArtifact
  if ($relaunchReady.status -ne 'ready') {
    throw "Relaunch ready check did not return status=ready"
  }
  if ($relaunchReady.checks.bootstrap.status -ne 'ready') {
    throw "Relaunch ready check reported unexpected bootstrap status: $($relaunchReady.checks.bootstrap.status)"
  }
  $relaunchBootstrapMessage = $relaunchReady.checks.bootstrap.message
  $relaunchReusedGroundedRuntime = $relaunchBootstrapMessage -eq 'runtime already grounded'
  $relaunchRecoveredGroundedRuntime =
    -not [string]::IsNullOrWhiteSpace($relaunchBootstrapMessage) -and
    $relaunchBootstrapMessage.StartsWith('runtime bootstrap ready snapshot=')
  if (-not $relaunchReusedGroundedRuntime -and -not $relaunchRecoveredGroundedRuntime) {
    throw "Relaunch ready check did not report a grounded runtime state."
  }
  if (($relaunchReady.checks.db.nodeCount ?? 0) -le 0 -or ($relaunchReady.checks.db.edgeCount ?? 0) -le 0) {
    throw "Relaunch ready check reported an empty graph runtime."
  }
  if (-not ($relaunchReady.checks.evidence.ok)) {
    throw "Relaunch ready check reported missing evidence index."
  }
  $relaunchVerified = $true

  $artifacts = @(
    'logs/desktop-release-smoke.stdout.log'
    'logs/desktop-release-smoke.stderr.log'
    'logs/desktop-release-smoke-stale-seed.json'
    'logs/desktop-release-smoke-relaunch.stdout.log'
    'logs/desktop-release-smoke-relaunch.stderr.log'
    'logs/desktop-release-smoke-health.json'
    'logs/desktop-release-smoke-ready.json'
    'logs/desktop-release-smoke-relaunch-health.json'
    'logs/desktop-release-smoke-relaunch-ready.json'
    'logs/desktop-release-smoke-ask.json'
    'logs/desktop-release-smoke-ask-repeat.json'
    'logs/desktop-release-smoke-proof.json'
    'logs/desktop-release-smoke-recent-proofs.json'
    'logs/desktop-release-smoke-replay.json'
    'logs/desktop-release-smoke-org-status.json'
    'logs/desktop-release-smoke-session-before.json'
    'logs/desktop-release-smoke-session-aliases.json'
  )
  if ($metadataSearchStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-metadata-search.json'
  }
  if ($metadataRetrieveStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-metadata-retrieve.json'
    $artifacts += 'logs/desktop-release-smoke-ingest-latest.json'
  }
  if ($refreshWorkflowStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-refresh-summary.json'
  }
  if ($refreshDiffStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-refresh-diff.json'
  }
  if ($orgPipelineStatus -eq 'verified') {
    $artifacts += 'logs/desktop-release-smoke-org-pipeline.json'
  }
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
    askReplayToken = $ask.proof.replayToken
    replayMatched = $replay.matched
    replayCorePayloadMatched = $replay.corePayloadMatched
    replayMetricsMatched = $replay.metricsMatched
    proofLookupMatched = $proofLookup.proof.proofId -eq $ask.proof.proofId -and $proofLookup.proof.replayToken -eq $ask.proof.replayToken
    recentProofsMatched = $recentProofs.proofs[0].proofId -eq $ask.proof.proofId
    sessionConnectStatus = $sessionConnectStatus
    sessionConnectAlias = $sessionConnectAlias
    sessionSwitchStatus = $sessionSwitchStatus
    sessionSwitchAlias = $sessionSwitchAlias
    sessionRestoreStatus = $sessionRestoreStatus
    metadataSearchStatus = $metadataSearchStatus
    metadataRetrieveStatus = $metadataRetrieveStatus
    metadataRetrieveArgCount = $metadataRetrieveArgCount
    metadataRetrieveSnapshotId = $metadataRetrieveSnapshotId
    refreshWorkflowStatus = $refreshWorkflowStatus
    refreshSnapshotId = $refreshSnapshotId
    refreshDiffStatus = $refreshDiffStatus
    orgPipelineStatus = $orgPipelineStatus
    staleBootstrapSeeded = $true
    staleBootstrapSeedArtifact = 'logs/desktop-release-smoke-stale-seed.json'
    bootstrapMessage = $ready.checks.bootstrap.message
    relaunchBootstrapMessage = $relaunchReady.checks.bootstrap.message
    relaunchReusedGroundedRuntime = $relaunchReusedGroundedRuntime
    relaunchRecoveredGroundedRuntime = $relaunchRecoveredGroundedRuntime
    launchAttemptsUsed = $launchAttemptsUsed
    relaunchVerified = $relaunchVerified
    relaunchAttemptsUsed = $relaunchAttemptsUsed
    artifacts = $artifacts
  } | ConvertTo-Json -Depth 8 | Set-Content -Path $resultArtifact

  Get-Content $resultArtifact
} finally {
  if ($desktopProcess -and -not $desktopProcess.HasExited) {
    Stop-Process -Id $desktopProcess.Id -Force
  }
  Stop-PackagedProcesses
}
