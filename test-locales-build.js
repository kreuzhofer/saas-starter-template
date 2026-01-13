#!/usr/bin/env node
/**
 * Test script to verify that translation files are correctly copied to dist folder
 * and can be loaded by the i18n system
 */

const fs = require('fs');
const path = require('path');

console.log('Testing translation files in dist folder...\n');

const distLocalesPath = path.join(__dirname, 'dist', 'locales');
const languages = ['en', 'de'];
const namespaces = ['errors', 'validation', 'emails'];

let allTestsPassed = true;

// Test 1: Check if dist/locales directory exists
console.log('Test 1: Checking if dist/locales directory exists...');
if (fs.existsSync(distLocalesPath)) {
  console.log('✓ dist/locales directory exists\n');
} else {
  console.log('✗ dist/locales directory does not exist\n');
  allTestsPassed = false;
}

// Test 2: Check if all language directories exist
console.log('Test 2: Checking language directories...');
for (const lang of languages) {
  const langPath = path.join(distLocalesPath, lang);
  if (fs.existsSync(langPath)) {
    console.log(`✓ dist/locales/${lang} exists`);
  } else {
    console.log(`✗ dist/locales/${lang} does not exist`);
    allTestsPassed = false;
  }
}
console.log('');

// Test 3: Check if all translation files exist
console.log('Test 3: Checking translation files...');
for (const lang of languages) {
  for (const ns of namespaces) {
    const filePath = path.join(distLocalesPath, lang, `${ns}.json`);
    if (fs.existsSync(filePath)) {
      console.log(`✓ dist/locales/${lang}/${ns}.json exists`);
    } else {
      console.log(`✗ dist/locales/${lang}/${ns}.json does not exist`);
      allTestsPassed = false;
    }
  }
}
console.log('');

// Test 4: Verify files are valid JSON
console.log('Test 4: Verifying JSON validity...');
for (const lang of languages) {
  for (const ns of namespaces) {
    const filePath = path.join(distLocalesPath, lang, `${ns}.json`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      console.log(`✓ dist/locales/${lang}/${ns}.json is valid JSON`);
    } catch (error) {
      console.log(`✗ dist/locales/${lang}/${ns}.json is invalid JSON: ${error.message}`);
      allTestsPassed = false;
    }
  }
}
console.log('');

// Test 5: Compare source and dist files
console.log('Test 5: Comparing source and dist files...');
for (const lang of languages) {
  for (const ns of namespaces) {
    const srcPath = path.join(__dirname, 'src', 'locales', lang, `${ns}.json`);
    const distPath = path.join(distLocalesPath, lang, `${ns}.json`);
    
    try {
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const distContent = fs.readFileSync(distPath, 'utf8');
      
      if (srcContent === distContent) {
        console.log(`✓ src/locales/${lang}/${ns}.json matches dist/locales/${lang}/${ns}.json`);
      } else {
        console.log(`✗ src/locales/${lang}/${ns}.json does not match dist/locales/${lang}/${ns}.json`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`✗ Error comparing files: ${error.message}`);
      allTestsPassed = false;
    }
  }
}
console.log('');

// Summary
console.log('='.repeat(60));
if (allTestsPassed) {
  console.log('✓ All tests passed! Translation files are correctly built.');
  process.exit(0);
} else {
  console.log('✗ Some tests failed. Please check the build process.');
  process.exit(1);
}
