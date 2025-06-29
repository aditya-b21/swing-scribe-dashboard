
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

    console.log('Fetching community password...')

    // Get community password from settings
    const { data, error } = await supabaseClient
      .from('community_settings')
      .select('password')
      .eq('key', 'community_password')
      .maybeSingle()

    if (error) {
      console.error('Error fetching password:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If no password is set, return the default and also set it in the database
    let currentPassword = data?.password || 'SwingScribe1234@'
    
    if (!data) {
      console.log('No password found in database, setting default...')
      // Set the default password in the database
      const { error: insertError } = await supabaseClient
        .from('community_settings')
        .insert({
          key: 'community_password',
          password: 'SwingScribe1234@'
        })
      
      if (insertError) {
        console.error('Error setting default password:', insertError)
      } else {
        console.log('Default password set successfully')
      }
      
      currentPassword = 'SwingScribe1234@'
    }

    console.log('Current password retrieved:', currentPassword)

    return new Response(
      JSON.stringify({ password: currentPassword }),
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
