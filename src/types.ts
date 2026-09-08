export interface UserExperience {
  company: string;
  role: string;
  active_years: string;
  current: boolean;
}

export interface UserDto {
  userId: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  title: string | null;
  location: string | null;
  skills: string[];
  experience: UserExperience[];
  isAdmin: boolean;
  totalBlogs: number;
}

export interface RawUserRow {
  id?: string;
  username?: string;
  email?: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
  title?: string | null;
  location?: string | null;
  skills?: string | string[];
  experience?: string | UserExperience[];
  is_admin?: boolean | string;
}

export type ContentBlockType = 'text' | 'blockquote' | 'codesnippet';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  order: number;
  language?: string;
}

export interface BlogDto {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  tags: string[];
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogDetailsDto {
  id: string;
  blogId: string;
  title: string;
  subtitle: string;
  tags: string[];
  textcontents: string[];
  blockquote: string[];
  codesnippet: string[];
  contentBlocks: ContentBlock[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawBlogRow {
  id?: string;
  author_id?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  status?: string;
  tags?: string | string[];
  view_count?: number | string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RawBlogDetailsRow {
  id?: string;
  blog_id?: string;
  title?: string;
  subtitle?: string;
  tags?: string | string[];
  textcontents?: string | string[];
  blockquote?: string | string[];
  codesnippet?: string | string[];
  content_blocks?: string | ContentBlock[];
  author_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBlogInput {
  title: string;
  subtitle?: string;
  subtile?: string; // alias for subtitle
  tags?: string[] | string;
  textcontents?: string[] | string;
  blockquote?: string[] | string;
  codesnippet?: string[] | string | { code: string; language?: string }[];
  contentBlocks?: Partial<ContentBlock>[];
  coverImageUrl?: string | null;
  userId?: string;
  authorId?: string;
  status?: string;
  accessToken?: string; // Optional Google Sheets OAuth access token
}

export interface CreateBlogResponse {
  message: string;
  blog: BlogDto;
  blogDetails: BlogDetailsDto;
  googleSheetsSync: {
    spreadsheetId: string;
    blogDetailsSheet: string;
    blogsSheet: string;
    syncedToGoogleSheets: boolean;
    syncNote?: string;
    details?: {
      blogsAppended: boolean;
      blogDetailsAppended: boolean;
      error?: string;
    };
  };
}
