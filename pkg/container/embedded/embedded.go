package embedded

import (
	_ "embed"
)

//go:embed pypiPullerInstaller.py
var PyPiPullerInstaller_py string

//go:embed npmPullerInstaller.js
var NpmPullerInstaller_js string

//go:embed gemPullerInstaller.rb
var GemPullerInstaller_rb string

//go:embed syscalls.json
var Syscalls_json string
