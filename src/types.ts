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
