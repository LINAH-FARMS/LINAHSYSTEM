// Create a simple 128x128 icon using .NET
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(128, 128)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(0, 37, 94, 84))  # WhatsApp green
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Tahoma", 60, [System.Drawing.FontStyle]::Bold)
$g.DrawString("LS", $font, $brush, 15, 25)
$g.Dispose()
$bmp.Save("C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\chrome-extension\icons\icon128.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Icon created"
