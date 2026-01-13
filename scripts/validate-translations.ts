#!/usr/bin/env tsx

/**
 * Translation Validation Script
 * 
 * This script validates translation files to ensure:
 * 1. All translation files have valid JSON structure
 * 2. English and German translations have matching keys
 * 3. Structure is consistent across locales
 * 4. No orphaned keys exist
 * 
 * Usage: npm run validate:translations
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface TranslationFile {
  path: string;
  locale: string;
  namespace: string;
  content: Record<string, any>;
}

const SUPPORTED_LOCALES = ['en', 'de'];
const FRONTEND_LOCALES_DIR = path.join(process.cwd(), 'frontend', 'public', 'locales');
const BACKEND_LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

/**
 * Load a JSON file and parse it
 */
function loadJsonFile(filePath: string): Record<string, any> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Get all keys from a nested object with dot notation
 */
function getAllKeys(obj: Record<string, any>, prefix: string = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

/**
 * Load all translation files for a given directory
 */
function loadTranslationFiles(baseDir: string, type: 'frontend' | 'backend'): TranslationFile[] {
  const files: TranslationFile[] = [];
  
  if (!fs.existsSync(baseDir)) {
    console.error(`Directory not found: ${baseDir}`);
    return files;
  }
  
  for (const locale of SUPPORTED_LOCALES) {
    const localeDir = path.join(baseDir, locale);
    
    if (!fs.existsSync(localeDir)) {
      console.error(`Locale directory not found: ${localeDir}`);
      continue;
    }
    
    const jsonFiles = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const filePath = path.join(localeDir, file);
      const content = loadJsonFile(filePath);
      
      if (content) {
        files.push({
          path: filePath,
          locale,
          namespace: file.replace('.json', ''),
          content
        });
      }
    }
  }
  
  return files;
}

/**
 * Validate JSON structure of translation files
 */
