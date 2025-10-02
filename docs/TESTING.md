# KimbleAI Testing Documentation

## Overview

This document provides comprehensive information about the testing infrastructure for the KimbleAI application. Our test suite ensures production stability, security, and performance.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Mocking](#mocking)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- All project dependencies installed

### Installation

Testing dependencies are already included in `package.json`. If you need to reinstall:

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

### Environment Setup

Create a `.env.test` file (or use the test setup in `tests/setup.ts`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
OPENAI_API_KEY=test-openai-key
ASSEMBLYAI_API_KEY=test-assemblyai-key
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/test
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
```

## Test Structure

Our test suite is organized into the following categories:

```
tests/
├── api/                    # API route tests
│   ├── chat.test.ts
│   ├── photo.test.ts
│   ├── transcribe.test.ts
│   └── ...
├── integration/            # Integration tests
│   ├── rag-system.test.ts
│   └── file-upload-flow.test.ts
├── security/              # Security tests
│   ├── sql-injection.test.ts
│   ├── auth-bypass.test.ts
│   └── file-upload-attacks.test.ts
├── performance/           # Performance tests
│   ├── concurrent-users.test.ts
│   └── large-file-handling.test.ts
├── lib/                   # Library unit tests
│   ├── background-indexer.test.ts
│   └── security-middleware.test.ts
├── helpers/               # Test utilities
│   └── test-utils.ts
├── mocks/                 # Mock factories
│   ├── supabase.mock.ts
│   ├── openai.mock.ts
│   └── assemblyai.mock.ts
└── setup.ts              # Global test setup
```

### Test Categories

#### 1. API Route Tests (`tests/api/`)

Test all API endpoints for:
- Success cases (200 responses)
- Error handling (400, 404, 500 responses)
- Input validation
- Authentication
- Edge cases

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/chat/route';

describe('Chat API', () => {
  it('should process chat messages successfully', async () => {
    const request = createMockNextRequest({
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'Hello' }] }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
  });
});
```

#### 2. Integration Tests (`tests/integration/`)

Test complete workflows and system interactions:
- RAG system end-to-end flow
- File upload → Analysis → Storage → Search
- Background indexing pipeline
- Multi-message conversation continuity

#### 3. Security Tests (`tests/security/`)

Validate security measures:
- SQL injection prevention
- XSS attack prevention
- Path traversal protection
- File upload security
- Authentication bypass attempts
- Input sanitization

#### 4. Performance Tests (`tests/performance/`)

Measure system performance:
- Concurrent user handling
- Large file processing
- Response time distribution
- Memory usage
- Embedding generation speed

#### 5. Unit Tests (`tests/lib/`)

Test individual library modules:
- Background indexer logic
- Security middleware functions
- Model selector
- Utility functions

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (Auto-run on changes)

```bash
npm run test:watch
```

### With UI Dashboard

```bash
npm run test:ui
```

### Coverage Report

```bash
npm run test:coverage
```

### Specific Test Suites

```bash
# Unit tests only
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

### Run Specific Test File

```bash
npx vitest run tests/api/chat.test.ts
```

### Run Tests Matching Pattern

```bash
npx vitest run -t "should handle authentication"
```

## Writing Tests

### Test File Naming

- Test files must end with `.test.ts` or `.test.tsx`
- Place tests near the code they test or in the `tests/` directory
- Use descriptive names: `chat.test.ts`, `background-indexer.test.ts`

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Testing Best Practices

1. **Write Clear Test Names**: Test names should describe what they test
   ```typescript
   // Good
   it('should return 400 when messages array is empty', () => {});

   // Bad
   it('test 1', () => {});
   ```

2. **Test One Thing Per Test**: Each test should verify a single behavior
   ```typescript
   // Good
   it('should validate email format', () => {});
   it('should reject invalid email', () => {});

   // Bad
   it('should validate and process email', () => {});
   ```

3. **Use AAA Pattern**: Arrange, Act, Assert
   ```typescript
   it('should calculate total', () => {
     // Arrange
     const items = [{ price: 10 }, { price: 20 }];

     // Act
     const total = calculateTotal(items);

     // Assert
     expect(total).toBe(30);
   });
   ```

4. **Test Both Success and Failure Cases**
   ```typescript
   describe('validateUser', () => {
     it('should accept valid user', () => {});
     it('should reject user with invalid email', () => {});
     it('should reject user without name', () => {});
   });
   ```

5. **Mock External Dependencies**: Don't make real API calls in tests
   ```typescript
   vi.mock('openai', () => ({
     default: class MockOpenAI {
       chat = {
         completions: {
           create: vi.fn().mockResolvedValue({ /* mock response */ })
         }
       }
     }
   }));
   ```

## Mocking

### Available Mocks

#### Supabase Mock

```typescript
import { MockSupabaseClient } from '../mocks/supabase.mock';

const supabase = new MockSupabaseClient();

// Set mock data
supabase.setMockData('users', [
  { id: 'user-1', name: 'Test User' }
]);

// Set mock error
supabase.setMockError(new Error('Database error'));
```

#### OpenAI Mock

```typescript
import { setupOpenAIMock } from '../mocks/openai.mock';

// Setup default mocks
const cleanup = setupOpenAIMock();

// Or use custom responses
const cleanup = setupOpenAIMockWithResponses({
  chat: mockOpenAIChatCompletion('Custom response'),
  embeddings: mockOpenAIEmbedding()
});

// Cleanup after tests
cleanup();
```

#### AssemblyAI Mock

```typescript
import { setupAssemblyAIMock } from '../mocks/assemblyai.mock';

const cleanup = setupAssemblyAIMock('Transcription text');

// Cleanup
cleanup();
```

### Creating Test Data

```typescript
import { createMockFile, createMockFormData } from '../helpers/test-utils';

// Create mock file
const file = createMockFile('content', 'test.jpg', 'image/jpeg');

// Create mock form data
const formData = createMockFormData(file, {
  userId: 'test-user',
  analysisType: 'general'
});
```

## Coverage Requirements

### Thresholds

We maintain a minimum coverage of **70%** across:
- Lines
- Functions
- Branches
- Statements

### Viewing Coverage

After running `npm run test:coverage`:

```bash
# View in terminal
cat coverage/coverage-summary.json

# View HTML report
open coverage/index.html
```

### Coverage Report Location

- **Text**: Console output
- **JSON**: `coverage/coverage-summary.json`
- **HTML**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Workflow Steps

1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linter
5. Run unit tests
6. Run API tests
7. Run integration tests
8. Run security tests
9. Run performance tests
10. Generate coverage report
11. Upload to Codecov
12. Comment PR with coverage

### Required Secrets

Configure in GitHub repository settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `ZAPIER_WEBHOOK_URL`

### Coverage Enforcement

PRs must maintain or improve code coverage. The CI will:
- Generate coverage reports
- Comment on PRs with coverage changes
- Fail if coverage drops below 70%

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Problem**: Tests take too long and timeout

**Solution**:
```typescript
// Increase timeout for specific test
it('slow operation', async () => {
  // Test code
}, { timeout: 30000 }); // 30 seconds

// Or configure in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
```

#### 2. Mock Not Working

**Problem**: Mock not being applied

**Solution**:
```typescript
// Ensure mocks are defined BEFORE imports
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

// Then import
import { POST } from '@/app/api/chat/route';
```

#### 3. Module Resolution Errors

**Problem**: Cannot resolve `@/...` imports

**Solution**: Check `vitest.config.ts` has correct aliases:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
    '@/app': path.resolve(__dirname, './app'),
    '@/lib': path.resolve(__dirname, './lib'),
  },
}
```

#### 4. Memory Leaks

**Problem**: Tests slow down or crash

**Solution**:
```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

#### 5. Flaky Tests

**Problem**: Tests pass sometimes, fail other times

**Solution**:
- Avoid relying on timing
- Use `vi.useFakeTimers()` for time-based tests
- Ensure proper cleanup in `afterEach`
- Check for race conditions

### Getting Help

1. Check test output for specific error messages
2. Run with verbose logging: `npx vitest run --reporter=verbose`
3. Use debugging: `npx vitest run --inspect-brk`
4. Review similar tests for patterns

## Advanced Topics

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Errors

```typescript
it('should throw error on invalid input', () => {
  expect(() => {
    dangerousFunction(null);
  }).toThrow('Invalid input');
});

// Async errors
it('should reject on API failure', async () => {
  await expect(apiCall()).rejects.toThrow('API Error');
});
```

### Snapshot Testing

```typescript
it('should match snapshot', () => {
  const result = generateComplexObject();
  expect(result).toMatchSnapshot();
});
```

### Parameterized Tests

```typescript
describe.each([
  { input: 'valid@email.com', expected: true },
  { input: 'invalid-email', expected: false },
  { input: '@example.com', expected: false },
])('validateEmail($input)', ({ input, expected }) => {
  it(`should return ${expected}`, () => {
    expect(validateEmail(input)).toBe(expected);
  });
});
```

## Test Maintenance

### Regular Tasks

1. **Update mocks** when external APIs change
2. **Review coverage** after each feature addition
3. **Fix flaky tests** immediately
4. **Remove obsolete tests** when removing features
5. **Update documentation** when changing test structure

### Code Review Checklist

- [ ] All new code has tests
- [ ] Tests cover success and error cases
- [ ] Mocks are used for external dependencies
- [ ] Test names are descriptive
- [ ] Coverage meets threshold
- [ ] No flaky tests introduced
- [ ] Documentation updated if needed

## Contributing

When adding new features:

1. Write tests first (TDD) or alongside code
2. Ensure all tests pass locally
3. Check coverage report
4. Update this documentation if adding new test patterns
5. Run `npm run test:coverage` before pushing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Node Test Patterns](https://github.com/goldbergyoni/nodebestpractices#-8-testing-and-overall-quality-practices)

---

**Last Updated**: 2025-10-01
**Maintained by**: KimbleAI Development Team
