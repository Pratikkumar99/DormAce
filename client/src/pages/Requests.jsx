import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HandHelping, Plus, Search } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { useTaxonomy } from '../hooks/useTaxonomy.js';
import { useDebounce } from '../hooks/useDebounce.js';
import RequestCard from '../components/market/RequestCard.jsx';
import {
  EmptyState,
  Field,
  Modal,
  PageLoader,
  Pagination,
  Segmented,
  Spinner,
} from '../components/ui/index.jsx';

function NewRequest({ open, onClose }) {
  const qc = useQueryClient();
  const { categories } = useTaxonomy();

  const [f, setF] = useState({
    title: '',
    description: '',
    category: 'food',
    urgency: 'today',
    maxPrice: '',
    visibility: 'hostel',
  });

  const m = useMutation({
    mutationFn: () =>
      api.post('/requests', {
        ...f,
        maxPrice: f.maxPrice === '' ? undefined : Number(f.maxPrice),
      }),
    onSuccess: () => {
      toast.success('Request posted');
      qc.invalidateQueries({ queryKey: ['requests'] });
      setF({ ...f, title: '', description: '', maxPrice: '' });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="What do you need?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="space-y-4"
      >
        <Field label="I need…">
          <input
            className="input"
            required
            minLength={3}
            maxLength={100}
            autoFocus
            placeholder="e.g. 2 packets of Maggi"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>

        <Field label="Details (optional)">
          <textarea
            className="input"
            maxLength={600}
            rows={2}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              className="input"
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Budget ₹ (optional)">
            <input
              className="input"
              inputMode="numeric"
              value={f.maxPrice}
              onChange={(e) =>
                setF({
                  ...f,
                  maxPrice: e.target.value.replace(/\D/g, ''),
                })
              }
            />
          </Field>
        </div>

        <Field label="Needed">
          <Segmented
            value={f.urgency}
            onChange={(v) => setF({ ...f, urgency: v })}
            options={[
              { value: 'now', label: 'Right now' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
            ]}
          />
        </Field>

        <Field label="Ask">
          <Segmented
            value={f.visibility}
            onChange={(v) => setF({ ...f, visibility: v })}
            options={[
              { value: 'hostel', label: 'My hostel' },
              { value: 'college', label: 'All my hostels' },
            ]}
          />
        </Field>

        <button
          className="btn-primary w-full py-3"
          disabled={m.isPending}
        >
          {m.isPending ? <Spinner /> : 'Post request'}
        </button>
      </form>
    </Modal>
  );
}

export default function Requests() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [urgency, setUrgency] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const dq = useDebounce(q);

  const board = useQuery({
    queryKey: ['requests', dq, urgency, page],
    enabled: tab === 'all',
    placeholderData: (p) => p,
    queryFn: async () =>
      (
        await api.get('/requests', {
          params: {
            q: dq || undefined,
            urgency: urgency || undefined,
            page,
          },
        })
      ).data,
  });

  const mine = useQuery({
    queryKey: ['my-requests'],
    enabled: tab === 'mine',
    queryFn: async () => (await api.get('/requests/mine')).data.requests,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['requests'] });
    qc.invalidateQueries({ queryKey: ['my-requests'] });
  };

  const respond = useMutation({
    mutationFn: (id) => api.post(`/requests/${id}/respond`, {}),
    onSuccess: ({ data }) => nav(`/chat/${data.conversationId}`),
    onError: (e) => toast.error(errMsg(e)),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/requests/${id}/status`, { status }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/requests/${id}`),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  const list = tab === 'all' ? board.data?.requests : mine.data;
  const loading = tab === 'all' ? board.isLoading : mine.isLoading;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Requests</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Need something right now? Ask your hostel.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New request
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Open requests' },
            { value: 'mine', label: 'My requests' },
          ]}
        />

        {tab === 'all' && (
          <>
            <select
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500"
              value={urgency}
              onChange={(e) => {
                setUrgency(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any urgency</option>
              <option value="now">Right now</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
            </select>

            <div className="relative min-w-[160px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />

              <input
                className="input py-2 pl-9"
                placeholder="Search requests"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : !list?.length ? (
        <EmptyState
          icon={HandHelping}
          title={
            tab === 'all'
              ? 'No open requests'
              : 'You haven’t asked for anything'
          }
          text="Requests disappear automatically once they expire."
          action={
            <button
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              Post a request
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <RequestCard
              key={r._id}
              r={r}
              mine={tab === 'mine'}
              busy={respond.isPending}
              onRespond={() => respond.mutate(r._id)}
              onClose={(status) =>
                setStatus.mutate({ id: r._id, status })
              }
              onDelete={() => del.mutate(r._id)}
            />
          ))}
        </div>
      )}

      {tab === 'all' && (
        <Pagination
          page={board.data?.page || 1}
          pages={board.data?.pages}
          onChange={setPage}
        />
      )}

      <NewRequest open={open} onClose={() => setOpen(false)} />
    </div>
  );
}