import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, asset, errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useHostels, useTaxonomy } from '../hooks/useTaxonomy.js';
import { Field, PageLoader, Spinner } from '../components/ui/index.jsx';
import { cx } from '../lib/format.js';

export default function BusinessForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { segments } = useTaxonomy();
  const { data: hostels = [] } = useHostels(user.college?._id);

  const [f, setF] = useState({
    name: '',
    description: '',
    segment: '',
    phone: '',
    email: '',
    audience: 'both',
    timings: '',
    deliversToHostel: false,
    hostels: [],
  });

  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['business', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/businesses/${id}`)).data,
  });

  useEffect(() => {
    if (data?.business) {
      const b = data.business;

      setF({
        name: b.name,
        description: b.description,
        segment: b.segment,
        phone: b.phone || '',
        email: b.email || '',
        audience: b.audience,
        timings: b.timings || '',
        deliversToHostel: b.deliversToHostel,
        hostels: (b.hostels || []).map((h) => h._id),
      });
    }
  }, [data]);

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  const toggleHostel = (hid) =>
    setF({
      ...f,
      hostels: f.hostels.includes(hid)
        ? f.hostels.filter((x) => x !== hid)
        : [...f.hostels, hid],
    });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      const fd = new FormData();

      Object.entries(f).forEach(([k, v]) =>
        fd.append(
          k,
          k === 'hostels' ? JSON.stringify(v) : v
        )
      );

      if (logo) fd.append('logo', logo);
      if (banner) fd.append('banner', banner);

      const cfg = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };

      if (id) {
        await api.patch(`/businesses/${id}`, fd, cfg);
      } else {
        await api.post('/businesses', fd, cfg);
      }

      qc.invalidateQueries({ queryKey: ['my-businesses'] });
      qc.invalidateQueries({ queryKey: ['business', id] });

      toast.success(id ? 'Saved' : 'Submitted for approval');
      nav('/business');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (id && isLoading) return <PageLoader />;

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-2xl animate-fade-up space-y-5"
    >
      <div>
        <h1 className="h-page">
          {id ? 'Edit business' : 'Register your business'}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Our team reviews every business before it goes live.
        </p>
      </div>

      <Field label="Business name">
        <input
          className="input"
          required
          minLength={2}
          maxLength={80}
          value={f.name}
          onChange={set('name')}
        />
      </Field>

      <Field label="Segment">
        <select
          className="input"
          required
          value={f.segment}
          onChange={set('segment')}
        >
          <option value="">Select</option>
          {segments.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="About"
        hint="What you offer, prices, how to order"
      >
        <textarea
          className="input min-h-[120px]"
          required
          minLength={20}
          maxLength={1500}
          value={f.description}
          onChange={set('description')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)">
          <input
            className="input"
            inputMode="numeric"
            maxLength={10}
            value={f.phone}
            onChange={set('phone')}
          />
        </Field>

        <Field label="Business email">
          <input
            className="input"
            type="email"
            value={f.email}
            onChange={set('email')}
          />
        </Field>

        <Field label="Timings">
          <input
            className="input"
            placeholder="e.g. 9 AM – 10 PM"
            value={f.timings}
            onChange={set('timings')}
          />
        </Field>

        <Field label="Audience">
          <select
            className="input"
            value={f.audience}
            onChange={set('audience')}
          >
            <option value="both">Boys & girls hostels</option>
            <option value="boys">Boys hostels only</option>
            <option value="girls">Girls hostels only</option>
          </select>
        </Field>
      </div>

      <Field
        label="Hostels served"
        hint="Leave all unselected to serve every hostel in your college."
      >
        <div className="flex flex-wrap gap-2">
          {hostels
            .filter(
              (h) => f.audience === 'both' || h.gender === f.audience
            )
            .map((h) => (
              <button
                type="button"
                key={h._id}
                onClick={() => toggleHostel(h._id)}
                className={cx(
                  'chip py-1.5',
                  f.hostels.includes(h._id) &&
                    'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                )}
              >
                {h.name}
              </button>
            ))}
        </div>
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-black dark:accent-white"
          checked={f.deliversToHostel}
          onChange={(e) =>
            setF({ ...f, deliversToHostel: e.target.checked })
          }
        />
        I deliver to hostels
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo">
          {data?.business?.logo && !logo && (
            <img
              src={asset(data.business.logo)}
              alt=""
              className="mb-2 h-14 w-14 rounded-lg object-cover"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:text-neutral-300 dark:file:bg-neutral-800 dark:file:text-neutral-200"
            onChange={(e) => setLogo(e.target.files?.[0] || null)}
          />
        </Field>

        <Field label="Banner">
          {data?.business?.banner && !banner && (
            <img
              src={asset(data.business.banner)}
              alt=""
              className="mb-2 h-14 w-full rounded-lg object-cover"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:text-neutral-300 dark:file:bg-neutral-800 dark:file:text-neutral-200"
            onChange={(e) => setBanner(e.target.files?.[0] || null)}
          />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          className="btn-outline flex-1 py-3"
          onClick={() => nav(-1)}
        >
          Cancel
        </button>

        <button
          className="btn-primary flex-1 py-3"
          disabled={busy}
        >
          {busy ? (
            <Spinner />
          ) : id ? (
            'Save'
          ) : (
            'Submit for review'
          )}
        </button>
      </div>
    </form>
  );
}