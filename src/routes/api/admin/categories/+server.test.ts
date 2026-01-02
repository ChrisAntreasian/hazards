import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

// Mock createSupabaseServerClient
vi.mock('$lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(() => mockSupabase)
}));

// Helper to create mock RequestEvent
function createMockEvent(overrides: Partial<RequestEvent> = {}): RequestEvent {
  return {
    request: new Request('http://localhost/api/admin/categories'),
    url: new URL('http://localhost/api/admin/categories'),
    params: {},
    locals: {},
    ...overrides
  } as RequestEvent;
}

// Mock category data
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@test.com'
};

const mockAdminProfile = {
  id: 'admin-user-id',
  role: 'admin'
};

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Animals',
    slug: 'animals',
    parent_id: null,
    level: 0,
    path: 'animals',
    icon: '🐾',
    description: 'Animal hazards',
    short_description: 'Animals',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'cat-2',
    name: 'Snakes',
    slug: 'snakes',
    parent_id: 'cat-1',
    level: 1,
    path: 'animals/snakes',
    icon: '🐍',
    description: 'Venomous snakes',
    short_description: 'Snakes',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z'
  }
];

describe('GET /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return categories in tree structure for admin user', async () => {
    // Mock auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    // Mock user profile lookup
    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    // Mock categories query
    const mockCategoriesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'hazard_categories') return mockCategoriesQuery;
      return mockUserQuery;
    });

    const event = createMockEvent();
    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1); // One root category
    expect(data.data[0].name).toBe('Animals');
    expect(data.data[0].children).toHaveLength(1); // One child
    expect(data.data[0].children[0].name).toBe('Snakes');
  });

  it('should return 401 if user not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const event = createMockEvent();
    
    const response = await GET(event);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it('should return 403 if user is not admin/moderator', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-id', role: 'user' },
        error: null
      })
    };

    mockSupabase.from.mockReturnValue(mockUserQuery);

    const event = createMockEvent();
    
    const response = await GET(event);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });
});

describe('POST /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new root category', async () => {
    const newCategory = {
      name: 'Weather',
      icon: '⛈️',
      description: 'Weather hazards',
      short_description: 'Weather'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cat-3',
          ...newCategory,
          slug: 'weather',
          parent_id: null,
          level: 0,
          path: 'weather',
          status: 'active'
        },
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'hazard_categories') return mockInsertQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      request: new Request('http://localhost/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory)
      })
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Weather');
    expect(data.data.slug).toBe('weather');
    expect(data.data.level).toBe(0);
    expect(data.data.path).toBe('weather');
  });

  it('should create a child category with correct path and level', async () => {
    const newCategory = {
      name: 'Rattlesnakes',
      parent_id: 'cat-2',
      icon: '🐍',
      description: 'Rattlesnake species'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    const mockParentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { level: 1, path: 'animals/snakes' },
        error: null
      })
    };

    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cat-4',
          ...newCategory,
          slug: 'rattlesnakes',
          level: 2,
          path: 'animals/snakes/rattlesnakes',
          status: 'active'
        },
        error: null
      })
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'hazard_categories') {
        callCount++;
        // First call is parent lookup, second is insert
        return callCount === 1 ? mockParentQuery : mockInsertQuery;
      }
      return mockUserQuery;
    });

    const event = createMockEvent({
      request: new Request('http://localhost/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory)
      })
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.level).toBe(2);
    expect(data.data.path).toBe('animals/snakes/rattlesnakes');
  });

  it('should return 400 if name is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    mockSupabase.from.mockReturnValue(mockUserQuery);

    const event = createMockEvent({
      request: new Request('http://localhost/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ icon: '🐾' })
      })
    });

    const response = await POST(event);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });
});

describe('DELETE /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a category with no children', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    const mockChildrenQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'hazard_categories') {
        callCount++;
        // First call checks children, second deletes
        return callCount === 1 ? mockChildrenQuery : mockDeleteQuery;
      }
      return mockUserQuery;
    });

    const event = createMockEvent({
      url: new URL('http://localhost/api/admin/categories?id=cat-2')
    });

    const response = await DELETE(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Category deleted successfully');
  });

  it('should return 400 if category has children', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    const mockChildrenQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'child-cat' }],
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'hazard_categories') return mockChildrenQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      url: new URL('http://localhost/api/admin/categories?id=cat-1')
    });

    const response = await DELETE(event);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it('should return 400 if category ID is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    const mockUserQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAdminProfile,
        error: null
      })
    };

    mockSupabase.from.mockReturnValue(mockUserQuery);

    const event = createMockEvent();

    const response = await DELETE(event);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });
});
