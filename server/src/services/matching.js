import Request from '../models/Request.js';
import { notify } from './notify.js';

// When a new listing is posted, ping people whose open requests look like a match.
export async function notifyMatchingRequests(item) {
  try {
    const filter = {
      college: item.college,
      status: 'open',
      expiresAt: { $gt: new Date() },
      requester: { $ne: item.seller },
      $text: { $search: item.title },
      $or: [{ visibility: 'college' }, { visibility: 'hostel', hostel: item.hostel }],
    };
    if (item.gender !== 'both') filter.gender = item.gender;
    const matches = await Request.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .lean();
    await Promise.all(
      matches
        .filter((m) => m.score >= 1)
        .map((m) =>
          notify(m.requester, {
            type: 'request_match',
            title: 'Someone listed what you need',
            body: `"${item.title}" might match your request "${m.title}"`,
            link: `/item/${item._id}`,
          })
        )
    );
  } catch (e) {
    console.error('matching failed', e.message);
  }
}
