# Context-Based Translations

This document explains how to use context-based translations in the application.

## What are Context-Based Translations?

Context-based translations allow you to provide different translation variants for the same key based on context. This is useful for:

- Gender-specific text (e.g., "Welcome, Sir" vs "Welcome, Madam")
- Formality levels (e.g., formal vs informal greetings)
- Role-based text (e.g., different text for admins vs regular users)
- Any other contextual variations

## How It Works

i18next uses a context separator (default: `_`) to identify contextual variants in translation files.

### Translation File Structure

In your translation JSON files, add contextual variants using the pattern `key_context`:

```json
{
  "welcome": "Welcome",
  "welcome_male": "Welcome, Sir",
  "welcome_female": "Welcome, Madam",
  
  "greeting": "Hello",
  "greeting_formal": "Good day",
  "greeting_informal": "Hi there"
}
```

### Using Context in Components

Use the `context` option when calling the translation function:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  // Default translation
  const defaultWelcome = t('contextual.welcome');
  // Output: "Welcome"
  
  // Context-specific translation
  const maleWelcome = t('contextual.welcome', { context: 'male' });
  // Output: "Welcome, Sir"
  
  const femaleWelcome = t('contextual.welcome', { context: 'female' });
  // Output: "Welcome, Madam"
  
  return (
    <div>
      <p>{defaultWelcome}</p>
      <p>{maleWelcome}</p>
      <p>{femaleWelcome}</p>
    </div>
  );
}
```

## Examples in the Codebase

### Gender-Specific Greetings

```typescript
// English (en/common.json)
{
  "contextual": {
    "welcome": "Welcome",
    "welcome_male": "Welcome, Sir",
    "welcome_female": "Welcome, Madam"
  }
}

// German (de/common.json)
{
  "contextual": {
    "welcome": "Willkommen",
    "welcome_male": "Willkommen, Herr",
    "welcome_female": "Willkommen, Frau"
  }
}

// Usage
const greeting = t('contextual.welcome', { context: userGender });
```

### Formality Levels

```typescript
// English (en/common.json)
{
  "contextual": {
    "greeting": "Hello",
    "greeting_formal": "Good day",
    "greeting_informal": "Hi there"
  }
}

// Usage
const greeting = t('contextual.greeting', { context: formalityLevel });
```

### Role-Based Text

```typescript
// English (en/common.json)
{
  "contextual": {
    "userRole": "User",
    "userRole_admin": "Administrator",
    "userRole_moderator": "Moderator",
    "userRole_guest": "Guest"
  }
}

// Usage
const roleLabel = t('contextual.userRole', { context: user.role });
```

## Fallback Behavior

If a context variant doesn't exist, i18next automatically falls back to the default (non-contextual) translation:

```typescript
// If 'welcome_unknown' doesn't exist
const greeting = t('contextual.welcome', { context: 'unknown' });
// Falls back to: "Welcome"
```

## Best Practices

1. **Always provide a default**: Always include the base key without context as a fallback
2. **Consistent naming**: Use consistent context names across all translation files
3. **Document contexts**: Document what contexts are available for each key
4. **Language-appropriate**: Ensure contextual variants make sense in each language
5. **Test thoroughly**: Use property-based tests to verify context behavior

## Configuration

Context support is enabled in the i18n configuration:

```typescript
i18n.init({
  // ... other options
  contextSeparator: '_', // Default separator for context variants
});
```

## Testing

Context-based translations are tested using property-based tests. See:
- `frontend/src/i18n/contextBasedTranslation.property.test.ts`

The tests verify:
- Correct variant selection based on context
- Fallback to default when context doesn't exist
- Consistency across all supported languages
