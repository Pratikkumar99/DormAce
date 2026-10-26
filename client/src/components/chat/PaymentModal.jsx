import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { api, errMsg } from '../../lib/api.js';
import { Field, Modal, Segmented, Spinner } from '../ui/index.jsx';

export default function PaymentModal({
  open,
  onClose,
  conversationId,
  otherName,
}) {
  const qc = useQueryClient();

  const [mode, setMode] = useState('send');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const m = useMutation({
    mutationFn: () =>
      api.post(
        mode === 'send' ? '/wallet/transfer' : '/wallet/requests',
        {
          conversationId,
          amount: Number(amount),
          note: note || undefined,
        },
      ),

    onSuccess: () => {
      toast.success(
        mode === 'send' ? `Sent ₹${amount}` : 'Request sent',
      );

      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });

      setAmount('');
      setNote('');
      onClose();
    },

    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Money with ${otherName || 'user'}`}
    >
      <div className="text-neutral-900 dark:text-neutral-100">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'send', label: 'Send money' },
            { value: 'request', label: 'Request money' },
          ]}
        />

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <Field label="Amount (₹)">
            <input
              className="input text-2xl font-semibold"
              inputMode="numeric"
              autoFocus
              required
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/\D/g, ''))
              }
              placeholder="0"
            />
          </Field>

          <Field label="Note (optional)">
            <input
              className="input"
              maxLength={140}
              placeholder="e.g. For the kettle"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {mode === 'send'
              ? 'Money will be transferred from your wallet.'
              : 'A payment request will be sent to this user.'}
          </p>

          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={!Number(amount) || m.isPending}
          >
            {m.isPending ? (
              <Spinner />
            ) : mode === 'send' ? (
              `Send ₹${amount || ''} from wallet`
            ) : (
              `Request ₹${amount || ''}`
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}