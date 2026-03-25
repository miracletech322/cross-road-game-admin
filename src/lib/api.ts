const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  credits?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  user?: { email: string; username: string };
  credits: number;
  amountCents: number;
  currency: string;
  status: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  createdAt?: string;
  updatedAt?: string;
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function getStoredToken(): string | null {
  return localStorage.getItem('cross_road_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; skipUnauthorized?: boolean } = {}
): Promise<T> {
  const { token, skipUnauthorized, headers: initHeaders, ...rest } = options;
  const authToken = token !== undefined ? token : getStoredToken();
  const headers = new Headers(initHeaders);
  headers.set('Accept', 'application/json');
  if (!(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }

  if (res.status === 401) {
    unauthorizedHandler?.();
  }

  if (!res.ok) {
    const message = typeof data.message === 'string' ? data.message : res.statusText;
    throw new Error(message || 'Request failed');
  }

  return data as T;
}

export async function loginRequest(body: {
  email?: string;
  username?: string;
  password: string;
}): Promise<{ token: string; user: PublicUser }> {
  return apiFetch<{ token: string; user: PublicUser }>('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(body),
    token: null,
    skipUnauthorized: true,
  });
}

export async function listUsersRequest(): Promise<{ users: PublicUser[] }> {
  return apiFetch<{ users: PublicUser[] }>('/api/users');
}

export async function updateUserRequest(
  id: string,
  body: Partial<{ email: string; username: string; role: string; password: string }>
): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteUserRequest(id: string): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

export async function listCreditTransactionsRequest(): Promise<{ transactions: CreditTransaction[] }> {
  return apiFetch<{ transactions: CreditTransaction[] }>('/api/credits/transactions');
}
