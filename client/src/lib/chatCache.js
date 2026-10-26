// Messages are cached as infinite-query pages: pages[0] is the newest page.
export function appendMessage(qc, msg) {
  const key = ['messages', String(msg.conversation)];
  qc.setQueryData(key, (old) => {
    if (!old) return old;
    if (old.pages.some((p) => p.messages.some((x) => x._id === msg._id))) return old;
    const pages = [...old.pages];
    pages[0] = { ...pages[0], messages: [...pages[0].messages, msg] };
    return { ...old, pages };
  });
  // payment cards show live status, so refetch when money moves
  if (msg.type === 'payment') qc.invalidateQueries({ queryKey: key });
}
