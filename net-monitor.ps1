# net-monitor.ps1
# مراقب استهلاك النت - بدون نت، بدون صلاحيات
$reportFile = "C:\Users\Salem Magdy\Desktop\استهلاك النت.txt"
$stateFile = "C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\.net-state.txt"
$prevSent = 0; $prevRecv = 0; $lastHour = -1

# استرجاع آخر حالة (لو السكربت اتقفل واشتغل تاني)
if (Test-Path $stateFile) {
    try { $prev = Get-Content $stateFile -Raw; $parts = $prev.Split(','); $prevSent = [long]$parts[0]; $prevRecv = [long]$parts[1]; $lastHour = [int]$parts[2] } catch {}
}

# قراءة بايتات netstat
function Get-NetStats {
    $raw = netstat -e | Select-Object -Skip 4 | Select-Object -First 2
    $recv = [long]($raw[0] -replace '[^0-9]','')
    $sent = [long]($raw[1] -replace '[^0-9]','')
    return @{Sent=$sent; Recv=$recv}
}

# كتابة التقرير
function Write-Report($s, $r) {
    $sentMB = $s / 1MB; $recvMB = $r / 1MB; $totalMB = $sentMB + $recvMB
    $line  = "=============================="
    $line += "`nتاريخ: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $line += "`nالفترة: آخر ساعة"
    $line += "`n---------------------"
    $line += "`nمرسل:    {0:N2} MB" -f $sentMB
    $line += "`nمستقبل:  {0:N2} MB" -f $recvMB
    $line += "`nالإجمالي: {0:N2} MB" -f $totalMB
    $line += "`n"
    Add-Content -Path $reportFile -Value $line -Encoding UTF8
}

# حفظ الحالة
function Save-State($s, $r, $h) { Set-Content -Path $stateFile -Value "$s,$r,$h" -Encoding UTF8 }

$stats = Get-NetStats
if ($prevSent -eq 0) { $prevSent = $stats.Sent; $prevRecv = $stats.Recv }

while ($true) {
    $h = (Get-Date).Hour
    if ($h -ne $lastHour -and $lastHour -ge 0) {
        $cur = Get-NetStats
        $dSent = [Math]::Max(0, $cur.Sent - $prevSent)
        $dRecv = [Math]::Max(0, $cur.Recv - $prevRecv)
        if ($dSent -gt 0 -or $dRecv -gt 0) { Write-Report $dSent $dRecv }
        $prevSent = $cur.Sent; $prevRecv = $cur.Recv
    }
    $lastHour = $h
    Save-State $prevSent $prevRecv $lastHour
    Start-Sleep -Seconds 30
}
