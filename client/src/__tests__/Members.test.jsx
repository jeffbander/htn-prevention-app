import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Members from '../pages/Members';

// Mock the API module
vi.mock('../services/api', () => ({
  membersAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

const mockMembers = [
  {
    id: '1',
    employeeId: 'FF001',
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1985-06-15T00:00:00.000Z',
    gender: 'Male',
    union: 'Firefighters',
    age: 38,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    employeeId: 'PD001',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-03-20T00:00:00.000Z',
    gender: 'Female',
    union: 'Police',
    age: 33,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('Members Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders members page title and description', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: [] });

    render(<Members />, { wrapper: createWrapper() });

    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Manage first responder participants')).toBeInTheDocument();
  });

  it('displays add member button', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: [] });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Add Member')).toBeInTheDocument();
    });
  });

  it('displays members in table when data is loaded', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: mockMembers });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('FF001')).toBeInTheDocument();
      expect(screen.getByText('PD001')).toBeInTheDocument();
      expect(screen.getByText('Firefighters')).toBeInTheDocument();
      expect(screen.getByText('Police')).toBeInTheDocument();
    });
  });

  it('shows empty state when no members exist', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: [] });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No members found')).toBeInTheDocument();
    });
  });

  it('displays member statistics correctly', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: mockMembers });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total members
      expect(screen.getByText('1')).toBeInTheDocument(); // Firefighters count
      expect(screen.getByText('1')).toBeInTheDocument(); // Police count
      expect(screen.getByText('0')).toBeInTheDocument(); // EMS count
    });
  });

  it('opens add member dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: [] });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Add Member')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Member'));

    await waitFor(() => {
      expect(screen.getByText('Add New Member')).toBeInTheDocument();
      expect(screen.getByLabelText('Employee ID')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    });
  });

  it('filters members by union correctly', async () => {
    const user = userEvent.setup();
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: mockMembers });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Find and click the union filter dropdown
    const unionFilter = screen.getByDisplayValue('All unions');
    await user.click(unionFilter);

    // Select Firefighters
    await user.click(screen.getByText('Firefighters'));

    // Should only show John Smith (Firefighter)
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });
  });

  it('searches members by name correctly', async () => {
    const user = userEvent.setup();
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: mockMembers });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Find and use the search input
    const searchInput = screen.getByPlaceholderText('Search members...');
    await user.type(searchInput, 'John');

    // Should only show John Smith
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1000))
    );

    render(<Members />, { wrapper: createWrapper() });

    // Should show skeleton loading states
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength.greaterThan(0);
  });

  it('displays edit and delete buttons for each member', async () => {
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: mockMembers });

    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');
      
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  it('validates form inputs correctly', async () => {
    const user = userEvent.setup();
    const { membersAPI } = await import('../services/api');
    membersAPI.getAll.mockResolvedValue({ data: [] });

    render(<Members />, { wrapper: createWrapper() });

    // Open add member dialog
    await user.click(screen.getByText('Add Member'));

    await waitFor(() => {
      expect(screen.getByText('Add New Member')).toBeInTheDocument();
    });

    // Try to submit empty form
    const submitButton = screen.getByText('Add Member');
    await user.click(submitButton);

    // Should show validation errors (form should not submit)
    expect(membersAPI.create).not.toHaveBeenCalled();
  });
});

