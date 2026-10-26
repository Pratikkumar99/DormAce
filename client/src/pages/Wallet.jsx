import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  QrCode,
  Hash,
  Banknote,
  ShieldAlert,
} from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Avatar,
  Field,
  Modal,
  PageLoader,
  Pagination,
  Spinner,
} from '../components/ui/index.jsx';
import { inrPaise, ago, cx } from '../lib/format.js';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const LABEL = {
  topup: 'Added to wallet',
  transfer_in: 'Received',
  transfer_out: 'Paid',
  withdraw: 'Withdrawal',
  withdraw_refund: 'Withdrawal refunded',
};

const IN = ['topup', 'transfer_in', 'withdraw_refund'];

export default function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [code, setCode] = useState('');
  const [found, setFound] = useState(null);
  const [myCode, setMyCode] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['wallet', page],
    placeholderData: (p) => p,
    queryFn: async () =>
      (await api.get('/wallet', { params: { page } })).data,
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ['wallet'] });

  const close = () => {
    setModal(null);
    setAmount('');
    setCode('');
    setFound(null);
    setMyCode(null);
  };

  const topup = useMutation({
    mutationFn: async () => {
      if (!(await loadRazorpay())) {
        throw new Error('Could not load Razorpay. Check your connection.');
      }

      const { data: o } = await api.post('/wallet/topup/order', {
        amount: Number(amount),
      });

      await new Promise((resolve, reject) => {
        const rz = new window.Razorpay({
          key: o.keyId,
          amount: o.amount,
          currency: o.currency,
          order_id: o.orderId,
          name: 'DormAce',
          description: 'Wallet top-up',
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone,
          },
          theme: { color: '#000000' },
          handler: async (res) => {
            try {
              await api.post('/wallet/topup/verify', res);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });

        rz.on('payment.failed', (r) =>
          reject(new Error(r.error?.description || 'Payment failed')),
        );

        rz.open();
      });
    },
    onSuccess: () => {
      toast.success('Money added');
      refresh();
      close();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const lookup = useMutation({
    mutationFn: async () =>
      (await api.get('/wallet/code', { params: { code } })).data.request,
    onSuccess: setFound,
    onError: (e) => toast.error(errMsg(e)),
  });

  const payCode = useMutation({
    mutationFn: () => api.post('/wallet/pay-code', { code }),
    onSuccess: () => {
      toast.success('Paid');
      refresh();
      close();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const receive = useMutation({
    mutationFn: async () =>
      (await api.post('/wallet/requests', { amount: Number(amount) })).data.request,
    onSuccess: setMyCode,
    onError: (e) => toast.error(errMsg(e)),
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api.post('/wallet/withdraw', {
        amount: Number(amount),
        upiId: upi,
      }),
    onSuccess: () => {
      toast.success('Withdrawal requested');
      refresh();
      close();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  const L = data.limits;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h-page mb-6">Wallet</h1>

      <div className="rounded-2xl bg-black p-6 text-white dark:bg-neutral-900 dark:ring-1 dark:ring-neutral-800">
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Available balance
        </p>

        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {inrPaise(data.balance)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['topup', Plus, 'Add money'],
            ['code', Hash, 'Pay by code'],
            ['receive', QrCode, 'Receive'],
            ['withdraw', Banknote, 'Withdraw'],
          ].map(([k, I, l]) => (
            <button
              key={k}
              onClick={() => setModal(k)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 py-3 text-xs font-medium transition hover:bg-white/20"
            >
              <I className="h-5 w-5" />
              {l}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Wallet money can only be used between verified students of your
        college. Max balance {inrPaise(L.MAX_BALANCE * 100)}, daily
        transfers up to {inrPaise(L.DAILY_TRANSFER_LIMIT * 100)}. You can
        also pay from inside any chat.
      </p>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Activity
      </h2>

      {!data.transactions.length ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No transactions yet.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {data.transactions.map((t) => (
            <li key={t._id} className="flex items-center gap-3 p-3.5">
              {t.counterparty ? (
                <Avatar user={t.counterparty} size={38} />
              ) : (
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {IN.includes(t.type) ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {t.counterparty
                    ? `${LABEL[t.type]} ${
                        t.type === 'transfer_in' ? 'from' : 'to'
                      } ${t.counterparty.name}`
                    : LABEL[t.type]}
                </p>

                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {ago(t.createdAt)}
                  {t.note ? ` · ${t.note}` : ''}
                  {t.status !== 'success' ? ` · ${t.status}` : ''}
                </p>
              </div>

              <p
                className={cx(
                  'text-sm font-semibold text-neutral-900 dark:text-neutral-100',
                  t.status === 'failed' && 'line-through opacity-40',
                )}
              >
                {IN.includes(t.type) ? '+' : '−'}
                {inrPaise(t.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />

      <Modal open={modal === 'topup'} onClose={close} title="Add money">
        {!data.razorpayEnabled && (
          <p className="mb-3 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Payments aren’t configured on this server yet (missing Razorpay
            keys).
          </p>
        )}

        <Field label="Amount (₹)" hint={`₹${L.MIN_TOPUP} – ₹${L.MAX_TOPUP}`}>
          <input
            className="input text-2xl font-semibold"
            inputMode="numeric"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/\D/g, ''))
            }
          />
        </Field>

        <div className="mt-3 flex gap-2">
          {[100, 200, 500, 1000].map((a) => (
            <button
              key={a}
              className="chip py-1.5 hover:border-black dark:hover:border-neutral-400"
              onClick={() => setAmount(String(a))}
            >
              ₹{a}
            </button>
          ))}
        </div>

        <button
          className="btn-primary mt-5 w-full py-3"
          disabled={!Number(amount) || topup.isPending}
          onClick={() => topup.mutate()}
        >
          {topup.isPending ? (
            <Spinner />
          ) : (
            `Pay ₹${amount || ''} with Razorpay`
          )}
        </button>
      </Modal>

      <Modal open={modal === 'code'} onClose={close} title="Pay by code">
        {!found ? (
          <>
            <Field
              label="6-digit code"
              hint="Ask the person you’re paying to show their code"
            >
              <input
                className="input text-center text-2xl font-semibold tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, ''))
                }
              />
            </Field>

            <button
              className="btn-primary mt-5 w-full py-3"
              disabled={code.length !== 6 || lookup.isPending}
              onClick={() => lookup.mutate()}
            >
              {lookup.isPending ? <Spinner /> : 'Continue'}
            </button>
          </>
        ) : (
          <div className="text-center">
            <Avatar user={found.payee} size={56} className="mx-auto" />

            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              You’re paying{' '}
              <b className="text-black dark:text-white">
                {found.payee.name}
              </b>
            </p>

            <p className="my-2 text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
              {inrPaise(found.amount)}
            </p>

            {found.note && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {found.note}
              </p>
            )}

            <button
              className="btn-primary mt-5 w-full py-3"
              disabled={payCode.isPending}
              onClick={() => payCode.mutate()}
            >
              {payCode.isPending ? <Spinner /> : 'Confirm & pay'}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={modal === 'receive'} onClose={close} title="Receive in person">
        {!myCode ? (
          <>
            <Field label="Amount (₹)">
              <input
                className="input text-2xl font-semibold"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, ''))
                }
              />
            </Field>

            <button
              className="btn-primary mt-5 w-full py-3"
              disabled={!Number(amount) || receive.isPending}
              onClick={() => receive.mutate()}
            >
              {receive.isPending ? <Spinner /> : 'Generate code'}
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ask them to open{' '}
              <b className="text-black dark:text-white">
                Wallet → Pay by code
              </b>
            </p>

            <p className="my-4 text-5xl font-semibold tracking-[0.2em] text-neutral-900 dark:text-neutral-100">
              {myCode.code}
            </p>

            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {inrPaise(myCode.amount)}
            </p>

            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              Valid for 15 minutes. One use only.
            </p>

            <button
              className="btn-outline mt-5 w-full"
              onClick={() => {
                api.post(`/wallet/requests/${myCode._id}/cancel`).catch(() => {});
                close();
              }}
            >
              Cancel code
            </button>
          </div>
        )}
      </Modal>

      <Modal open={modal === 'withdraw'} onClose={close} title="Withdraw to UPI">
        <div className="space-y-4">
          <Field
            label="Amount (₹)"
            hint={`Minimum ₹${L.MIN_WITHDRAW}`}
          >
            <input
              className="input"
              inputMode="numeric"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/\D/g, ''))
              }
            />
          </Field>

          <Field label="UPI ID">
            <input
              className="input"
              placeholder="name@bank"
              value={upi}
              onChange={(e) => setUpi(e.target.value.trim())}
            />
          </Field>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Withdrawals are reviewed and paid manually, usually within 1–2
            working days.
          </p>

          <button
            className="btn-primary w-full py-3"
            disabled={!Number(amount) || !upi || withdraw.isPending}
            onClick={() => withdraw.mutate()}
          >
            {withdraw.isPending ? <Spinner /> : 'Request withdrawal'}
          </button>
        </div>
      </Modal>
    </div>
  );
}