# Optional real-FBX test support. Production still uses its existing CDN import map.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runtimeDir = Join-Path $repoRoot 'output/character-test-runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$files = @{
    'three.module.mjs' = 'build/three.module.js'
    'FBXLoader.mjs' = 'examples/jsm/loaders/FBXLoader.js'
    'fflate.module.mjs' = 'examples/jsm/libs/fflate.module.js'
    'NURBSCurve.mjs' = 'examples/jsm/curves/NURBSCurve.js'
    'NURBSUtils.mjs' = 'examples/jsm/curves/NURBSUtils.js'
}
foreach ($entry in $files.GetEnumerator()) {
    Invoke-WebRequest -Uri ('https://unpkg.com/three@0.160.0/' + $entry.Value) -OutFile (Join-Path $runtimeDir $entry.Key)
}
foreach ($name in @('FBXLoader.mjs', 'NURBSCurve.mjs', 'NURBSUtils.mjs')) {
    $path = Join-Path $runtimeDir $name
    $source = Get-Content -LiteralPath $path -Raw -Encoding utf8
    $source = $source.Replace("'three'", "'./three.module.mjs'")
    $source = $source.Replace("'../libs/fflate.module.js'", "'./fflate.module.mjs'")
    $source = $source.Replace("'../curves/NURBSCurve.js'", "'./NURBSCurve.mjs'")
    $source = $source.Replace("'../curves/NURBSUtils.js'", "'./NURBSUtils.mjs'")
    Set-Content -LiteralPath $path -Value $source -NoNewline -Encoding utf8
}
Write-Output 'Pinned Three.js test runtime prepared in output/character-test-runtime.'
