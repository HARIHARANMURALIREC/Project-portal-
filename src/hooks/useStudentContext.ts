import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { useAuth } from '@/hooks/useAuth'
import type { Batch, Project, Team } from '@/types/database'
import type { StudentContext } from '@/types/student'

export function useStudentContext() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['student-context', profile?.id],
    queryFn: async (): Promise<StudentContext | null> => {
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('*, teams (*, batches (*), projects!teams_selected_project_id_fkey (*))')
        .eq('user_id', profile!.id)
        .single()

      if (memberError || !member) {
        console.error('Student context error:', memberError)
        return null
      }

      const team = member.teams as Team & {
        batches: Batch
        projects: Project | null
      }

      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .order('reg_no')

      const { data: settings } = await supabase
        .from('portal_settings')
        .select('selection_blocked')
        .eq('id', 1)
        .maybeSingle()

      return {
        team,
        members: members ?? [],
        batch: team.batches,
        selectedProject: team.projects,
        selectionBlocked: settings?.selection_blocked ?? false,
      }
    },
    enabled: !!profile?.id,
    refetchInterval: POLL_INTERVALS.studentContext,
    refetchOnWindowFocus: true,
  })
}
