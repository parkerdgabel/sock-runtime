#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getDeps(pkgDir) {
    const packageJsonPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return [];
    }
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return Object.keys(packageJson.dependencies || {});
    } catch (e) {
        return [];
    }
}

function getTopLevel(pkgDir) {
    // List all directories and files in node_modules that are packages
    const nodeModulesPath = path.join(pkgDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        return [];
    }
    try {
        return fs.readdirSync(nodeModulesPath)
            .filter(name => !name.startsWith('.') && !name.startsWith('@'))
            .concat(
                // Handle scoped packages (@org/package)
                fs.readdirSync(nodeModulesPath)
                    .filter(name => name.startsWith('@'))
                    .flatMap(scope => {
                        const scopePath = path.join(nodeModulesPath, scope);
                        return fs.readdirSync(scopePath).map(pkg => `${scope}/${pkg}`);
                    })
            );
    } catch (e) {
        return [];
    }
}

function f(event) {
    const pkg = event.Pkg;
    const alreadyInstalled = event.AlreadyInstalled;

    if (!alreadyInstalled) {
        try {
            execSync(`npm install --prefix /host/files --no-save ${pkg}`, {
                stdio: 'inherit',
                env: { ...process.env, npm_config_cache: '/tmp/.npm-cache' }
            });
        } catch (e) {
            console.error(`npm install failed: ${e.message}`);
        }
    }

    const deps = getDeps('/host/files');
    const topLevel = getTopLevel('/host/files');

    return { Deps: deps, TopLevel: topLevel };
}

// Read request from stdin and process
let input = '';
process.stdin.on('data', (chunk) => {
    input += chunk;
});

process.stdin.on('end', () => {
    try {
        const event = JSON.parse(input);
        const result = f(event);
        console.log(JSON.stringify(result));
    } catch (e) {
        console.error('Error processing request:', e.message);
        process.exit(1);
    }
});
