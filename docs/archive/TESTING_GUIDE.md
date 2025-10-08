# Testing Guide - KimbleAI v4

Quick reference guide for running and writing tests.

## Quick Start

```bash
# Run all tests
npm test

# Run with watch mode (auto-rerun on file changes)
npm run test:watch

# Run with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Categories

### Run Specific Test Suites

```bash
# Unit tests only (lib/ folder)
npm run test:unit

# API tests only
npm run test:api

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# Performance tests
npm run test:performance
```

### Run Individual Files

```bash
# Run a specific test file
npx vitest run tests/api/files-upload.test.ts

# Run tests matching a pattern
npx vitest run -t "should upload"

# Run tests in a directory
npx vitest run tests/lib
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', async () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = await doSomething(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Testing API Routes

```typescript
import { POST } from '@/app/api/endpoint/route';
import { createMockNextRequest } from '../helpers/test-utils';

it('should process request successfully', async () => {
  const request = createMockNextRequest({
    method: 'POST',
    body: { data: 'test' }
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

### Testing File Uploads

```typescript
import { createMockFile, createMockFormData } from '../helpers/test-utils';

it('should handle file upload', async () => {
  const file = createMockFile('content', 'test.txt', 'text/plain');
  const formData = new FormData();
  formData.append('file', file);

  const request = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  });

  const response = await POST(request as any);
  expect(response.status).toBe(200);
});
```

### Mocking Dependencies

```typescript
// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'AI response' } }]
        })
      }
    };
  }
}));

// Mock external API
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
});
```

## Test Utilities

### Available Helper Functions

```typescript
import {
  createMockNextRequest,
  createMockFile,
  createMockFormData,
  assertResponse,
  mockOpenAIResponse,
  mockOpenAIEmbeddings,
  mockAssemblyAIResponse,
  waitFor
} from './helpers/test-utils';

// Create mock API request
const request = createMockNextRequest({
  method: 'POST',
  url: 'http://localhost:3000/api/test',
  body: { key: 'value' },
  headers: { 'Authorization': 'Bearer token' }
});

// Create mock file
const file = createMockFile('content', 'file.txt', 'text/plain');

// Create FormData
const formData = createMockFormData(file, {
  userId: 'zach',
  projectId: 'project-1'
});

// Assert response
const data = await assertResponse(response, 200);

// Wait for async operation
await waitFor(1000);
```

### Mock Factories

```typescript
// Supabase Mock
import { MockSupabaseClient } from './mocks/supabase.mock';
const supabase = new MockSupabaseClient();
supabase.setMockData('users', [{ id: '1', name: 'Test' }]);

// OpenAI Mock
import { setupOpenAIMock } from './mocks/openai.mock';
const cleanup = setupOpenAIMock();
// ... tests
cleanup();

// AssemblyAI Mock
import { setupAssemblyAIMock } from './mocks/assemblyai.mock';
const cleanup = setupAssemblyAIMock('Transcription text');
// ... tests
cleanup();
```

## Best Practices

### 1. Test Naming
```typescript
// ✅ Good - descriptive, specific
it('should return 400 when userId is missing', async () => { });

// ❌ Bad - vague, unclear
it('should work', async () => { });
```

### 2. Test Independence
```typescript
// ✅ Good - each test is independent
beforeEach(() => {
  vi.clearAllMocks();
  // Reset state
});

// ❌ Bad - tests depend on each other
let sharedState;
it('test 1', () => { sharedState = 'value'; });
it('test 2', () => { expect(sharedState).toBe('value'); });
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should calculate total correctly', () => {
  // Arrange - set up test data
  const items = [{ price: 10 }, { price: 20 }];

  // Act - perform the action
  const total = calculateTotal(items);

  // Assert - verify the result
  expect(total).toBe(30);
});
```

### 4. Test One Thing
```typescript
// ✅ Good - tests one specific behavior
it('should validate email format', () => {
  expect(isValidEmail('test@test.com')).toBe(true);
});

it('should reject invalid email format', () => {
  expect(isValidEmail('invalid')).toBe(false);
});

