$destination = ".\zona.plugin.zip"
$source =  Resolve-Path  -Path ".\build"

If(Test-path $destination) {Remove-item $destination}
If(Test-path $source) {Remove-item $source  -Recurse}
New-Item -ItemType directory -Path $source

$current = Resolve-Path  -Path '.'

Copy-Item ".\logo.png" $source
Copy-Item ".\plugin.*" $source
Add-Type -assembly "system.io.compression.filesystem"
[io.compression.zipfile]::CreateFromDirectory($Source, "$current\$destination") 