function validateJsonStructure(files: TranslationFile[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf-8');
    
    try {
      JSON.parse(content);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid JSON in ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return result;
}

/**
 * Validate that all locales have the same namespaces
 */
function validateNamespaces(files: TranslationFile[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  const namespacesByLocale: Record<string, Set<string>> = {};
  
  for (const file of files) {
    if (!namespacesByLocale[file.locale]) {
      namespacesByLocale[file.locale] = new Set();
    }
    namespacesByLocale[file.locale].add(file.namespace);
  }
  
  const locales = Object.keys(namespacesByLocale);
  if (locales.length < 2) {
    return result;
  }
  
  const referenceLocale = locales[0];
  const referenceNamespaces = namespacesByLocale[referenceLocale];
  
  for (let i = 1; i < locales.length; i++) {
    const locale = locales[i];
    const namespaces = namespacesByLocale[locale];
    
    // Check for missing namespaces
    for (const ns of referenceNamespaces) {
      if (!namespaces.has(ns)) {
        result.valid = false;
        result.errors.push(`Missing namespace "${ns}" in locale "${locale}"`);
      }
    }
    
    // Check for extra namespaces
    for (const ns of namespaces) {
      if (!referenceNamespaces.has(ns)) {
        result.warnings.push(`Extra namespace "${ns}" in locale "${locale}" (not in ${referenceLocale})`);
      }
    }
  }
  
  return result;
}

/**
 * Validate that translation keys match across locales
 */
function validateKeys(files: TranslationFile[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  // Group files by namespace
  const filesByNamespace: Record<string, TranslationFile[]> = {};
  
  for (const file of files) {
    if (!filesByNamespace[file.namespace]) {
      filesByNamespace[file.namespace] = [];
    }
    filesByNamespace[file.namespace].push(file);
  }
  
  // Validate keys for each namespace
  for (const namespace in filesByNamespace) {
    const namespaceFiles = filesByNamespace[namespace];
    
    if (namespaceFiles.length < 2) {
      continue;
    }
    
    // Use English as reference
    const referenceFile = namespaceFiles.find(f => f.locale === 'en');
    if (!referenceFile) {
      result.warnings.push(`No English reference file found for namespace "${namespace}"`);
      continue;
    }
    
    const referenceKeys = getAllKeys(referenceFile.content);
    
    // Compare with other locales
    for (const file of namespaceFiles) {
      if (file.locale === 'en') {
        continue;
      }
      
      const fileKeys = getAllKeys(file.content);
      
      // Check for missing keys
      const missingKeys = referenceKeys.filter(key => !fileKeys.includes(key));
      if (missingKeys.length > 0) {
        result.valid = false;
        result.errors.push(
          `Missing keys in ${file.locale}/${namespace}.json:\n  - ${missingKeys.join('\n  - ')}`
        );
      }
      
      // Check for extra keys
      const extraKeys = fileKeys.filter(key => !referenceKeys.includes(key));
      if (extraKeys.length > 0) {
        result.warnings.push(
          `Extra keys in ${file.locale}/${namespace}.json (not in English):\n  - ${extraKeys.join('\n  - ')}`
        );
      }
    }
  }
  
  return result;
}

/**
 * Validate structure consistency (nested objects should have same structure)
 */
function validateStructure(files: TranslationFile[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  // Group files by namespace
  const filesByNamespace: Record<string, TranslationFile[]> = {};
  
  for (const file of files) {
    if (!filesByNamespace[file.namespace]) {
      filesByNamespace[file.namespace] = [];
    }
    filesByNamespace[file.namespace].push(file);
  }
  
  // Validate structure for each namespace
  for (const namespace in filesByNamespace) {
    const namespaceFiles = filesByNamespace[namespace];
    
    if (namespaceFiles.length < 2) {
      continue;
    }
    
    const referenceFile = namespaceFiles.find(f => f.locale === 'en');
    if (!referenceFile) {
      continue;
    }
    
    // Check if keys have consistent types (object vs string)
    for (const file of namespaceFiles) {
      if (file.locale === 'en') {
        continue;
      }
      
      const checkStructure = (refObj: any, fileObj: any, path: string = '') => {
        for (const key in refObj) {
          const fullPath = path ? `${path}.${key}` : key;
          
          if (!(key in fileObj)) {
            // Already caught by validateKeys
            continue;
          }
          
          const refType = typeof refObj[key];
          const fileType = typeof fileObj[key];
          
          if (refType === 'object' && refObj[key] !== null && !Array.isArray(refObj[key])) {
            if (fileType !== 'object' || fileObj[key] === null || Array.isArray(fileObj[key])) {
              result.valid = false;
              result.errors.push(
                `Structure mismatch in ${file.locale}/${namespace}.json at "${fullPath}": ` +
                `expected object but got ${fileType}`
              );
            } else {
              checkStructure(refObj[key], fileObj[key], fullPath);
            }
          } else {
            if (fileType === 'object' && fileObj[key] !== null && !Array.isArray(fileObj[key])) {
              result.valid = false;
              result.errors.push(
                `Structure mismatch in ${file.locale}/${namespace}.json at "${fullPath}": ` +
                `expected ${refType} but got object`
              );
            }
          }
        }
      };
      
      checkStructure(referenceFile.content, file.content);
    }
  }
  
  return result;
}

/**
 * Main validation function
 */
function validateTranslations(): boolean {
  console.log('🔍 Validating translation files...\n');
  
  let allValid = true;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  // Validate frontend translations
  console.log('📱 Frontend translations:');
  const frontendFiles = loadTranslationFiles(FRONTEND_LOCALES_DIR, 'frontend');
  
  if (frontendFiles.length === 0) {
    console.error('❌ No frontend translation files found');
    allValid = false;
  } else {
    console.log(`   Found ${frontendFiles.length} translation files`);
    
    const jsonResult = validateJsonStructure(frontendFiles);
    const namespaceResult = validateNamespaces(frontendFiles);
    const keysResult = validateKeys(frontendFiles);
    const structureResult = validateStructure(frontendFiles);
    
    allErrors.push(...jsonResult.errors, ...namespaceResult.errors, ...keysResult.errors, ...structureResult.errors);
    allWarnings.push(...jsonResult.warnings, ...namespaceResult.warnings, ...keysResult.warnings, ...structureResult.warnings);
    
    if (!jsonResult.valid || !namespaceResult.valid || !keysResult.valid || !structureResult.valid) {
      allValid = false;
    }
  }
  
  console.log('');
  
  // Validate backend translations
  console.log('⚙️  Backend translations:');
  const backendFiles = loadTranslationFiles(BACKEND_LOCALES_DIR, 'backend');
  
  if (backendFiles.length === 0) {
    console.error('❌ No backend translation files found');
    allValid = false;
  } else {
    console.log(`   Found ${backendFiles.length} translation files`);
    
    const jsonResult = validateJsonStructure(backendFiles);
    const namespaceResult = validateNamespaces(backendFiles);
    const keysResult = validateKeys(backendFiles);
    const structureResult = validateStructure(backendFiles);
    
    allErrors.push(...jsonResult.errors, ...namespaceResult.errors, ...keysResult.errors, ...structureResult.errors);
    allWarnings.push(...jsonResult.warnings, ...namespaceResult.warnings, ...keysResult.warnings, ...structureResult.warnings);
    
    if (!jsonResult.valid || !namespaceResult.valid || !keysResult.valid || !structureResult.valid) {
      allValid = false;
    }
  }
  
  console.log('');
  
  // Print results
  if (allWarnings.length > 0) {
    console.log('⚠️  Warnings:');
    allWarnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }
  
  if (allErrors.length > 0) {
    console.log('❌ Errors:');
    allErrors.forEach(error => console.log(`   ${error}`));
    console.log('');
  }
  
  if (allValid && allErrors.length === 0) {
    console.log('✅ All translation files are valid!');
    if (allWarnings.length > 0) {
      console.log(`   (${allWarnings.length} warning${allWarnings.length === 1 ? '' : 's'} found)`);
    }
  } else {
    console.log(`❌ Validation failed with ${allErrors.length} error${allErrors.length === 1 ? '' : 's'}`);
  }
  
  return allValid && allErrors.length === 0;
}

// Run validation
const isValid = validateTranslations();
process.exit(isValid ? 0 : 1);
