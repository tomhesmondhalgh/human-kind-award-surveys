import { useQuery } from '@tanstack/react-query';
import { benchmarkLabel, benchmarkNote, fetchNationalBenchmarks } from '@/utils/benchmarks';

// Real national benchmarks, or null while there isn't enough data (the charts
// then show illustrative figures labelled as such).
export function useNationalBenchmarks() {
  const { data, isLoading } = useQuery({
    queryKey: ['national-benchmarks'],
    queryFn: fetchNationalBenchmarks,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const benchmarks = data ?? null;
  return {
    benchmarks,
    isLoading,
    isIllustrative: !benchmarks,
    label: benchmarkLabel(benchmarks),
    note: benchmarkNote(benchmarks),
  };
}
