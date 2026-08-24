/**
 * Dinner planner hooks — React Query wrappers around the local IndexedDB store.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dbDeleteDinnerPlan,
  dbListDinnerPlans,
  dbUpsertDinnerPlan,
} from '@/lib/db';
import type { DinnerPlan, DinnerPlanInput } from '@/types/local';

export function getDinnerPlansQueryKey() {
  return ['dinner-plans', 'list'];
}

export function useDinnerPlans() {
  return useQuery<DinnerPlan[]>({
    queryKey: getDinnerPlansQueryKey(),
    queryFn: () => dbListDinnerPlans(),
    staleTime: 0,
  });
}

export function useSaveDinnerPlan() {
  const queryClient = useQueryClient();
  return useMutation<DinnerPlan, Error, { data: DinnerPlanInput }>({
    mutationFn: ({ data }) => dbUpsertDinnerPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getDinnerPlansQueryKey() });
    },
  });
}

export function useDeleteDinnerPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => dbDeleteDinnerPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getDinnerPlansQueryKey() });
    },
  });
}
