import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://idejmgmftmrniviftcce.supabase.co'
const SUPABASE_KEY = 'sb_publishable_AvMTa-zmQ4hgA1hJNpYc3g_gu8rlirz'

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
