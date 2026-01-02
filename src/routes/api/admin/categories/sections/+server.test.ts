import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    request: new Request('http://localhost/api/admin/categories/sections'),
    url: new URL('http://localhost/api/admin/categories/sections'),
    params: {},
    locals: {},
    ...overrides
  } as RequestEvent;
}

const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@test.com'
};

const mockAdminProfile = {
  id: 'admin-user-id',
  role: 'admin'
};

const mockSections = [
  {
    id: 'section-1',
    category_id: null,
    section_id: 'overview',
    section_title: 'Overview',
    is_universal: true,
    is_required: true,
    display_order: 1,
    prompt_hint: 'General description',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'section-2',
    category_id: 'cat-1',
    section_id: 'identification',
    section_title: 'Identification',
    is_universal: false,
    is_required: true,
    display_order: 2,
    prompt_hint: 'How to identify',
    created_at: '2025-01-01T00:00:00Z'
  }
];

describe('GET /api/admin/categories/sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all sections for admin user', async () => {
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

    const mockSectionsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockSections,
        error: null
      }),
      or: vi.fn().mockReturnThis()
    };
    
    // Make order return data after or is called too
    mockSectionsQuery.or = vi.fn().mockReturnValue({
      ...mockSectionsQuery,
      order: vi.fn().mockResolvedValue({
        data: mockSections,
        error: null
      })
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'category_section_config') return mockSectionsQuery;
      return mockUserQuery;
    });

    const event = createMockEvent();
    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('should filter sections by category_id', async () => {
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

    const mockSectionsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [mockSections[1]],
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'category_section_config') return mockSectionsQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      url: new URL('http://localhost/api/admin/categories/sections?category_id=cat-1')
    });
    
    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSectionsQuery.or).toHaveBeenCalled();
  });

  it('should return 403 for non-admin users', async () => {
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
    
    try {
      await GET(event);
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.body?.status || err.status).toBe(403);
    }
  });
});

describe('POST /api/admin/categories/sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new section', async () => {
    const newSection = {
      category_id: 'cat-1',
      section_id: 'symptoms',
      section_title: 'Symptoms',
      is_universal: false,
      is_required: true,
      display_order: 3,
      prompt_hint: 'Describe symptoms'
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
          id: 'section-3',
          ...newSection,
          created_at: '2025-01-01T00:00:00Z'
        },
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'category_section_config') return mockInsertQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      request: new Request('http://localhost/api/admin/categories/sections', {
        method: 'POST',
        body: JSON.stringify(newSection)
      })
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.section_title).toBe('Symptoms');
  });

  it('should return 400 if section_id or section_title is missing', async () => {
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
      request: new Request('http://localhost/api/admin/categories/sections', {
        method: 'POST',
        body: JSON.stringify({ category_id: 'cat-1' })
      })
    });

    try {
      await POST(event);
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.body?.status || err.status).toBe(400);
    }
  });

  it('should normalize section_id to lowercase with underscores', async () => {
    const newSection = {
      category_id: null,
      section_id: 'Common Hazards',
      section_title: 'Common Hazards',
      is_universal: true,
      is_required: false,
      display_order: 10
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
          id: 'section-4',
          category_id: null,
          section_id: 'common_hazards',
          section_title: 'Common Hazards',
          is_universal: true,
          is_required: false,
          display_order: 10,
          prompt_hint: null,
          created_at: '2025-01-01T00:00:00Z'
        },
        error: null
      })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'category_section_config') return mockInsertQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      request: new Request('http://localhost/api/admin/categories/sections', {
        method: 'POST',
        body: JSON.stringify(newSection)
      })
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        section_id: 'common_hazards'
      })
    );
  });
});

describe('DELETE /api/admin/categories/sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a section', async () => {
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

    const mockSectionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { is_universal: false },
        error: null
      }),
      delete: vi.fn().mockReturnThis()
    };
    
    // Setup delete chain
    mockSectionQuery.delete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'category_section_config') return mockSectionQuery;
      return mockUserQuery;
    });

    const event = createMockEvent({
      url: new URL('http://localhost/api/admin/categories/sections?id=section-2')
    });

    const response = await DELETE(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Section deleted successfully');
  });

  it('should return 400 if section ID is missing', async () => {
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

    try {
      await DELETE(event);
      expect.fail('Should have thrown error');
    } catch (err: any) {\n      expect(err.body?.status || err.status).toBe(400);
    }
  });
});
