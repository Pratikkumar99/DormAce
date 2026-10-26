import { formatDistanceToNowStrict, format, isToday, isYesterday } from 'date-fns';

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const inrPaise = (p) => `₹${(Number(p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const ago = (d) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '');
export const timeLeft = (d) => {
  const ms = new Date(d) - Date.now();
  if (ms <= 0) return 'expired';
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m}m left` : m < 1440 ? `${Math.round(m / 60)}h left` : `${Math.round(m / 1440)}d left`;
};
export const dayLabel = (d) => (isToday(new Date(d)) ? 'Today' : isYesterday(new Date(d)) ? 'Yesterday' : format(new Date(d), 'd MMM yyyy'));
export const clock = (d) => format(new Date(d), 'h:mm a');
export const CONDITION = { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair' };
export const URGENCY = { now: 'Right now', today: 'Today', week: 'This week' };
export const cx = (...a) => a.filter(Boolean).join(' ');
