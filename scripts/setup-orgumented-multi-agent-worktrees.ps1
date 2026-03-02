param(
  [string]$RootName = "org",
  [string]$BaseBranch = "main",
  [string]$ParentPath = ".."
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$parent = Resolve-Path (Join-Path $repoRoot $ParentPath)

$worktrees = @(
  @{ Name = "$RootName-coord"; Branch = $BaseBranch },
  @{ Name = "$RootName-pla"; Branch = $BaseBranch },
  @{ Name = "$RootName-ui"; Branch = $BaseBranch }
)

Write-Host "Repo root: $repoRoot"
Write-Host "Parent path: $parent"

foreach ($entry in $worktrees) {
  $targetPath = Join-Path $parent $entry.Name
  if (Test-Path $targetPath) {
    Write-Host "Skipping existing worktree path: $targetPath"
    continue
  }

  Write-Host "Creating worktree $targetPath from $($entry.Branch)"
  git -C $repoRoot worktree add $targetPath $entry.Branch
}

Write-Host ""
Write-Host "Suggested next commands:"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-coord")"
Write-Host "  git switch -c dna-coordination-bootstrap"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-pla")"
Write-Host "  git switch -c dna-planner-slice"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-ui")"
Write-Host "  git switch -c dna-workflow-slice"
