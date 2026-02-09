#!/usr/bin/env node
import fs from "node:fs/promises"
import path from "node:path"
import ts from "typescript"

const ICONS_ROOT = path.resolve(process.cwd(), "packages/frontend/src/vx-ui/icons")
const DEPRECATED_ROOT = path.join(ICONS_ROOT, "DEPRECATED_ICONS")
const BRAND_FILE = path.join(ICONS_ROOT, "brand.tsx")

const COMPONENT_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"]
const OMIT_ATTRS = new Set(["xmlns", "width", "height", "style", "className"])

const iconDefinitions = []
const specialDefinitions = []
const assetImports = new Map()

const aliasCache = new Map()

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const resolveComponentPath = async (dirPath, relativeModule) => {
    const normalized = relativeModule.replace(/^\.\//, "")
    for (const ext of COMPONENT_EXTENSIONS) {
        const candidate = path.join(dirPath, `${normalized}${ext}`)
        if (await fileExists(candidate)) {
            return candidate
        }
    }
    return null
}

const sanitizeAttributeBlock = (attrBlock) => {
    return attrBlock.replace(/\{\.\.\.[^}]+\}/g, "").trim()
}

const parseAttributes = (attrBlock) => {
    const attributes = []
    const cleaned = sanitizeAttributeBlock(attrBlock)
    const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:]*)\s*=\s*("[^"]*"|'[^']*'|\{[^}]*\})/g
    let match
    while ((match = attrRegex.exec(cleaned)) !== null) {
        const [, name, rawValue] = match
        if (OMIT_ATTRS.has(name)) {
            continue
        }
        if (rawValue.startsWith("{") && rawValue.endsWith("}")) {
            attributes.push({ name, value: rawValue.slice(1, -1).trim(), isExpression: true })
        } else {
            const trimmed = rawValue.startsWith("\"") || rawValue.startsWith("'") ? rawValue.slice(1, -1) : rawValue
            attributes.push({ name, value: trimmed, isExpression: false })
        }
    }
    return attributes
}

const dedentLines = (text) => {
    const lines = text.split("\n")
    const nonEmpty = lines.filter((line) => line.trim().length > 0)
    const minIndent = nonEmpty.reduce((acc, line) => {
        const leading = line.match(/^\s*/)?.[0].length ?? 0
        return acc === null ? leading : Math.min(acc, leading)
    }, null)
    return lines
        .map((line) => (minIndent ? line.slice(Math.min(minIndent, line.length)) : line))
        .join("\n")
        .trim()
}

const extractSvg = async (componentPath) => {
    const cacheKey = componentPath
    if (aliasCache.has(cacheKey)) {
        return aliasCache.get(cacheKey)
    }
    const fileContent = await fs.readFile(componentPath, "utf8")
    const svgMatch = fileContent.match(/<svg[\s\S]*?<\/svg>/)
    if (!svgMatch) {
        throw new Error(`Unable to locate <svg> in ${componentPath}`)
    }
    const svgContent = svgMatch[0]
    const openTagMatch = svgContent.match(/<svg([\s\S]*?)>/)
    if (!openTagMatch) {
        throw new Error(`Malformed <svg> tag in ${componentPath}`)
    }
    const attrBlock = openTagMatch[1]
    const attributes = parseAttributes(attrBlock)
    const closingTag = "</svg>"
    const inner = svgContent.slice(openTagMatch[0].length, svgContent.length - closingTag.length)
    const formattedInner = dedentLines(inner)
    const definition = {
        attributes,
        inner: formattedInner,
    }
    aliasCache.set(cacheKey, definition)
    return definition
}

