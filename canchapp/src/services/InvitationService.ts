import ApiClient from './ApiClient';
import type { ComplexInvitation, InvitationStatus, RegisterAndAcceptInput, RegisterAndAcceptResponse } from '../types/invitation';

interface ApiResponse<T> { data: T; message?: string; }

const invitationService = {
  sendInvitation: async (complexId: string, email: string): Promise<ComplexInvitation> => {
    const res = await ApiClient.post<ApiResponse<ComplexInvitation>>(
      `/complexes/${complexId}/managers/invite/`,
      { invitee_email: email },
      { withAuth: true },
    );
    return res.data;
  },

  listInvitations: async (complexId: string, status?: InvitationStatus): Promise<ComplexInvitation[]> => {
    const query = status ? `?status=${status}` : '';
    const res = await ApiClient.get<ApiResponse<ComplexInvitation[]>>(
      `/complexes/${complexId}/invitations/${query}`,
      { withAuth: true },
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  cancelInvitation: async (complexId: string, invitationId: string): Promise<void> => {
    await ApiClient.delete(
      `/complexes/${complexId}/invitations/${invitationId}/`,
      { withAuth: true },
    );
  },

  getByToken: async (token: string): Promise<ComplexInvitation> => {
    const res = await ApiClient.get<ApiResponse<ComplexInvitation>>(
      `/complexes/invitations/${token}/`,
    );
    return res.data;
  },

  acceptInvitation: async (token: string): Promise<void> => {
    await ApiClient.post(
      `/complexes/invitations/${token}/accept/`,
      {},
      { withAuth: true },
    );
  },

  registerAndAccept: async (token: string, data: RegisterAndAcceptInput): Promise<RegisterAndAcceptResponse> => {
    const res = await ApiClient.post<ApiResponse<RegisterAndAcceptResponse>>(
      `/complexes/invitations/${token}/register-and-accept/`,
      data,
    );
    return res.data;
  },
};

export default invitationService;
