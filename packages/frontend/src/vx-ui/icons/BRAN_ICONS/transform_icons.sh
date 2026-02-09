#!/bin/bash

# This script transforms all icon JSX files to replace the outer <svg> wrapper with React fragments

# Find all .jsx files in the BRAN_ICONS directory
find "$(dirname "$0")" -name "*.jsx" -type f | while read -r file; do
    echo "Processing: $file"
    
    # Use sed to:
    # 1. Replace the opening <svg> tag with all its attributes with <>
    # 2. Replace the closing </svg> with </>
    
    # macOS sed requires different syntax
    sed -i '' \
        -e 's/<svg[^>]*>/\<\>/g' \
        -e 's/<\/svg>/<\/>/g' \
        "$file"
done

echo "Done! All icon files have been transformed."

# Self-destruct: remove this script after running
rm -- "$0"
