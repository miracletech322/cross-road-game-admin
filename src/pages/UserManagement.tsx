import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import type { CreditTransaction, PublicUser, ShopPurchaseRecord } from '../lib/api';
import {
  deleteUserRequest,
  getUserHistoryRequest,
  listUsersRequest,
  updateUserRequest,
} from '../lib/api';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatMoney(cents: number, currency: string) {
  const cur = currency?.toUpperCase() || 'USD';
  return `${(cents / 100).toFixed(2)} ${cur}`;
}

function shopTypeLabel(type: ShopPurchaseRecord['type']) {
  switch (type) {
    case 'buyback':
      return 'Revive';
    case 'shield':
      return 'Shield';
    case 'character':
      return 'Character';
    case 'adblock':
      return 'Adblock';
    default:
      return type;
  }
}

function formatMeta(meta: Record<string, unknown>) {
  const keys = Object.keys(meta || {});
  if (keys.length === 0) return '—';
  try {
    return JSON.stringify(meta);
  } catch {
    return '—';
  }
}

export default function UserManagement() {
  const { user: currentUser, token, login } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [deleting, setDeleting] = useState<PublicUser | null>(null);
  const [historyUser, setHistoryUser] = useState<PublicUser | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCreditTx, setHistoryCreditTx] = useState<CreditTransaction[]>([]);
  const [historyShop, setHistoryShop] = useState<ShopPurchaseRecord[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const { users: list } = await listUsersRequest();
      setUsers(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      if (msg.toLowerCase().includes('admin access')) {
        setForbidden(true);
      } else {
        toast.error(msg);
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!historyUser) {
      setHistoryCreditTx([]);
      setHistoryShop([]);
      setHistoryError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const { creditTransactions, shopPurchases } = await getUserHistoryRequest(historyUser.id);
        if (!cancelled) {
          setHistoryCreditTx(creditTransactions);
          setHistoryShop(shopPurchases);
        }
      } catch (e) {
        if (!cancelled) {
          setHistoryCreditTx([]);
          setHistoryShop([]);
          setHistoryError(e instanceof Error ? e.message : 'Failed to load history');
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyUser]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const username = String(form.get('username') ?? '').trim();
    const role = String(form.get('role') ?? '') as 'user' | 'admin';
    const passwordRaw = String(form.get('password') ?? '').trim();

    const payload: Parameters<typeof updateUserRequest>[1] = { email, username, role };
    if (passwordRaw) {
      payload.password = passwordRaw;
    }

    setSaving(true);
    try {
      const { user: updated } = await updateUserRequest(editing.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (token && currentUser?.id === updated.id) {
        login(token, updated);
      }
      toast.success('User updated');
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteUserRequest(deleting.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
      toast.success('User deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="User management | Cross Road Admin" />
      <Breadcrumb pageName="User management" />

      {forbidden && (
        <div className="mb-6 rounded-sm border border-warning bg-warning bg-opacity-10 px-4 py-3 text-black dark:text-white">
          <p className="font-medium">You need an administrator account</p>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Listing and editing users requires the admin role. Sign in with an admin user or contact your
            administrator.
          </p>
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-4 px-4 py-6 md:px-6 xl:px-7.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xl font-semibold text-black dark:text-white">Users</h4>
              {!forbidden && (
                <p className="mt-1 text-sm text-body dark:text-bodydark">Click a row to view payment and shop history.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-stroke px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 dark:border-strokedark dark:hover:bg-meta-4"
            >
              Refresh
            </button>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="min-w-[220px] px-4 py-4 font-medium text-black dark:text-white">Email</th>
                  <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Username</th>
                  <th className="min-w-[80px] px-4 py-4 font-medium text-black dark:text-white">Credits</th>
                  <th className="min-w-[80px] px-4 py-4 font-medium text-black dark:text-white">Role</th>
                  <th className="min-w-[160px] px-4 py-4 font-medium text-black dark:text-white">Created</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      {forbidden ? 'No data' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      role="button"
                      tabIndex={forbidden ? -1 : 0}
                      onClick={() => {
                        if (!forbidden) setHistoryUser(u);
                      }}
                      onKeyDown={(ev) => {
                        if (forbidden) return;
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          setHistoryUser(u);
                        }
                      }}
                      className={`border-b border-stroke dark:border-strokedark ${
                        forbidden ? '' : 'cursor-pointer hover:bg-gray-2/80 dark:hover:bg-meta-4/50'
                      }`}
                    >
                      <td className="px-4 py-5 text-black dark:text-white">{u.email}</td>
                      <td className="px-4 py-5 text-black dark:text-white">{u.username}</td>
                      <td className="px-4 py-5 text-black dark:text-white">{u.credits ?? 0}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${
                            u.role === 'admin'
                              ? 'bg-primary bg-opacity-10 text-primary'
                              : 'bg-gray-2 text-body dark:bg-meta-4 dark:text-bodydark'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(u)}
                            disabled={forbidden}
                            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(u)}
                            disabled={forbidden || u.id === currentUser?.id}
                            className="text-meta-1 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50 px-4 py-5">
          <div className="w-full max-w-lg rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Edit user</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Email</label>
                <input
                  name="email"
                  required
                  defaultValue={editing.email}
                  type="email"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Username</label>
                <input
                  name="username"
                  required
                  defaultValue={editing.username}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Role</label>
                <select
                  name="role"
                  defaultValue={editing.role}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  New password <span className="text-body">(optional)</span>
                </label>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyUser && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50 px-4 py-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-history-title"
          onClick={() => setHistoryUser(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-stroke px-5 py-4 dark:border-strokedark">
              <div>
                <h3 id="user-history-title" className="text-lg font-semibold text-black dark:text-white">
                  User history
                </h3>
                <p className="mt-1 text-sm text-body dark:text-bodydark">
                  {historyUser.email} · {historyUser.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryUser(null)}
                className="rounded border border-stroke px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {historyLoading && (
                <p className="py-8 text-center text-body dark:text-bodydark">Loading history…</p>
              )}
              {!historyLoading && historyError && (
                <p className="rounded-sm border border-meta-1 bg-meta-1 bg-opacity-10 px-4 py-3 text-sm text-meta-1">
                  {historyError}
                </p>
              )}
              {!historyLoading && !historyError && (
                <div className="flex flex-col gap-8">
                  <section>
                    <h4 className="mb-3 text-base font-semibold text-black dark:text-white">
                      Stripe credit purchases
                    </h4>
                    <div className="max-w-full overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                      <table className="w-full table-auto text-sm">
                        <thead>
                          <tr className="bg-gray-2 text-left dark:bg-meta-4">
                            <th className="px-3 py-3 font-medium text-black dark:text-white">Credits</th>
                            <th className="px-3 py-3 font-medium text-black dark:text-white">Amount</th>
                            <th className="px-3 py-3 font-medium text-black dark:text-white">Status</th>
                            <th className="min-w-[180px] px-3 py-3 font-medium text-black dark:text-white">
                              Stripe session
                            </th>
                            <th className="min-w-[140px] px-3 py-3 font-medium text-black dark:text-white">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyCreditTx.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-body dark:text-bodydark">
                                No credit purchases
                              </td>
                            </tr>
                          ) : (
                            historyCreditTx.map((t) => (
                              <tr key={t.id} className="border-t border-stroke dark:border-strokedark">
                                <td className="px-3 py-3 text-black dark:text-white">{t.credits}</td>
                                <td className="px-3 py-3 text-black dark:text-white">
                                  {formatMoney(t.amountCents, t.currency)}
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                      t.status === 'completed'
                                        ? 'bg-success bg-opacity-15 text-success'
                                        : t.status === 'pending'
                                          ? 'bg-warning bg-opacity-15 text-warning'
                                          : 'bg-meta-1 bg-opacity-15 text-meta-1'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </td>
                                <td className="max-w-[220px] truncate px-3 py-3 font-mono text-xs text-body dark:text-bodydark">
                                  {t.stripeCheckoutSessionId ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-body dark:text-bodydark">{formatDate(t.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section>
                    <h4 className="mb-3 text-base font-semibold text-black dark:text-white">
                      Shop &amp; revive (credits spent)
                    </h4>
                    <div className="max-w-full overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                      <table className="w-full table-auto text-sm">
                        <thead>
                          <tr className="bg-gray-2 text-left dark:bg-meta-4">
                            <th className="px-3 py-3 font-medium text-black dark:text-white">Type</th>
                            <th className="px-3 py-3 font-medium text-black dark:text-white">Credits</th>
                            <th className="min-w-[160px] px-3 py-3 font-medium text-black dark:text-white">Details</th>
                            <th className="min-w-[140px] px-3 py-3 font-medium text-black dark:text-white">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyShop.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-body dark:text-bodydark">
                                No shop or revive purchases
                              </td>
                            </tr>
                          ) : (
                            historyShop.map((p) => (
                              <tr key={p.id} className="border-t border-stroke dark:border-strokedark">
                                <td className="px-3 py-3 text-black dark:text-white">{shopTypeLabel(p.type)}</td>
                                <td className="px-3 py-3 text-black dark:text-white">{p.creditsSpent}</td>
                                <td className="max-w-md break-all px-3 py-3 font-mono text-xs text-body dark:text-bodydark">
                                  {formatMeta(p.meta)}
                                </td>
                                <td className="px-3 py-3 text-body dark:text-bodydark">{formatDate(p.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50 px-4 py-5">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">Delete user?</h3>
            <p className="mb-6 text-sm text-body dark:text-bodydark">
              This will permanently remove <strong>{deleting.username}</strong> ({deleting.email}).
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete()}
                disabled={saving}
                className="rounded bg-meta-1 px-4 py-2 text-sm text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
