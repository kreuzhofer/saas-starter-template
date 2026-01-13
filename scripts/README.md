# Scripts

This directory contains utility scripts for the Click Tracking Service project.

## Translation Validation Script

### Overview

The `validate-translations.ts` script validates translation files to ensure consistency and completeness across all supported locales.

### Usage

```bash
npm run validate:translations
```

### What It Validates

1. **JSON Structure**: Ensures all translation files contain valid JSON
2. **Namespace Consistency**: Verifies that all locales have the same namespaces (e.g., common.json, pages.json, errors.json)
3. **Key Completeness**: Checks that all translation keys present in English exist in other locales
4. **Structure Consistency**: Validates that nested objects have the same structure across locales

### Validation Scope

The script validates translations in two locations:

- **Frontend**: `frontend/public/locales/{locale}/*.json`
- **Backend**: `src/locales/{locale}/*.json`

### Supported Locales

- English (`en`) - Reference locale
- German (`de`)

### Exit Codes

- `0`: All validations passed
- `1`: Validation errors found

### Output

The script provides detailed output including:

- ✅ Success messages when all validations pass
- ⚠️  Warnings for non-critical issues (e.g., extra keys in non-English locales)
- ❌ Errors for critical issues (e.g., missing keys, invalid JSON, structure mismatches)

### Example Output

```
🔍 Validating translation files...

📱 Frontend translations:
   Found 6 translation files

⚙️  Backend translations:
   Found 6 translation files

✅ All translation files are valid!
```

### When to Run

- Before committing translation changes
- As part of CI/CD pipeline
- After adding new translation keys
- When adding support for a new language

### Adding New Languages

When adding a new language:

1. Update the `SUPPORTED_LOCALES` array in `validate-translations.ts`
2. Create the locale directories and translation files
3. Run the validation script to ensure completeness

### Common Issues

**Missing Keys**
```
❌ Errors:
   Missing keys in de/common.json:
     - nav.newFeature
     - actions.newAction
```
Solution: Add the missing keys to the German translation file.

**Structure Mismatch**
```
❌ Errors:
   Structure mismatch in de/pages.json at "home.welcome": expected object but got string
```
Solution: Ensure the structure matches the English reference (nested objects vs. strings).

**Extra Keys**
```
⚠️  Warnings:
   Extra keys in de/common.json (not in English):
     - obsolete.oldKey
```
Solution: Remove obsolete keys or add them to the English reference if they should be kept.

### Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
- name: Validate translations
  run: npm run validate:translations
```

This ensures translation consistency is maintained across all pull requests and deployments.
