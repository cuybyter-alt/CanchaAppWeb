export type InvitationStatus = 'pending' | 'accepted' | 'cancelled';

export interface ComplexInvitation {
  invitation_id: string;
  complex_id: string;
  complex_name: string;
  invitee_email: string;
  token: string;
  status: InvitationStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface RegisterAndAcceptInput {
  f_name: string;
  l_name: string;
  username: string;
  password: string;
}

export interface RegisterAndAcceptResponse {
  access: string;
  refresh: string;
  user: {
    user_id: string;
    email: string;
    username: string;
    f_name: string;
    l_name: string;
    role_names: string[];
    role_name?: string;
    status?: string;
    avatar_url?: string | null;
    is_guest?: boolean;
  };
  invitation: {
    invitation_id: string;
    complex_id: string;
    complex_name: string;
    status: string;
    accepted_at: string;
  };
}
