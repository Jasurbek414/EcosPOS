# Savdo - barcha bazalarning kunlik zaxira nusxasi.
#
# Sabab: 2026-09-13 auditi zaxira nusxa umuman yo'qligini aniqladi. Har bir
# kompaniyaning butun savdo tarixi, qarzlari va maosh yozuvlari bitta mashinadagi
# bitta Postgres konteynerida turibdi - disk ishdan chiqsa hammasi yo'qoladi.
#
# DIQQAT: fayl ATAYLAB faqat ASCII belgilardan iborat. Windows PowerShell 5.1
# BOM'siz UTF-8 faylni ANSI deb o'qiydi va tire/qo'shtirnoq kabi belgilar
# skriptni parse bo'lmaydigan holga keltiradi.
#
# Qo'lda ishga tushirish:
#   powershell -ExecutionPolicy Bypass -File "D:\Jasurbek tegilmasin\savdo\scripts\backup-db.ps1"
#
# Har kuni soat 02:00 da avtomatik ishga tushirish (bir marta bajariladi):
#   schtasks /Create /TN "Savdo kunlik zaxira" /SC DAILY /ST 02:00 /RL HIGHEST /TR "powershell -ExecutionPolicy Bypass -File \"D:\Jasurbek tegilmasin\savdo\scripts\backup-db.ps1\""

$ErrorActionPreference = 'Stop'

$BackupDir     = 'D:\Jasurbek tegilmasin\savdo-backups'
$ContainerName = 'savdo-db'
$DbUser        = 'postgres'
$KeepDays      = 7     # kunlik nusxalar necha kun saqlanadi
$KeepWeekly    = 4     # haftalik (yakshanba) nusxalar nechta saqlanadi

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Konteyner ishlayotganini tekshiramiz, aks holda bo'sh fayl yaratib
# "zaxira bor" degan yolg'on ishonch hosil qilib qo'yamiz.
$running = docker ps --filter "name=$ContainerName" --filter "status=running" --format "{{.Names}}"
if ($running -ne $ContainerName) {
    throw "Konteyner $ContainerName ishlamayapti, zaxira olinmadi."
}

$stamp    = Get-Date -Format 'yyyyMMdd-HHmmss'
$isSunday = (Get-Date).DayOfWeek -eq 'Sunday'
$prefix   = if ($isSunday) { 'weekly' } else { 'daily' }
$file     = Join-Path $BackupDir "savdo-$prefix-$stamp.sql"

docker exec $ContainerName pg_dumpall -U $DbUser | Out-File -FilePath $file -Encoding utf8

$sizeMb = [math]::Round((Get-Item $file).Length / 1MB, 2)
if ($sizeMb -le 0) {
    Remove-Item $file -Force
    throw "Zaxira bo'sh chiqdi, fayl o'chirildi. Muammoni tekshiring."
}
Write-Output ("Zaxira tayyor: {0} ({1} MB)" -f $file, $sizeMb)

# Eskilarini tozalash: kunliklar KeepDays kundan eski bo'lsa o'chadi,
# haftaliklardan esa faqat oxirgi KeepWeekly tasi qoladi.
Get-ChildItem $BackupDir -Filter 'savdo-daily-*.sql' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Output ("eski nusxa o'chirildi: {0}" -f $_.Name)
    }

Get-ChildItem $BackupDir -Filter 'savdo-weekly-*.sql' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $KeepWeekly |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Output ("eski haftalik nusxa o'chirildi: {0}" -f $_.Name)
    }

# DIQQAT: bu nusxalar HAM SHU MASHINADA turibdi. Mashina yoki disk butunlay
# ishdan chiqsa ular ham yo'qoladi. Nusxani tashqi diskka yoki boshqa
# kompyuterga ko'chirish tartibini alohida yo'lga qo'yish kerak.
