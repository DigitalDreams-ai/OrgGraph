# verify-worker-branch.ps1
# Runs the full gate pipeline on a worker branch before merge.
# Called by the orgumented-verifier agent or manually.
# Does NOT replace CI — runs locally as a pre-merge check.

param(
  [Parameter(Mandatory)]
  [string]$Branch,

  [string]$WorkerName = "",
  [string]$ScopeFiles = "",
  [switch]$SkipDesktopSmoke,
  [switch]$SemanticChange
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsDir = Join-Path $repoRoot "logs"
if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$resultPath = Join-Path $logsDir "verify-worker-branch-result.json"
$startTime = Get-Date

Write-Host "=== Orgumented Worker Branch Verification ==="
Write-Host "Branch:          $Branch"
Write-Host "Worker:          $WorkerName"
Write-Host "Semantic Change: $SemanticChange"
Write-Host "Scope Files:     $ScopeFiles"
Write-Host "Skip Smoke:      $SkipDesktopSmoke"
Write-Host "Repo Root:       $repoRoot"
Write-Host ""

$gates = @()

# ─── Gate 1: Typecheck ───

Write-Host "--- Gate 1: Typecheck ---"
$typecheckResult = @{ gate = "typecheck"; status = "pending"; details = "" }
try {
  $output = & pnpm -r typecheck 2>&1
  if ($LASTEXITCODE -eq 0) {
    $typecheckResult.status = "pass"
    $typecheckResult.details = "clean"
    Write-Host "  PASS"
  } else {
    $typecheckResult.status = "fail"
    $typecheckResult.details = ($output | Select-Object -Last 10) -join "`n"
    Write-Host "  FAIL"
  }
} catch {
  $typecheckResult.status = "fail"
  $typecheckResult.details = $_.Exception.Message
  Write-Host "  FAIL: $($_.Exception.Message)"
}
$gates += $typecheckResult

# ─── Gate 2: API Tests ───

Write-Host "--- Gate 2: API Tests ---"
$apiTestResult = @{ gate = "api-test"; status = "pending"; details = "" }
try {
  $output = & pnpm --filter api test 2>&1
  if ($LASTEXITCODE -eq 0) {
    $apiTestResult.status = "pass"
    $apiTestResult.details = "all tests passed"
    Write-Host "  PASS"
  } else {
    $apiTestResult.status = "fail"
    $apiTestResult.details = ($output | Select-Object -Last 10) -join "`n"
    Write-Host "  FAIL"
  }
} catch {
  $apiTestResult.status = "fail"
  $apiTestResult.details = $_.Exception.Message
  Write-Host "  FAIL: $($_.Exception.Message)"
}
$gates += $apiTestResult

# ─── Gate 3: Web Build ───

Write-Host "--- Gate 3: Web Build ---"
$webBuildResult = @{ gate = "web-build"; status = "pending"; details = "" }
try {
  $output = & pnpm --filter web build 2>&1
  if ($LASTEXITCODE -eq 0) {
    $webBuildResult.status = "pass"
    $webBuildResult.details = "clean"
    Write-Host "  PASS"
  } else {
    $webBuildResult.status = "fail"
    $webBuildResult.details = ($output | Select-Object -Last 10) -join "`n"
    Write-Host "  FAIL"
  }
} catch {
  $webBuildResult.status = "fail"
  $webBuildResult.details = $_.Exception.Message
  Write-Host "  FAIL: $($_.Exception.Message)"
}
$gates += $webBuildResult

# ─── Gate 4: Desktop Build ───

Write-Host "--- Gate 4: Desktop Build ---"
$desktopBuildResult = @{ gate = "desktop-build"; status = "pending"; details = "" }
try {
  $output = & pnpm desktop:build 2>&1
  if ($LASTEXITCODE -eq 0) {
    $desktopBuildResult.status = "pass"
    $desktopBuildResult.details = "clean"
    Write-Host "  PASS"
  } else {
    $desktopBuildResult.status = "fail"
    $desktopBuildResult.details = ($output | Select-Object -Last 10) -join "`n"
    Write-Host "  FAIL"
  }
} catch {
  $desktopBuildResult.status = "fail"
  $desktopBuildResult.details = $_.Exception.Message
  Write-Host "  FAIL: $($_.Exception.Message)"
}
$gates += $desktopBuildResult

# ─── Gate 5: Desktop Smoke ───

Write-Host "--- Gate 5: Desktop Smoke ---"
$desktopSmokeResult = @{ gate = "desktop-smoke"; status = "skipped"; details = ""; evidence = "" }
if (-not $SkipDesktopSmoke) {
  try {
    $output = & pnpm desktop:smoke:release 2>&1
    $smokeResultPath = Join-Path $repoRoot "logs/desktop-release-smoke-result.json"
    if (Test-Path $smokeResultPath) {
      $smokeData = Get-Content $smokeResultPath -Raw | ConvertFrom-Json
      if ($smokeData.status -eq "passed") {
        $desktopSmokeResult.status = "pass"
        $desktopSmokeResult.details = "status=passed"
        $desktopSmokeResult.evidence = $smokeResultPath
        Write-Host "  PASS"
      } else {
        $desktopSmokeResult.status = "fail"
        $desktopSmokeResult.details = "status=$($smokeData.status)"
        $desktopSmokeResult.evidence = $smokeResultPath
        Write-Host "  FAIL: status=$($smokeData.status)"
      }
    } else {
      $desktopSmokeResult.status = "fail"
      $desktopSmokeResult.details = "smoke result artifact not found at $smokeResultPath"
      Write-Host "  FAIL: result artifact missing"
    }
  } catch {
    $desktopSmokeResult.status = "fail"
    $desktopSmokeResult.details = $_.Exception.Message
    Write-Host "  FAIL: $($_.Exception.Message)"
  }
} else {
  Write-Host "  SKIPPED"
}
$gates += $desktopSmokeResult

# ─── Gate 6: Replay Parity ───

Write-Host "--- Gate 6: Replay Parity ---"
$replayResult = @{ gate = "replay-parity"; status = "skipped"; details = "" }
if ($SemanticChange) {
  $smokeResultPath = Join-Path $repoRoot "logs/desktop-release-smoke-result.json"
  if ($desktopSmokeResult.status -eq "pass" -and (Test-Path $smokeResultPath)) {
    $smokeData = Get-Content $smokeResultPath -Raw | ConvertFrom-Json
    $replayMatched = $smokeData.replayMatched
    $coreMatched = $smokeData.replayCorePayloadMatched
    $metricsMatched = $smokeData.replayMetricsMatched

    if ($replayMatched -and $coreMatched -and $metricsMatched) {
      $replayResult.status = "pass"
      $replayResult.details = "replayMatched=$replayMatched corePayloadMatched=$coreMatched metricsMatched=$metricsMatched"
      Write-Host "  PASS"
    } else {
      $replayResult.status = "fail"
      $replayResult.details = "replayMatched=$replayMatched corePayloadMatched=$coreMatched metricsMatched=$metricsMatched"
      Write-Host "  FAIL: $($replayResult.details)"
    }
  } elseif ($desktopSmokeResult.status -eq "skipped") {
    $replayResult.details = "skipped because desktop smoke was skipped"
    Write-Host "  SKIPPED (smoke was skipped)"
  } else {
    $replayResult.status = "fail"
    $replayResult.details = "cannot verify replay parity because desktop smoke failed"
    Write-Host "  FAIL: smoke failed, cannot check replay"
  }
} else {
  Write-Host "  SKIPPED (no semantic change declared)"
}
$gates += $replayResult

# ─── Gate 7: Scope Check ───

Write-Host "--- Gate 7: Scope Check ---"
$scopeResult = @{ gate = "scope-check"; status = "skipped"; details = ""; outOfScopeFiles = @() }
if (-not [string]::IsNullOrWhiteSpace($ScopeFiles)) {
  try {
    $changedFiles = & git -C $repoRoot diff --name-only "main...$Branch" 2>&1
    if ($LASTEXITCODE -ne 0) {
      $scopeResult.status = "fail"
      $scopeResult.details = "git diff failed: $changedFiles"
      Write-Host "  FAIL: git diff failed"
    } else {
      $scopeList = $ScopeFiles -split ","
      $outOfScope = @()
      foreach ($file in $changedFiles) {
        if ([string]::IsNullOrWhiteSpace($file)) { continue }
        $inScope = $false
        foreach ($scope in $scopeList) {
          $trimmedScope = $scope.Trim()
          if ($file -like "$trimmedScope*") { $inScope = $true; break }
        }
        if (-not $inScope) { $outOfScope += $file }
      }
      if ($outOfScope.Count -eq 0) {
        $scopeResult.status = "pass"
        $scopeResult.details = "all changes within declared scope"
        Write-Host "  PASS"
      } else {
        $scopeResult.status = "warn"
        $scopeResult.details = "$($outOfScope.Count) file(s) outside declared scope"
        $scopeResult.outOfScopeFiles = $outOfScope
        Write-Host "  WARN: $($outOfScope.Count) file(s) outside scope:"
        foreach ($f in $outOfScope) { Write-Host "    - $f" }
      }
    }
  } catch {
    $scopeResult.status = "fail"
    $scopeResult.details = $_.Exception.Message
    Write-Host "  FAIL: $($_.Exception.Message)"
  }
} else {
  Write-Host "  SKIPPED (no scope declared)"
}
$gates += $scopeResult

# ─── Aggregate Result ───

$endTime = Get-Date
$failedGates = $gates | Where-Object { $_.status -eq "fail" }
$mergeReady = ($failedGates.Count -eq 0)

$result = @{
  branch     = $Branch
  worker     = $WorkerName
  timestamp  = $startTime.ToString("o")
  durationMs = [int]($endTime - $startTime).TotalMilliseconds
  mergeReady = $mergeReady
  gates      = $gates
}

$resultJson = $result | ConvertTo-Json -Depth 8
$resultJson | Set-Content -Path $resultPath -Encoding utf8

Write-Host ""
Write-Host "=== Verification Complete ==="
Write-Host "Merge Ready: $mergeReady"
Write-Host "Result:      $resultPath"

if ($failedGates.Count -gt 0) {
  Write-Host ""
  Write-Host "Failed gates:"
  foreach ($g in $failedGates) {
    Write-Host "  - $($g.gate): $($g.details)"
  }
  exit 1
}

exit 0
