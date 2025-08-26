import '@testing-library/jest-dom';

// Mock API calls
global.fetch = vi.fn();

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:3001'
  }
});

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

