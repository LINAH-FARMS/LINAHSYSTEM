param(
    [string]$htmlPath = "C:\Users\Salem Magdy\AppData\Local\Temp\opencode\repo\index.html"
)

$content = Get-Content $htmlPath -Raw

Write-Host "Original size: $($content.Length)"

# Step 1: Add new scripts in head after external scripts line
$old1 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script><script src="linah_sanitizer.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script><script src="script.js" defer></script><script src="finance.js" defer></script>'
$new1 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script><script src="linah_sanitizer.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>' + "`r`n" + '  <script src="database.js"></script>' + "`r`n" + '  <script src="init-data.js"></script>' + "`r`n" + '  <script src="app.js"></script>' + "`r`n" + '  <script src="script.js" defer></script><script src="finance.js" defer></script>'
$content = $content.Replace($old1, $new1)

# Step 2: Remove Script Block 2 (lines 2784-17024)
$sb2Start = '  <script>' + "`r`n" + '    // Check server on load and migrate data'
$sb2End = "`r`n" + '    switchTab(' + "'tab-dashboard'" + ');' + "`r`n" + '  </script>'

$idxStart = $content.IndexOf($sb2Start)
$idxEnd = $content.IndexOf($sb2End, $idxStart) + $sb2End.Length
Write-Host "Script Block 2: start=$idxStart end=$idxEnd"
if ($idxStart -ge 0 -and $idxEnd -gt $idxStart) {
    $content = $content.Substring(0, $idxStart) + $content.Substring($idxEnd)
    Write-Host "Removed Script Block 2"
} else {
    Write-Host "ERROR: Could not find Script Block 2"
}

# Step 3: Remove Script Block 3
$sb3Start = '<script>' + "`r`n" + '// Auto-associate labels with inputs to fix accessibility warnings'
$sb3End = 'function _safeJsonParse(val, fallback) { try { var r = JSON.parse(val); return (r !== null && r !== undefined) ? r : fallback; } catch(e) { return fallback; } }' + "`r`n" + "`r`n" + '</script>'

$idxStart3 = $content.IndexOf($sb3Start)
$idxEnd3 = $content.IndexOf($sb3End, $idxStart3) + $sb3End.Length
Write-Host "Script Block 3: start=$idxStart3 end=$idxEnd3"
if ($idxStart3 -ge 0 -and $idxEnd3 -gt $idxStart3) {
    $content = $content.Substring(0, $idxStart3) + $content.Substring($idxEnd3)
    Write-Host "Removed Script Block 3"
} else {
    Write-Host "ERROR: Could not find Script Block 3"
}

# Step 4: Remove Script Block 4
$sb4Start = '<script>' + "`r`n" + '// ???? ???????? ?????????? ?? ??? ???????.xlsx (????? ??????????)'
$sb4End = 'function formatQty(q){' + "`r`n" + '  if(!isFinite(q)) return ' + "'0'" + ';' + "`r`n" + '  var r=Math.round(q*1000)/1000;' + "`r`n" + '  return (Math.abs(r-Math.round(r))<0.001)? String(Math.round(r)) : (Math.round(q*100)/100).toFixed(2);' + "`r`n" + '}' + "`r`n" + '</script>'

$idxStart4 = $content.IndexOf($sb4Start)
# If couldn't find by Arabic comment, try English version
if ($idxStart4 -lt 0) {
    $sb4StartAlt = '<script>' + "`r`n" + "// "
    $idxStart4 = $content.IndexOf($sb4StartAlt)
}
$idxEnd4 = $content.IndexOf($sb4End, $idxStart4) + $sb4End.Length
Write-Host "Script Block 4: start=$idxStart4 end=$idxEnd4"
if ($idxStart4 -ge 0 -and $idxEnd4 -gt $idxStart4) {
    $content = $content.Substring(0, $idxStart4) + $content.Substring($idxEnd4)
    Write-Host "Removed Script Block 4"
} else {
    Write-Host "ERROR: Could not find Script Block 4"
}

# Step 5: Add app-extra.js before hr_fill.js
$old5 = '<script src="hr_fill.js"></script>'
$new5 = '<script src="app-extra.js"></script>' + "`r`n" + '<script src="hr_fill.js"></script>'
$content = $content.Replace($old5, $new5)

# Clean up excessive blank lines
while ($content.Contains("`r`n`r`n`r`n")) {
    $content = $content.Replace("`r`n`r`n`r`n", "`r`n`r`n")
}

$content | Set-Content $htmlPath -Encoding UTF8
Write-Host "Modified size: $($content.Length)"
Write-Host "Done!"
