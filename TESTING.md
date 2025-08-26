# Testing Guide - HTN Prevention Program

This document provides comprehensive information about testing the HTN Prevention Program application.

## 🧪 Testing Strategy

Our testing strategy follows a multi-layered approach:

1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - API endpoint and database interaction testing
3. **Component Tests** - React component behavior testing
4. **End-to-End Tests** - Full application workflow testing
5. **Performance Tests** - Load and stress testing
6. **Security Tests** - Vulnerability and penetration testing

## 📁 Test Structure

```
htn-prevention-app/
├── server/
│   ├── tests/
│   │   ├── setup.ts              # Test environment setup
│   │   ├── members.test.ts       # Members API tests
│   │   ├── bloodPressure.test.ts # Blood pressure API tests
│   │   └── encounters.test.ts    # Encounters API tests
│   └── jest.config.js            # Jest configuration
├── client/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── Dashboard.test.jsx # Dashboard component tests
│   │   │   └── Members.test.jsx   # Members component tests
│   │   └── test/
│   │       └── setup.js           # Test setup and mocks
│   └── vitest.config.js          # Vitest configuration
├── test-workflow.js              # Comprehensive test workflow
└── .github/workflows/ci-cd.yml   # CI/CD pipeline
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (for production tests)
- SQLite (for local tests)
- pnpm (for frontend)

### Running All Tests

```bash
# Run comprehensive test workflow
node test-workflow.js

# Or run individual test suites
npm run test:backend
npm run test:frontend
npm run test:integration
```

## 🔧 Backend Testing

### Setup

```bash
cd server
npm install
cp .env.example .env.test
```

### Configuration

The backend uses Jest with TypeScript support. Configuration is in `jest.config.js`:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // ... other config
};
```

### Running Backend Tests

```bash
# Run all backend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- members.test.ts
```

### Test Database

Backend tests use SQLite for isolation and speed:

```typescript
// tests/setup.ts
const testDbPath = path.join(__dirname, '../test.db');
const sqlite = new Database(testDbPath);
const db = drizzle(sqlite, { schema });
```

### API Test Examples

```typescript
// Testing member creation
it('should create a new member successfully', async () => {
  const memberData = {
    employeeId: 'FF001',
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1985-06-15T00:00:00.000Z',
    gender: 'Male',
    union: 'Firefighters'
  };

  const response = await request(app)
    .post('/api/members')
    .send(memberData)
    .expect(201);

  expect(response.body.employeeId).toBe(memberData.employeeId);
});
```

## 🎨 Frontend Testing

### Setup

```bash
cd client
pnpm install
```

### Configuration

The frontend uses Vitest with React Testing Library:

```javascript
// vitest.config.js
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
});
```

### Running Frontend Tests

```bash
# Run all frontend tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test Dashboard.test.jsx
```

### Component Test Examples

```jsx
// Testing Dashboard component
it('displays metric cards with correct titles', async () => {
  const { analyticsAPI } = await import('../services/api');
  
  analyticsAPI.getOverview.mockResolvedValue({
    data: {
      totalMembers: 25,
      totalReadings: 150,
      totalEncounters: 75,
    }
  });

  render(<Dashboard />, { wrapper: createWrapper() });

  await waitFor(() => {
    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});
```

## 🔄 Integration Testing

### Comprehensive Test Workflow

The `test-workflow.js` script runs a complete integration test:

1. **Database Setup** - Creates SQLite test database
2. **Server Startup** - Starts backend on port 3002
3. **Frontend Startup** - Starts frontend on port 5174
4. **API Testing** - Tests all API endpoints
5. **Component Testing** - Runs React component tests
6. **E2E Testing** - Tests full application flow
7. **Report Generation** - Creates test report
8. **Cleanup** - Removes test artifacts

### Running Integration Tests

```bash
# Run full integration test suite
node test-workflow.js

# Check test report
cat test-report.json
```

### Test Scenarios

The integration tests cover:

- ✅ Health check endpoints
- ✅ Member CRUD operations
- ✅ Blood pressure recording and HTN calculation
- ✅ Encounter logging and session tracking
- ✅ Analytics data aggregation
- ✅ Frontend page accessibility
- ✅ API error handling
- ✅ Data validation

## 🏗️ CI/CD Pipeline

### GitHub Actions Workflow

Our CI/CD pipeline includes:

