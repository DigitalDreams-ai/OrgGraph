param(
  [string]$RootName = "org",
  [string]$BaseBranch = "",
  [string]$ParentPath = "..",
  [switch]$Teardown
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$parent = Resolve-Path (Join-Path $repoRoot $ParentPath)

if ([string]::IsNullOrWhiteSpace($BaseBranch)) {
  $BaseBranch = (git -C $repoRoot branch --show-current).Trim()
  if ([string]::IsNullOrWhiteSpace($BaseBranch)) {
    throw "Could not determine current branch. Pass -BaseBranch explicitly."
  }
}

$worktrees = @(
  @{ Name = "$RootName-coord"; Branch = $BaseBranch; Detached = $false },
  @{ Name = "$RootName-pla"; Branch = $BaseBranch; Detached = $true },
  @{ Name = "$RootName-ui"; Branch = $BaseBranch; Detached = $true },
  @{ Name = "$RootName-verify"; Branch = $BaseBranch; Detached = $true }
)

Write-Host "Repo root: $repoRoot"
Write-Host "Parent path: $parent"

if ($Teardown) {
  Write-Host ""
  Write-Host "=== Teardown: Removing worktrees ==="
  foreach ($entry in $worktrees) {
    $targetPath = Join-Path $parent $entry.Name
    if (Test-Path $targetPath) {
      Write-Host "Removing worktree: $targetPath"
      git -C $repoRoot worktree remove --force $targetPath
    } else {
      Write-Host "Skipping (not found): $targetPath"
    }
  }
  Write-Host ""
  Write-Host "Pruning worktree state..."
  git -C $repoRoot worktree prune
  Write-Host "Teardown complete."
  exit 0
}

Write-Host ""
Write-Host "=== Setup: Creating worktrees ==="
foreach ($entry in $worktrees) {
  $targetPath = Join-Path $parent $entry.Name
  if (Test-Path $targetPath) {
    Write-Host "Skipping existing worktree path: $targetPath"
    continue
  }

  if ($entry.Detached) {
    Write-Host "Creating detached worktree $targetPath from $($entry.Branch)"
    git -C $repoRoot worktree add --detach $targetPath $entry.Branch
  } else {
    Write-Host "Creating worktree $targetPath from $($entry.Branch)"
    git -C $repoRoot worktree add $targetPath $entry.Branch
  }
}

Write-Host ""
Write-Host "Suggested next commands:"
Write-Host ""
Write-Host "  # Note: planner/workflow/verifier worktrees are created detached at $BaseBranch."
Write-Host "  # Create a branch inside each worker worktree before starting Codex."
Write-Host ""
Write-Host "  # Coordinator"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-coord")"
Write-Host "  git switch -c dna-coordination-bootstrap"
Write-Host "  scripts/start-orgumented-codex-role.ps1 -Role coordinator"
Write-Host ""
Write-Host "  # Planner worker"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-pla")"
Write-Host "  pnpm install --frozen-lockfile"
Write-Host "  git switch -c dna-planner-slice"
Write-Host "  scripts/start-orgumented-codex-role.ps1 -Role planner"
Write-Host ""
Write-Host "  # Workflow worker"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-ui")"
Write-Host "  pnpm install --frozen-lockfile"
Write-Host "  git switch -c dna-workflow-slice"
Write-Host "  scripts/start-orgumented-codex-role.ps1 -Role workflow"
Write-Host ""
Write-Host "  # Verifier"
Write-Host "  Set-Location $(Join-Path $parent "$RootName-verify")"
Write-Host "  pnpm install --frozen-lockfile"
Write-Host "  scripts/start-orgumented-codex-role.ps1 -Role verifier"
Write-Host "  # Verifier checks out worker branches for verification"
Write-Host ""
Write-Host "To teardown all worktrees later:"
Write-Host "  scripts/setup-orgumented-multi-agent-worktrees.ps1 -Teardown"
