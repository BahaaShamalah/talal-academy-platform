export const AUTH_COOKIE = 'talal_admin_token';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  permissions: string[];
};

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}