1. **Backend Tests** - Jest tests with PostgreSQL
2. **Frontend Tests** - Vitest tests with coverage
3. **Integration Tests** - Full application testing
4. **Security Audit** - Dependency vulnerability scanning
5. **Code Quality** - ESLint and TypeScript checking
6. **Deployment** - Automated deployment to staging/production

### Pipeline Triggers

- **Push to main** - Full pipeline + production deployment
- **Push to develop** - Full pipeline + staging deployment
- **Pull requests** - Tests and quality checks only

### Required Secrets

```bash
# Deployment
RAILWAY_TOKEN=your_railway_token
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Notifications
SLACK_WEBHOOK=your_slack_webhook_url
```

## 📊 Test Coverage

### Coverage Targets

- **Backend**: 80%+ line coverage
- **Frontend**: 70%+ line coverage
- **Integration**: 90%+ critical path coverage

### Generating Coverage Reports

```bash
# Backend coverage
cd server && npm run test:coverage

# Frontend coverage
cd client && pnpm test:coverage

# View coverage reports
open server/coverage/lcov-report/index.html
open client/coverage/index.html
```

## 🔍 Test Data Management

### Test Fixtures

```typescript
// Example test data
const mockMembers = [
  {
    id: '1',
    employeeId: 'FF001',
    firstName: 'John',
    lastName: 'Smith',
    union: 'Firefighters',
    // ... other fields
  }
];
```

### Database Seeding

```bash
# Seed test database with sample data
npm run db:seed:test
```

## 🐛 Debugging Tests

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   pg_isready -h localhost -p 5432
   
   # Reset test database
   npm run db:reset:test
   ```

2. **Port Conflicts**
   ```bash
   # Kill processes on test ports
   lsof -ti:3002 | xargs kill -9
   lsof -ti:5174 | xargs kill -9
   ```

3. **Mock Issues**
   ```javascript
   // Clear mocks between tests
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with debugging
npm test -- --verbose members.test.ts
```

## 📈 Performance Testing

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run load-test.yml
```

### Performance Benchmarks

- **API Response Time**: < 200ms (95th percentile)
- **Page Load Time**: < 2s (initial load)
- **Database Queries**: < 50ms (average)

## 🔒 Security Testing

### Vulnerability Scanning

```bash
# Audit dependencies
npm audit
pnpm audit

# Run security tests
npm run test:security
```

### Security Test Cases

- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF token validation
- ✅ Input sanitization
- ✅ Authentication bypass attempts
- ✅ Authorization checks

## 📝 Writing New Tests

### Backend Test Template

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('New Feature API', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should handle new feature correctly', async () => {
    const response = await request(app)
      .post('/api/new-feature')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

### Frontend Test Template

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewComponent from '../NewComponent';

describe('NewComponent', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('renders correctly', () => {
    render(<NewComponent />, { wrapper: createWrapper() });
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 🎯 Best Practices

### Test Organization

1. **Arrange-Act-Assert** pattern
2. **Descriptive test names**
3. **Single responsibility per test**
4. **Proper setup and teardown**
5. **Mock external dependencies**

### Performance

1. **Use test databases**
2. **Parallel test execution**
3. **Efficient test data creation**
4. **Proper cleanup**

### Maintainability

1. **Shared test utilities**
2. **Consistent naming conventions**
3. **Regular test review**
4. **Documentation updates**

## 🆘 Troubleshooting

### Common Test Failures

| Error | Cause | Solution |
|-------|-------|----------|
| Database connection refused | PostgreSQL not running | Start PostgreSQL service |
| Port already in use | Previous test didn't cleanup | Kill process on port |
| Module not found | Missing dependencies | Run `npm install` |
| Timeout errors | Slow database queries | Increase test timeout |
| Mock not working | Incorrect mock setup | Check mock implementation |

### Getting Help

1. Check test logs for detailed error messages
2. Review test documentation
3. Run tests in isolation to identify issues
4. Use debugging tools and breakpoints
5. Consult team members or create GitHub issues

---

## 📞 Support

For testing-related questions or issues:

- **GitHub Issues**: [Create an issue](https://github.com/jeffbander/htn-prevention-app/issues)
- **Documentation**: Check README.md for setup instructions
- **CI/CD**: Review GitHub Actions logs for pipeline issues

**Happy Testing! 🧪✨**

