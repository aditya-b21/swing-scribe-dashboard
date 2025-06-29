
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { password } = await req.json()

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Updating community password...')

    // First, check if the record exists
    const { data: existing } = await supabaseClient
      .from('community_settings')
      .select('*')
      .eq('key', 'community_password')
      .maybeSingle()

    let result;
    if (existing) {
      // Update existing record
      const { error } = await supabaseClient
        .from('community_settings')
        .update({ 
          password: password,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'community_password')
      
      result = { error }
    } else {
      // Insert new record
      const { error } = await supabaseClient
        .from('community_settings')
        .insert({
          key: 'community_password',
          password: password,
          updated_at: new Date().toISOString()
        })
      
      result = { error }
    }

    if (result.error) {
      console.error('Error updating password:', result.error)
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Password updated successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
