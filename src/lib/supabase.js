import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function getAllData() {
  const { data, error } = await supabase
    .from('sync_data')
    .select('id, data, updated_at')
    .eq('id', 'alldata')
    .single()

  if (error) throw error
  return data?.data || {}
}

export async function updateAllData(newData) {
  const { error } = await supabase
    .from('sync_data')
    .update({ data: newData, updated_at: new Date().toISOString() })
    .eq('id', 'alldata')

  if (error) throw error
}
