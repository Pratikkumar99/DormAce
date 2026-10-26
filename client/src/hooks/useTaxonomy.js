import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useTaxonomy() {
  const { data } = useQuery({
    queryKey: ['taxonomy'],
    queryFn: async () => (await api.get('/catalog/taxonomy')).data,
    staleTime: Infinity,
  });
  const categories = data?.categories || [];
  return {
    categories,
    segments: data?.segments || [],
    conditions: data?.conditions || [],
    catName: (slug) => categories.find((c) => c.slug === slug)?.name || slug,
    segName: (slug) => data?.segments?.find((s) => s.slug === slug)?.name || slug,
  };
}

export function useHostels(collegeId, gender) {
  return useQuery({
    queryKey: ['hostels', collegeId, gender],
    enabled: !!collegeId,
    staleTime: 10 * 60_000,
    queryFn: async () => (await api.get(`/catalog/colleges/${collegeId}/hostels`, { params: gender ? { gender } : {} })).data.hostels,
  });
}