// ❌ Bad - tests multiple things
it('should validate email and password', () => {
  expect(isValidEmail('test@test.com')).toBe(true);
  expect(isValidPassword('pass123')).toBe(true);
});
```

### 5. Error Testing
```typescript
// ✅ Good - test error paths
it('should throw error for invalid input', async () => {
  await expect(processData(null)).rejects.toThrow('Invalid input');
});

// ✅ Good - test error responses
it('should return 500 on API error', async () => {
  vi.mocked(externalAPI).mockRejectedValue(new Error('API down'));

  const response = await handler(request);

  expect(response.status).toBe(500);
});
```

### 6. Async Testing
```typescript
// ✅ Good - properly awaits async operations
it('should fetch data asynchronously', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ❌ Bad - doesn't await
it('should fetch data asynchronously', () => {
  const data = fetchData(); // Returns promise, not data!
  expect(data).toBeDefined(); // Will fail
});
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
# Run with verbose output
npx vitest run --reporter=verbose

# Run single test file in watch mode
npx vitest tests/api/chat.test.ts

# Run with increased timeout
npx vitest run --testTimeout=10000
```

### Common Issues

#### Tests Timeout
```typescript
// Increase timeout for specific test
it('slow operation', async () => {
  // Test code
}, { timeout: 30000 }); // 30 seconds

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
```

#### Mocks Not Working
```typescript
// ✅ Good - mock defined before import
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));
import { POST } from '@/app/api/route';

// ❌ Bad - import before mock
import { POST } from '@/app/api/route';
vi.mock('@supabase/supabase-js', () => ({ ... }));
```

#### Module Resolution Errors
Check `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
    '@/app': path.resolve(__dirname, './app'),
    '@/lib': path.resolve(__dirname, './lib'),
  },
}
```

## Coverage Reports

### Generate Coverage
```bash
npm run test:coverage
```

### View Coverage Report
```bash
# Open HTML report (after running coverage)
open coverage/index.html
```

### Coverage Thresholds
Set in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  }
}
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
npm test
```

## Performance Testing

### Benchmark Example
```typescript
it('should complete search in under 500ms', async () => {
  const startTime = Date.now();

  await performSearch('query');

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(500);
});
```

### Concurrent Testing
```typescript
it('should handle 10 concurrent requests', async () => {
  const requests = Array(10).fill(null).map(() =>
    performRequest()
  );

  const results = await Promise.all(requests);

  expect(results.every(r => r.success)).toBe(true);
});
```

## Security Testing

### Input Validation
```typescript
it('should reject SQL injection attempts', () => {
  const malicious = "1' OR '1'='1";
  const isValid = validateInput(malicious);
  expect(isValid).toBe(false);
});
```

### XSS Prevention
```typescript
it('should escape HTML in user input', () => {
  const input = '<script>alert("xss")</script>';
  const escaped = escapeHtml(input);
  expect(escaped).not.toContain('<script>');
});
```

## Helpful Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Patterns](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Mock Service Worker](https://mswjs.io/)

## Test File Organization

```
tests/
├── api/                    # API route tests
│   ├── chat.test.ts
│   ├── files-upload.test.ts
│   └── search-semantic.test.ts
├── lib/                    # Library unit tests
│   ├── embeddings.test.ts
│   └── file-processors.test.ts
├── integration/            # Integration tests
│   └── rag-system.test.ts
├── security/               # Security tests
│   └── sql-injection.test.ts
├── performance/            # Performance tests
│   └── concurrent-users.test.ts
├── e2e/                    # End-to-end tests
│   └── user-flows.test.ts
├── helpers/                # Test utilities
│   └── test-utils.ts
├── mocks/                  # Mock factories
│   ├── supabase.mock.ts
│   ├── openai.mock.ts
│   └── assemblyai.mock.ts
└── setup.ts                # Global test setup
```

---

**Quick Reference Card:**

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:ui` | Visual dashboard |
| `npm run test:coverage` | Coverage report |
| `npm run test:unit` | Unit tests only |
| `npm run test:api` | API tests only |
| `npx vitest run <file>` | Single file |
| `npx vitest run -t "<pattern>"` | Pattern match |

---

For detailed test results and statistics, see [TESTING_REPORT.md](./TESTING_REPORT.md)
