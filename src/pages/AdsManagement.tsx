import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import PageTitle from '../components/PageTitle';
import { createAdRequest, deleteAdRequest, listAdsRequest, updateAdRequest, type AdRecord } from '../lib/api';

type AdDraft = {
  title: string;
  type: AdRecord['type'];
  placement: string;
  imageUrl: string;
  linkUrl: string;
  enabled: boolean;
  sortOrder: number;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function typeLabel(t: AdRecord['type']) {
  switch (t) {
    case 'banner':
      return 'Banner';
    case 'interstitial':
      return 'Interstitial';
    case 'rewarded':
      return 'Rewarded';
    case 'video':
      return 'Video';
    default:
      return t;
  }
}

export default function AdsManagement() {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const emptyDraft: AdDraft = useMemo(
    () => ({
      title: '',
      type: 'banner',
      placement: 'main',
      imageUrl: '',
      linkUrl: '',
      enabled: true,
      sortOrder: 0,
    }),
    []
  );

  const [modal, setModal] = useState<
    | null
    | {
        mode: 'create' | 'edit';
        adId?: string;
        draft: AdDraft;
      }
  >(null);

  const [deleting, setDeleting] = useState<AdRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const { ads: list } = await listAdsRequest();
      setAds(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load ads';
      if (msg.toLowerCase().includes('admin access')) {
        setForbidden(true);
      } else {
        toast.error(msg);
      }
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setModal({ mode: 'create', draft: emptyDraft });
  }

  function openEdit(ad: AdRecord) {
    setModal({
      mode: 'edit',
      adId: ad.id,
      draft: {
        title: ad.title,
        type: ad.type,
        placement: ad.placement,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl ?? '',
        enabled: ad.enabled,
        sortOrder: ad.sortOrder ?? 0,
      },
    });
  }

  async function saveAd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;

    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const type = String(form.get('type') ?? 'banner') as AdDraft['type'];
    const placement = String(form.get('placement') ?? '').trim();
    const imageUrl = String(form.get('imageUrl') ?? '').trim();
    const linkUrl = String(form.get('linkUrl') ?? '').trim();
    const enabled = form.get('enabled') === 'on';
    const sortOrderRaw = String(form.get('sortOrder') ?? '0');
    const sortOrder = Number(sortOrderRaw);

    if (!title || !placement || !imageUrl || !Number.isFinite(sortOrder)) {
      toast.error('Please fill required fields correctly');
      return;
    }

    const payload: Omit<AdRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      type,
      placement,
      imageUrl,
      linkUrl,
      enabled,
      sortOrder,
    };

    setSaving(true);
    try {
      if (modal.mode === 'create') {
        const { ad } = await createAdRequest(payload);
        setAds((prev) => [ad, ...prev]);
        toast.success('Ad created');
      } else {
        const { ad } = await updateAdRequest(modal.adId!, payload);
        setAds((prev) => prev.map((x) => (x.id === ad.id ? ad : x)));
        toast.success('Ad updated');
      }
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteAdRequest(deleting.id);
      setAds((prev) => prev.filter((a) => a.id !== deleting.id));
      toast.success('Ad deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="Ads management | Cross Road Admin" />
      <Breadcrumb pageName="Ads management" />

      {forbidden && (
        <div className="mb-6 rounded-sm border border-warning bg-warning bg-opacity-10 px-4 py-3 text-black dark:text-white">
          <p className="font-medium">You need an administrator account</p>
          <p className="mt-1 text-sm text-body dark:text-bodydark">Ads management requires admin role.</p>
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-4 px-4 py-6 md:px-6 xl:px-7.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xl font-semibold text-black dark:text-white">Ads</h4>
            <button
              type="button"
              onClick={openCreate}
              disabled={forbidden}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              Add ad
            </button>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="min-w-[160px] px-4 py-4 font-medium text-black dark:text-white">Title</th>
                  <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Type</th>
                  <th className="min-w-[140px] px-4 py-4 font-medium text-black dark:text-white">Placement</th>
                  <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Enabled</th>
                  <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Sort</th>
                  <th className="min-w-[160px] px-4 py-4 font-medium text-black dark:text-white">Created</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      Loading…
                    </td>
                  </tr>
                ) : ads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-body dark:text-bodydark">
                      {forbidden ? 'No data' : 'No ads found'}
                    </td>
                  </tr>
                ) : (
                  ads.map((ad) => (
                    <tr key={ad.id} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-5 text-black dark:text-white">{ad.title}</td>
                      <td className="px-4 py-5 text-black dark:text-white">{typeLabel(ad.type)}</td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">{ad.placement}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${
                            ad.enabled ? 'bg-success bg-opacity-15 text-success' : 'bg-gray-2 text-body dark:bg-meta-4 dark:text-bodydark'
                          }`}
                        >
                          {ad.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">{ad.sortOrder}</td>
                      <td className="px-4 py-5 text-body dark:text-bodydark">{formatDate(ad.createdAt)}</td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(ad)}
                            disabled={forbidden}
                            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(ad)}
                            disabled={forbidden}
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

      {modal && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50 px-4 py-5"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              {modal.mode === 'create' ? 'Create ad' : 'Edit ad'}
            </h3>

            <form onSubmit={saveAd} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Title</label>
                <input
                  name="title"
                  required
                  defaultValue={modal.draft.title}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Type</label>
                <select
                  name="type"
                  defaultValue={modal.draft.type}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                >
                  <option value="banner">banner</option>
                  <option value="interstitial">interstitial</option>
                  <option value="rewarded">rewarded</option>
                  <option value="video">video</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Placement</label>
                <input
                  name="placement"
                  required
                  defaultValue={modal.draft.placement}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Image URL</label>
                <input
                  name="imageUrl"
                  required
                  defaultValue={modal.draft.imageUrl}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Link URL (optional)</label>
                <input
                  name="linkUrl"
                  defaultValue={modal.draft.linkUrl}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-black dark:text-white">Enabled</label>
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={modal.draft.enabled}
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">Sort order</label>
                <input
                  name="sortOrder"
                  type="number"
                  step={1}
                  defaultValue={modal.draft.sortOrder}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              {modal.draft.imageUrl ? (
                <div className="rounded border border-stroke p-3">
                  <p className="mb-2 text-sm text-body dark:text-bodydark">Preview</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                  {/* Image may be blocked by CORS; it's only a preview. */}
                  <img
                    src={modal.draft.imageUrl}
                    alt="ad preview"
                    className="max-h-32 w-auto rounded object-contain"
                  />
                </div>
              ) : null}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
                  disabled={saving}
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

      {deleting && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50 px-4 py-5">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">Delete ad?</h3>
            <p className="mb-6 text-sm text-body dark:text-bodydark">
              This will permanently remove <strong>{deleting.title}</strong>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
                disabled={saving}
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

