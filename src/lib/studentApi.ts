import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/database'

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('s_no', { ascending: true })

  if (error) throw error
  return data as Project[]
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Project | null
}

export async function getProjectDomains(): Promise<string[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('domain')
    .not('domain', 'is', null)

  if (error) throw error
  return [...new Set(data.map((p) => p.domain).filter(Boolean))].sort() as string[]
}
