import { Router } from 'express';
import College from '../models/College.js';
import Hostel from '../models/Hostel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CATEGORIES, BUSINESS_SEGMENTS, CONDITIONS } from '../config/constants.js';

const r = Router();

// public: needed on the registration form
r.get('/colleges', asyncHandler(async (_req, res) => {
  const colleges = await College.find({ isActive: true }).select('name code city').sort('name').lean();
  res.json({ success: true, colleges });
}));

r.get('/colleges/:id/hostels', asyncHandler(async (req, res) => {
  const filter = { college: req.params.id, isActive: true };
  if (['boys', 'girls'].includes(req.query.gender)) filter.gender = req.query.gender;
  const hostels = await Hostel.find(filter).select('name gender').sort('name').lean();
  res.json({ success: true, hostels });
}));

r.get('/taxonomy', (_req, res) =>
  res.json({ success: true, categories: CATEGORIES, segments: BUSINESS_SEGMENTS, conditions: CONDITIONS })
);

export default r;
