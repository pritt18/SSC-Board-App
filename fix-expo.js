const fs = require('fs');
const path = require('path');

// Find the correct file
const filePath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'src', 'start', 'server', 'metro', 'externals.ts');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace all instances of node:sea with node_sea
    content = content.replace(/node:sea/g, 'node_sea');
    fs.writeFileSync(filePath, content);
    console.log('✅ Successfully patched externals.ts');
    console.log('File location:', filePath);
} else {
    console.log('⚠️ File not found at:', filePath);
    // Try the compiled version
    const altPath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'start', 'server', 'metro', 'externals.js');
    if (fs.existsSync(altPath)) {
        let content = fs.readFileSync(altPath, 'utf8');
        content = content.replace(/node:sea/g, 'node_sea');
        fs.writeFileSync(altPath, content);
        console.log('✅ Patched externals.js instead');
    } else {
        console.log('⚠️ Could not find either file');
    }
}
