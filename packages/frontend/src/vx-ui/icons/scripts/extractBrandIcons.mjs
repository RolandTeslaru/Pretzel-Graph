import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPRECATED_ICONS_DIR = path.join(__dirname, '..', 'DEPRECATED_ICONS');
const OUTPUT_FILE = path.join(__dirname, '..', 'brand.tsx');

// Get all JSX files
function getJsxFiles(dir) {
    const files = [];

    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.jsx')) {
                files.push(fullPath);
            }
        }
    }

    walk(dir);
    return files;
}

// Clean up the component name - use folder name
function getComponentName(filePath) {
    const folderName = path.basename(path.dirname(filePath));

    // Clean up the folder name to be a valid component name
    let name = folderName
        .replace(/\s+/g, '') // Remove spaces
        .replace(/-/g, '') // Remove dashes
        .replace(/_/g, '') // Remove underscores
        .replace(/^[a-z]/, c => c.toUpperCase()); // Capitalize first letter

    // Special case mappings for better naming
    const specialCases = {
        'AIML': 'AIML',
        'OpenAicopy': 'OpenAICopy',
        'TwitterX': 'TwitterX',
        'thumbs': null, // Skip - not a brand
        'BotMessageSquare': null, // Skip - system icon
        'GridHorizontal': null, // Skip - system icon  
        'Share': null, // Skip - system icon
        'Share2': null, // Skip - system icon
        'freezeAll': null, // Skip - not a brand
        'globeok': null, // Skip - system icon
        'SearchHybrid': null, // Skip - system icon
        'SearchVector': null, // Skip - system icon
        'SearchLexical': null, // Skip - system icon
        'vectorstores': null, // Skip - not a specific brand
        'BWpython': 'PythonBW',
        'onedrive': 'OneDriveLegacy',
        'xAI': 'XAI',
        'hackerNews': 'YCombinator',
    };

    if (specialCases[name] === null) {
        return null; // Skip this icon
    }

    if (specialCases[name]) {
        return specialCases[name];
    }

    return name;
}

// Extract SVG content from JSX file
function extractSvgContent(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find the SVG opening tag and extract viewBox
    const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

    // Find all content between <svg ...> and </svg>
    const svgContentMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (!svgContentMatch) {
        return null;
    }

    let innerContent = svgContentMatch[1].trim();

    // Remove props spreading and other JSX artifacts
    innerContent = innerContent
        .replace(/\{\.\.\.props\}/g, '')
        .replace(/\{props\}/g, '')
        .replace(/ref=\{ref\}/g, '')
        .replace(/className="[^"]*"/g, '')
        .replace(/className=\{[^}]*\}/g, '');

    // Check if it has isDark prop (conditional rendering)
    const hasConditional = content.includes('isDark') || content.includes('props.isDark') ||
        content.includes('props.type') || content.includes('? (');

    // Check if it's too complex (has too many defs, filters, etc.)
    const defCount = (innerContent.match(/<defs>/g) || []).length;
    const filterCount = (innerContent.match(/<filter/g) || []).length;

    return {
        viewBox,
        innerContent,
        hasConditional,
        isComplex: defCount > 2 || filterCount > 5,
        originalContent: content
    };
}

// Generate the component code
function generateComponent(name, svgData) {
    if (!svgData || !svgData.innerContent) {
        return null;
    }

    // Skip components with conditional rendering (too complex)
    if (svgData.hasConditional) {
        console.log(`Skipping ${name} - has conditional rendering`);
        return null;
    }

    const viewBoxProp = svgData.viewBox ? ` viewBox="${svgData.viewBox}"` : '';
    const content = svgData.innerContent;

    return `export const ${name}: React.FC<BaseIconProps> = (props) => (
    <BaseIcon${viewBoxProp} fill="currentColor" stroke="none" {...props}>
        ${content}
    </BaseIcon>
)
${name}.displayName = "${name}"`;
}

// Main execution
const jsxFiles = getJsxFiles(DEPRECATED_ICONS_DIR);
console.log(`Found ${jsxFiles.length} JSX files`);

const components = [];
const processedNames = new Set();

for (const file of jsxFiles) {
    const name = getComponentName(file);

    // Skip if name is null (filtered out)
    if (!name) {
        continue;
    }

    // Skip duplicates
    if (processedNames.has(name)) {
        console.log(`Skipping duplicate: ${name}`);
        continue;
    }

    const svgData = extractSvgContent(file);
    const component = generateComponent(name, svgData);

    if (component) {
        components.push(component);
        processedNames.add(name);
        console.log(`Processed: ${name}`);
    }
}

// Sort components alphabetically
components.sort((a, b) => {
    const nameA = a.match(/export const (\w+)/)[1];
    const nameB = b.match(/export const (\w+)/)[1];
    return nameA.localeCompare(nameB);
});

// Generate output file
const output = `import React from "react"
import { BaseIcon, type BaseIconProps } from "./baseIcon"

${components.join('\n\n')}
`;

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`\nGenerated ${OUTPUT_FILE} with ${components.length} components`);
