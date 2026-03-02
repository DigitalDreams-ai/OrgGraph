param(
  [Parameter(Mandatory)]
  [ValidateSet("coordinator", "planner", "workflow", "verifier")]
  [string]$Role,

  [string]$WorktreePath = "",
  [switch]$PrintOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$parent = Resolve-Path (Join-Path $repoRoot "..")

$roleMap = @{
  coordinator = @{
    Prompt = Join-Path $repoRoot ".codex/roles/orgumented-coordinator.md"
    Worktree = Join-Path $parent "org-coord"
  }
  planner = @{
    Prompt = Join-Path $repoRoot ".codex/roles/orgumented-worker-planner.md"
    Worktree = Join-Path $parent "org-pla"
  }
  workflow = @{
    Prompt = Join-Path $repoRoot ".codex/roles/orgumented-worker-workflow.md"
    Worktree = Join-Path $parent "org-ui"
  }
  verifier = @{
    Prompt = Join-Path $repoRoot ".codex/roles/orgumented-verifier.md"
    Worktree = Join-Path $parent "org-verify"
  }
}

$entry = $roleMap[$Role]
$promptPath = $entry.Prompt
$targetWorktree = if ([string]::IsNullOrWhiteSpace($WorktreePath)) {
  $entry.Worktree
} else {
  Resolve-Path $WorktreePath
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw "codex CLI was not found on PATH."
}

if (-not (Test-Path $promptPath)) {
  throw "Prompt file not found: $promptPath"
}

if (-not (Test-Path $targetWorktree)) {
  throw "Worktree path not found: $targetWorktree"
}

$prompt = Get-Content -Path $promptPath -Raw

Write-Host "Role:      $Role"
Write-Host "Prompt:    $promptPath"
Write-Host "Worktree:  $targetWorktree"
Write-Host ""

if ($PrintOnly) {
  Write-Host "Launch command:"
  Write-Host "  codex -C `"$targetWorktree`" `<prompt from $promptPath`>"
  exit 0
}

& codex -C $targetWorktree $prompt
