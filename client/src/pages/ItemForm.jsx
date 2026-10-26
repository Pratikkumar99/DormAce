import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, errMsg } from '../lib/api.js';
import { useTaxonomy } from '../hooks/useTaxonomy.js';
import {
  Field,
  ImagePicker,
  PageLoader,
  Segmented,
  Spinner,
} from '../components/ui/index.jsx';

const EMPTY = {
  title: '',
  description: '',
  price: '',
  negotiable: false,
  category: '',
  subcategory: '',
  condition: 'good',
  visibility: 'college',
  businessId: '',
};

export default function ItemForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { categories, conditions } = useTaxonomy();

  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/items/${id}`)).data.item,
  });

  const { data: bizList = [] } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: async () => (await api.get('/businesses/mine')).data.businesses,
  });

  const activeBiz = bizList.filter((b) => b.status === 'active');

  useEffect(() => {
    if (item) {
      setF({
        title: item.title,
        description: item.description,
        price: String(item.price),
        negotiable: item.negotiable,
        category: item.category,
        subcategory: item.subcategory || '',
        condition: item.condition,
        visibility: item.visibility,
        businessId: item.business?._id || '',
      });
      setExisting(item.images);
    }
  }, [item]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const sub = categories.find((c) => c.slug === f.category)?.sub || [];

  const submit = async (e) => {
    e.preventDefault();

    const er = {};

    if (f.title.trim().length < 3) {
      er.title = 'Give it a clear title';
    }

    if (f.description.trim().length < 10) {
      er.description = 'Add at least a short description';
    }

    if (f.price === '' || Number(f.price) < 0) {
      er.price = 'Enter a price (0 for free)';
    }

    if (!f.category) {
      er.category = 'Pick a category';
    }

    if (files.length + existing.length < 1) {
      er.images = 'Add at least one photo';
    }

    setErrors(er);

    if (Object.keys(er).length) return;

    setBusy(true);

    try {
      const fd = new FormData();

      Object.entries(f).forEach(([k, v]) => {
        if (!(id && k === 'businessId')) {
          fd.append(k, v);
        }
      });

      files.forEach((file) => fd.append('images', file));

      if (id) {
        fd.append('keepImages', JSON.stringify(existing));
      }

      const cfg = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };

      const { data } = id
        ? await api.patch(`/items/${id}`, fd, cfg)
        : await api.post('/items', fd, cfg);

      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['my-items'] });
      qc.invalidateQueries({ queryKey: ['item', id] });

      toast.success(id ? 'Listing updated' : 'Listed!');
      nav(`/item/${data.item._id}`);
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
      <h1 className="h-page">
        {id ? 'Edit listing' : 'Sell something'}
      </h1>

      <Field
        label="Photos"
        error={errors.images}
        hint="Up to 5. The first photo is the cover."
      >
        <ImagePicker
          files={files}
          setFiles={setFiles}
          existing={existing}
          setExisting={setExisting}
        />
      </Field>

      <Field label="Title" error={errors.title}>
        <input
          className="input"
          maxLength={120}
          placeholder="e.g. Study table with drawer"
          value={f.title}
          onChange={set('title')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={errors.category}>
          <select
            className="input"
            value={f.category}
            onChange={(e) =>
              setF({
                ...f,
                category: e.target.value,
                subcategory: '',
              })
            }
          >
            <option value="">Select</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sub-category">
          <select
            className="input disabled:cursor-not-allowed disabled:opacity-50"
            value={f.subcategory}
            onChange={set('subcategory')}
            disabled={!sub.length}
          >
            <option value="">Optional</option>
            {sub.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Price (₹)" error={errors.price}>
          <input
            className="input"
            inputMode="numeric"
            value={f.price}
            onChange={(e) =>
              setF({
                ...f,
                price: e.target.value.replace(/\D/g, ''),
              })
            }
          />
        </Field>

        <Field label="Condition">
          <select
            className="input"
            value={f.condition}
            onChange={set('condition')}
          >
            {conditions.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description" error={errors.description}>
        <textarea
          className="input min-h-[120px] resize-y"
          maxLength={2000}
          placeholder="Age, brand, why you’re selling, any defects…"
          value={f.description}
          onChange={set('description')}
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-black dark:accent-white"
          checked={f.negotiable}
          onChange={(e) =>
            setF({ ...f, negotiable: e.target.checked })
          }
        />
        Price is negotiable
      </label>

      {!f.businessId && (
        <Field
          label="Who can see this?"
          hint="Always limited to verified students of your college and hostel group."
        >
          <Segmented
            value={f.visibility}
            onChange={(v) => setF({ ...f, visibility: v })}
            options={[
              { value: 'college', label: 'All my hostels' },
              { value: 'hostel', label: 'Only my hostel' },
            ]}
          />
        </Field>
      )}

      {!id && activeBiz.length > 0 && (
        <Field
          label="Post as"
          hint="Business listings are visible to your business’s audience."
        >
          <select
            className="input"
            value={f.businessId}
            onChange={set('businessId')}
          >
            <option value="">Myself</option>
            {activeBiz.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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
            'Save changes'
          ) : (
            'Publish'
          )}
        </button>
      </div>
    </form>
  );
}