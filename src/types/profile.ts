
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  email_verified: boolean;
  admin_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  title?: string;
  content?: string;
  image_url?: string;
  post_type: 'discussion' | 'chart' | 'announcement';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}
