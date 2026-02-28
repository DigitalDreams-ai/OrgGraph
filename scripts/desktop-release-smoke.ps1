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
$resultArtifact = Join-Path $logsDir 'desktop-release-smoke-result.json'

function Stop-PackagedProcesses {
  $targets = Get-Process orgumented-desktop, node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*OrgGraph\\apps\\desktop\\src-tauri\\target\\release*" }
  if ($targets) {
    $targets | Stop-Process -Force
  }
}

function Invoke-JsonGet([string]$Url, [string]$ArtifactPath) {
  $response = Invoke-RestMethod -Method Get -Uri $Url
  $response | ConvertTo-Json -Depth 12 | Set-Content -Path $ArtifactPath
  return $response
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
Remove-Item $stdoutLog, $stderrLog, $healthArtifact, $readyArtifact, $askArtifact, $orgStatusArtifact, $resultArtifact -ErrorAction SilentlyContinue

$desktopProcess = $null

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

  @{
    status = 'passed'
    desktopPid = $desktopProcess.Id
    healthStatus = $health.status
    readyStatus = $ready.status
    askTrustLevel = $ask.trustLevel
    askProofId = $ask.proof.proofId
    artifacts = @(
      'logs/desktop-release-smoke.stdout.log'
      'logs/desktop-release-smoke.stderr.log'
      'logs/desktop-release-smoke-health.json'
      'logs/desktop-release-smoke-ready.json'
      'logs/desktop-release-smoke-ask.json'
      'logs/desktop-release-smoke-org-status.json'
    )
  } | ConvertTo-Json -Depth 8 | Set-Content -Path $resultArtifact

  Get-Content $resultArtifact
} finally {
  if ($desktopProcess -and -not $desktopProcess.HasExited) {
    Stop-Process -Id $desktopProcess.Id -Force
  }
  Stop-PackagedProcesses
}
