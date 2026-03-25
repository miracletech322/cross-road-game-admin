import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import PageTitle from '../components/PageTitle';
import { listCreditTransactionsRequest, type CreditTransaction } from '../lib/api';

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

export default function CreditTransactions() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const { transactions: list } = await listCreditTransactionsRequest();
      setTransactions(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      if (msg.toLowerCase().includes('admin')) {
        setForbidden(true);
      } else {
        toast.error(msg);
      }
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageTitle title="Credit transactions | Cross Road Admin" />
      <Breadcrumb pageName="Credit transactions" />

      <p className="mb-6 text-sm text-body dark:text-bodydark">
        Payments are started from the Unity game via <code className="text-primary">POST /api/credits/checkout-session</code>.
        This page is read-only for reviewing purchases.
      </p>

      {forbidden && (
        <div className="mb-6 rounded-sm border border-warning bg-warning bg-opacity-10 px-4 py-3 text-black dark:text-white">
          <p className="font-medium">Transaction list is admin-only</p>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Sign in with an administrator account to view credit transaction history.
          </p>
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-4 px-4 py-6 md:px-6 xl:px-7.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xl font-semibold text-black dark:text-white">Credit transactions</h4>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading || forbidden}
              className="inline-flex items-center justify-center rounded-md border border-stroke px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 dark:border-strokedark dark:hover:bg-meta-4"
            >
              Refresh
            </button>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="min-w-[220px] px-4 py-4 font-medium text-black dark:text-white">User</th>
                  <th className="min-w-[80px] px-4 py-4 font-medium text-black dark:text-white">Credits</th>
                  <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">Amount</th>
                  <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">Status</th>
                  <th className="min-w-[200px] px-4 py-4 font-medium text-black dark:text-white">Stripe session</th>
                  <th className="min-w-[160px] px-4 py-4 font-medium text-black dark:text-white">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      Loading…
                    </td>
                  </tr>
                ) : forbidden ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      —
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-5 text-black dark:text-white">
                        {t.user ? (
                          <>
                            <div>{t.user.email}</div>
                            <div className="text-sm text-body dark:text-bodydark">{t.user.username}</div>
                          </>
                        ) : (
                          t.userId
                        )}
                      </td>
                      <td className="px-4 py-5 text-black dark:text-white">{t.credits}</td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">
                        {formatMoney(t.amountCents, t.currency)}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${
                            t.status === 'completed'
                              ? 'bg-primary bg-opacity-10 text-primary'
                              : t.status === 'pending'
                                ? 'bg-warning bg-opacity-10 text-warning'
                                : 'bg-gray-2 text-body dark:bg-meta-4 dark:text-bodydark'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 font-mono text-xs text-body dark:text-bodydark">
                        {t.stripeCheckoutSessionId ?? '—'}
                      </td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">{formatDate(t.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
