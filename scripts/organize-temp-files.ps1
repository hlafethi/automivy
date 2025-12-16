# Script pour organiser les fichiers temporaires
# Déplace les fichiers de debug/test/check/fix dans scripts/temp/

$tempDir = "scripts\temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    Write-Host "✅ Dossier scripts/temp/ créé"
}

# Fichiers à déplacer (patterns)
$patterns = @(
    "check-*.js",
    "check-*.cjs",
    "debug-*.js",
    "debug-*.cjs",
    "test-*.js",
    "test-*.cjs",
    "fix-*.js",
    "fix-*.cjs",
    "analyze-*.js",
    "deploy-*.js",
    "example-*.js",
    "solution-*.js",
    "serve-*.js",
    "mock-*.js",
    "force-*.js",
    "generate-*.js",
    "update-*.js",
    "add-*.js",
    "add-*.cjs",
    "create-*.js",
    "create-*.cjs"
)

# Fichiers à exclure (déjà dans scripts/ ou backend/)
$exclude = @(
    "scripts\test-migration.js",
    "scripts\check-and-reset-user-password.js",
    "scripts\create-*.js",
    "scripts\fix-*.js"
)

$movedCount = 0

foreach ($pattern in $patterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $shouldExclude = $false
        foreach ($ex in $exclude) {
            if ($file.FullName -like "*$ex*") {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            $destPath = Join-Path $tempDir $file.Name
            if (-not (Test-Path $destPath)) {
                Move-Item -Path $file.FullName -Destination $destPath -Force
                Write-Host "✅ Déplacé: $($file.Name)"
                $movedCount++
            } else {
                Write-Host "⚠️  Déjà présent: $($file.Name)"
            }
        }
    }
}

Write-Host "`n✅ $movedCount fichiers déplacés dans scripts/temp/"

