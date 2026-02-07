#!/bin/bash
# fix-ga-tags.sh — Run from your site root (where index.html lives)

echo "=== GA Tag Fix Script ==="
echo "Target ID: G-HJPP52KJF6"
echo ""

OLD_IDS=("G-XB4T59DWP3" "G-W3YKBGCVBX")
NEW_ID="G-HJPP52KJF6"

FILES=$(find . -type f \( -name "*.html" -o -name "*.shtml" \) ! -path "*/backup/*")

TOTAL=0
CHANGED=0

for file in $FILES; do
    TOTAL=$((TOTAL + 1))
    MODIFIED=false

    for OLD_ID in "${OLD_IDS[@]}"; do
        if grep -q "$OLD_ID" "$file"; then
            sed -i "s|$OLD_ID|$NEW_ID|g" "$file"
            MODIFIED=true
        fi
    done

    # Remove duplicate gtag.js loader lines (from pages that had both old IDs)
    GTAG_COUNT=$(grep -c "googletagmanager.com/gtag/js" "$file" 2>/dev/null || echo 0)
    if [ "$GTAG_COUNT" -gt 1 ]; then
        awk '/googletagmanager\.com\/gtag\/js/ && !seen {seen=1; print; next} /googletagmanager\.com\/gtag\/js/ {next} {print}' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        MODIFIED=true
    fi

    # Remove duplicate gtag('config') lines
    CONFIG_COUNT=$(grep -c "gtag.*config.*G-HJPP52KJF6" "$file" 2>/dev/null || echo 0)
    if [ "$CONFIG_COUNT" -gt 1 ]; then
        awk '/gtag.*config.*G-HJPP52KJF6/ && !cfgseen {cfgseen=1; print; next} /gtag.*config.*G-HJPP52KJF6/ {next} {print}' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        MODIFIED=true
    fi

    if [ "$MODIFIED" = true ]; then
        CHANGED=$((CHANGED + 1))
        echo "  ✅ Fixed: $file"
    fi
done

echo ""
echo "=== Summary ==="
echo "Files scanned: $TOTAL"
echo "Files modified: $CHANGED"
echo ""

# Verification
echo "=== Verification ==="
echo "Files still containing old IDs (should be 0):"
REMAINING=$(grep -rl "G-XB4T59DWP3\|G-W3YKBGCVBX" --include="*.html" --include="*.shtml" . 2>/dev/null | grep -v backup/ | wc -l)
echo "  $REMAINING files"

echo ""
echo "Files with correct ID G-HJPP52KJF6:"
CORRECT=$(grep -rl "G-HJPP52KJF6" --include="*.html" --include="*.shtml" . 2>/dev/null | grep -v backup/ | wc -l)
echo "  $CORRECT files"

echo ""
echo "Files with NO GA tag (partials/includes — review manually):"
grep -rL "G-HJPP52KJF6" --include="*.html" --include="*.shtml" . 2>/dev/null | grep -v backup/ | while read f; do
    echo "  ⚠️  $f"
done

echo ""
echo "Done! Verify in GA4 Realtime."
