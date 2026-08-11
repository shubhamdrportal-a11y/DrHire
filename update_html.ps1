$pagesDir = "c:\Users\WebDevlopment\Desktop\ShubhamSir\drhire\frontend\pages"

$files = Get-ChildItem -Path $pagesDir -Filter "dashboard-*.html"

foreach ($file in $files) {
    # Skip dashboard-admin.html as we just updated it
    if ($file.Name -eq "dashboard-admin.html") { continue }

    $content = Get-Content -Path $file.FullName -Raw

    # Identify the role and page type
    $role = ""
    if ($file.Name -match "dashboard-admin") { $role = "admin" }
    elseif ($file.Name -match "dashboard-doctor") { $role = "doctor" }
    elseif ($file.Name -match "dashboard-hospital") { $role = "hospital" }
    elseif ($file.Name -match "dashboard-staff") { $role = "staff" }
    
    $pageType = "main"
    if ($file.Name -match "dashboard-$role-(.*).html") {
        $pageType = $matches[1]
    }

    $jsScript = "dashboard-$role-$pageType.js"
    
    # We want to replace `<script src="../js/dashboard.js"></script>`
    # with `<script src="../js/api.js"></script><script src="../js/auth-guard.js"></script><script src="../js/$jsScript"></script>`
    
    $replacement = "<script src=`"../js/api.js`"></script>`r`n<script src=`"../js/auth-guard.js`"></script>`r`n<script src=`"../js/$jsScript`"></script>"
    
    # Also we should strip out the inline mock logic that relies on drhire-mock-user if it's there
    $content = $content -replace '<script src="\.\./js/dashboard\.js"></script>', $replacement
    
    # Strip everything between `<script>` and `</script>` at the end if it has mockUser
    $content = $content -replace '(?s)<script>[^<]*drhire-mock-user[^<]*</script>', ""

    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Updated all dashboard HTML files."
