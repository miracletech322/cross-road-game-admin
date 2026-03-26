import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import PageTitle from '../components/PageTitle';
import { listRankingRequest, type RankRow } from '../lib/api';

export default function Ranking() {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { ranking } = await listRankingRequest(100);
      setRows(ranking);
    } catch (e) {
      setRows([]);
      toast.error(e instanceof Error ? e.message : 'Failed to load ranking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageTitle title="Ranking | Cross Road Admin" />
      <Breadcrumb pageName="Ranking" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-4 px-4 py-6 md:px-6 xl:px-7.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xl font-semibold text-black dark:text-white">Leaderboard</h4>
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
                  <th className="min-w-[80px] px-4 py-4 font-medium text-black dark:text-white">Rank</th>
                  <th className="min-w-[200px] px-4 py-4 font-medium text-black dark:text-white">Username</th>
                  <th className="min-w-[220px] px-4 py-4 font-medium text-black dark:text-white">User ID</th>
                  <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Max score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      No ranking data
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.userId} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-5 text-black dark:text-white">{r.rank}</td>
                      <td className="px-4 py-5 text-black dark:text-white">{r.username}</td>
                      <td className="px-4 py-5 font-mono text-xs text-body dark:text-bodydark">{r.userId}</td>
                      <td className="px-4 py-5 text-black dark:text-white">{r.maxScore}</td>
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
