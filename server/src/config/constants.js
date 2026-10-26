// Single source of truth for marketplace taxonomy. Served to the client via /api/catalog.
export const GENDERS = ['boys', 'girls'];

export const CATEGORIES = [
  { slug: 'furniture', name: 'Furniture & Room', sub: ['Beds & Mattresses', 'Study Tables', 'Chairs', 'Shelves & Storage', 'Lamps & Lighting', 'Curtains & Decor'] },
  { slug: 'electronics', name: 'Electronics', sub: ['Laptops', 'Phones & Tablets', 'Headphones & Speakers', 'Chargers & Cables', 'Extension Boards', 'Calculators', 'Monitors & Peripherals'] },
  { slug: 'books', name: 'Books & Study', sub: ['Textbooks', 'Notes & Handwritten', 'Competitive Exams', 'Stationery', 'Lab Coats & Drafters', 'Novels'] },
  { slug: 'clothing', name: 'Clothing & Fashion', sub: ['Casual Wear', 'Ethnic Wear', 'Formals', 'Footwear', 'Winter Wear', 'Bags & Accessories'] },
  { slug: 'appliances', name: 'Kitchen & Appliances', sub: ['Kettles & Induction', 'Mini Fridge', 'Coolers & Fans', 'Irons', 'Utensils', 'Water Bottles & Flasks'] },
  { slug: 'food', name: 'Food & Snacks', sub: ['Instant Noodles', 'Snacks', 'Beverages', 'Homemade', 'Groceries'] },
  { slug: 'sports', name: 'Sports & Fitness', sub: ['Cricket', 'Badminton', 'Gym Gear', 'Football & Others', 'Cycles'] },
  { slug: 'essentials', name: 'Hostel Essentials', sub: ['Buckets & Mugs', 'Hangers & Hooks', 'Locks', 'Bedsheets & Pillows', 'Cleaning', 'Toiletries'] },
  { slug: 'services', name: 'Services', sub: ['Tutoring', 'Printing & Xerox', 'Laundry', 'Repairs', 'Design & Dev', 'Haircut & Grooming'] },
  { slug: 'other', name: 'Other', sub: ['Miscellaneous'] },
];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export const BUSINESS_SEGMENTS = [
  { slug: 'food', name: 'Food & Cafe' },
  { slug: 'grocery', name: 'Grocery & Daily Needs' },
  { slug: 'laundry', name: 'Laundry & Ironing' },
  { slug: 'printing', name: 'Printing & Stationery' },
  { slug: 'repair', name: 'Tech & Device Repair' },
  { slug: 'salon', name: 'Salon & Grooming' },
  { slug: 'tailoring', name: 'Tailoring & Alterations' },
  { slug: 'tutoring', name: 'Tutoring & Coaching' },
  { slug: 'fitness', name: 'Fitness & Wellness' },
  { slug: 'rental', name: 'Rentals' },
  { slug: 'other', name: 'Other' },
];
export const SEGMENT_SLUGS = BUSINESS_SEGMENTS.map((s) => s.slug);

export const CONDITIONS = ['new', 'like_new', 'good', 'fair'];
export const URGENCY = { now: 2 * 3600e3, today: 24 * 3600e3, week: 7 * 24 * 3600e3 };

export const WALLET = {
  MIN_TOPUP: 10, // INR
  MAX_TOPUP: 10000,
  MAX_BALANCE: 20000,
  DAILY_TRANSFER_LIMIT: 10000,
  MIN_WITHDRAW: 100,
};
