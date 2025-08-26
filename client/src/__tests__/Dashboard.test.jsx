import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

// Mock the API module
vi.mock('../services/api', () => ({
  analyticsAPI: {
    getOverview: vi.fn(),
  },
  membersAPI: {
    getAll: vi.fn(),
  },
  bloodPressureAPI: {
    getAll: vi.fn(),
  },
  encountersAPI: {
    getAll: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('renders dashboard title and description', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    // Mock successful API responses
    analyticsAPI.getOverview.mockResolvedValue({
      data: {
        totalMembers: 0,
        totalReadings: 0,
        totalEncounters: 0,
        recentReadings: 0,
        recentEncounters: 0,
      }
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of the Hypertension Prevention Program for First Responders')).toBeInTheDocument();
  });

  it('displays metric cards with correct titles', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    analyticsAPI.getOverview.mockResolvedValue({
      data: {
        totalMembers: 25,
        totalReadings: 150,
        totalEncounters: 75,
        recentReadings: 12,
        recentEncounters: 8,
      }
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Total Members')).toBeInTheDocument();
      expect(screen.getByText('BP Readings')).toBeInTheDocument();
      expect(screen.getByText('Encounters')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('displays correct metric values when data is loaded', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    const mockData = {
      totalMembers: 25,
      totalReadings: 150,
      totalEncounters: 75,
      recentReadings: 12,
      recentEncounters: 8,
    };

    analyticsAPI.getOverview.mockResolvedValue({ data: mockData });

    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('12 / 8')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    const { analyticsAPI } = await import('../services/api');
    
    // Mock a delayed response
    analyticsAPI.getOverview.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: {} }), 1000))
    );

    render(<Dashboard />, { wrapper: createWrapper() });

    // Should show skeleton loading states
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength.greaterThan(0);
  });

  it('displays recent activity section', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    analyticsAPI.getOverview.mockResolvedValue({
      data: {
        totalMembers: 0,
        totalReadings: 0,
        totalEncounters: 0,
        recentReadings: 0,
        recentEncounters: 0,
      }
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Latest program activities')).toBeInTheDocument();
    });
  });

  it('displays high priority section', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    analyticsAPI.getOverview.mockResolvedValue({
      data: {
        totalMembers: 0,
        totalReadings: 0,
        totalEncounters: 0,
        recentReadings: 0,
        recentEncounters: 0,
      }
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Members requiring immediate attention')).toBeInTheDocument();
    });
  });

  it('displays program impact section', async () => {
    const { analyticsAPI } = await import('../services/api');
    
    analyticsAPI.getOverview.mockResolvedValue({
      data: {
        totalMembers: 0,
        totalReadings: 0,
        totalEncounters: 0,
        recentReadings: 0,
        recentEncounters: 0,
      }
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Program Impact')).toBeInTheDocument();
      expect(screen.getByText('Key performance indicators')).toBeInTheDocument();
    });
  });
});