const analyzeIndexFile = async (indexPath) => {
    const dirPath = path.dirname(indexPath)
    const sourceText = await fs.readFile(indexPath, "utf8")
    const sourceFile = ts.createSourceFile(indexPath, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)

    const importAliasMap = new Map()
    const assetAliasMap = new Map()

    sourceFile.forEachChild((node) => {
        if (!ts.isImportDeclaration(node) || !node.importClause) return
        if (!ts.isStringLiteral(node.moduleSpecifier)) return
        const modulePath = node.moduleSpecifier.text
        if (!modulePath.startsWith("./")) return
        if (node.importClause?.name) {
            const alias = node.importClause.name.text
            if (/\.(png|jpg|jpeg|gif|webp)$/i.test(modulePath)) {
                assetAliasMap.set(alias, modulePath)
            } else {
                importAliasMap.set(alias, modulePath)
            }
        } else if (
            node.importClause.namedBindings &&
            ts.isNamespaceImport(node.importClause.namedBindings)
        ) {
            const alias = node.importClause.namedBindings.name.text
            importAliasMap.set(alias, modulePath)
        }
    })

    const exports = []

    sourceFile.forEachChild((node) => {
        if (!ts.isVariableStatement(node)) return
        if (!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return
        node.declarationList.declarations.forEach((decl) => {
            if (!ts.isIdentifier(decl.name)) return
            const exportName = decl.name.text
            const textSlice = sourceText.slice(decl.pos, decl.end)
            let matchedAlias
            for (const alias of importAliasMap.keys()) {
                if (new RegExp(`<${alias}[^A-Za-z0-9_]`).test(textSlice) || new RegExp(`${alias}[^A-Za-z0-9_]`).test(textSlice)) {
                    matchedAlias = alias
                    break
                }
            }
            let matchedAsset
            for (const alias of assetAliasMap.keys()) {
                if (textSlice.includes(alias)) {
                    matchedAsset = alias
                    break
                }
            }
            exports.push({ name: exportName, alias: matchedAlias, assetAlias: matchedAsset, text: textSlice })
        })
    })

    return { dirPath, imports: importAliasMap, assets: assetAliasMap, exports }
}

const buildBaseIconProps = (attributes) => {
    const props = []
    const hasViewBox = attributes.some((attr) => attr.name === "viewBox")
    if (!hasViewBox) {
        props.push('viewBox="0 0 24 24"')
    }
    attributes.forEach((attr) => {
        if (attr.isExpression) {
            props.push(`${attr.name}={${attr.value}}`)
        } else {
            props.push(`${attr.name}="${attr.value}"`)
        }
    })
    return props.join(" ")
}

const indentInnerContent = (inner) => {
    if (!inner) {
        return ""
    }
    const lines = inner.split("\n")
    return lines
        .map((line) => (line.length ? `        ${line}` : ""))
        .join("\n")
}

const addIconDefinition = (definition) => {
    iconDefinitions.push(definition)
}

const addSpecialDefinition = (definition) => {
    specialDefinitions.push(definition)
}

const relativeImportPath = (from, to) => {
    let rel = path.relative(path.dirname(from), to)
    if (!rel.startsWith(".")) {
        rel = `./${rel}`
    }
    return rel.replace(/\\/g, "/")
}

const generateBrandFile = async () => {
    const sortedIcons = [...iconDefinitions].sort((a, b) => a.name.localeCompare(b.name))

    const headerLines = ['import React from "react"', 'import { BaseIcon, type BaseIconProps } from "./baseIcon"']

    assetImports.forEach((importPath, alias) => {
        headerLines.push(`import ${alias} from "${importPath}"`)
    })

    const bodyFragments = sortedIcons.map((icon) => {
        const propsString = buildBaseIconProps(icon.attributes)
        const inner = indentInnerContent(icon.inner)
        const baseIconLine = propsString.length ? `<BaseIcon ${propsString} {...props}>` : '<BaseIcon {...props}>'
        const children = inner ? `\n${inner}\n    </BaseIcon>` : '\n    </BaseIcon>'
        return `export const ${icon.name}: React.FC<BaseIconProps> = (props) => (\n    ${baseIconLine}${children}\n)\n${icon.name}.displayName = "${icon.name}"`
    })

    const fileContent = `${headerLines.join("\n")}\n\n${bodyFragments.join("\n\n")}\n`
    await fs.writeFile(BRAND_FILE, `${fileContent}`)
}

const collectIcons = async () => {
    const entries = await fs.readdir(DEPRECATED_ROOT, { withFileTypes: true })
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const indexPath = path.join(DEPRECATED_ROOT, entry.name, "index.tsx")
        if (!(await fileExists(indexPath))) {
            continue
        }
        const analysis = await analyzeIndexFile(indexPath)
        for (const exp of analysis.exports) {
            if (exp.alias && analysis.imports.has(exp.alias)) {
                const moduleRelPath = analysis.imports.get(exp.alias)
                const componentPath = await resolveComponentPath(analysis.dirPath, moduleRelPath)
                if (!componentPath) {
                    addSpecialDefinition(`Unable to resolve component for ${exp.name} in ${indexPath}`)
                    continue
                }
                try {
                    const svgDef = await extractSvg(componentPath)
                    addIconDefinition({ name: exp.name, ...svgDef })
                } catch (error) {
                    addSpecialDefinition(error.message)
                }
            } else if (exp.assetAlias && analysis.assets.has(exp.assetAlias)) {
                const assetRelPath = analysis.assets.get(exp.assetAlias)
                const absoluteAssetPath = path.join(analysis.dirPath, assetRelPath)
                const brandRelativeImport = relativeImportPath(BRAND_FILE, absoluteAssetPath)
                const assetAlias = `${exp.name}Asset`
                assetImports.set(assetAlias, brandRelativeImport)
                addIconDefinition({
                    name: exp.name,
                    attributes: [{ name: "viewBox", value: "0 0 24 24", isExpression: false }],
                    inner: `<image href={${assetAlias}} width="24" height="24" preserveAspectRatio="xMidYMid meet" />`,
                })
            } else {
                addSpecialDefinition(`Manual conversion required for ${exp.name} in ${indexPath}`)
            }
        }
    }
}

const run = async () => {
    await collectIcons()
    await generateBrandFile()
    if (specialDefinitions.length) {
        console.warn("Manual conversion needed for:")
        specialDefinitions.forEach((msg) => console.warn(` - ${msg}`))
    }
}

run().catch((error) => {
    console.error(error)
    process.exit(1)
})
