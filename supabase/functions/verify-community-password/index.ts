
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
      throw new Error('Password is required')
    }

    console.log('Verifying community password...')

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

    // If no password is set in DB, use default and set it
    let storedPassword = data?.password
    
    if (!storedPassword) {
      console.log('No password in database, setting and using default')
      // Set the default password in the database
      const { error: insertError } = await supabaseClient
        .from('community_settings')
        .insert({
          key: 'community_password',
          password: 'SwingScribe1234@'
        })
      
      if (insertError) {
        console.error('Error setting default password:', insertError)
      }
      
      storedPassword = 'SwingScribe1234@'
    }

    const isValid = storedPassword === password

    console.log('Password verification result:', isValid)
    console.log('Stored password:', storedPassword)
    console.log('Provided password:', password)

    return new Response(
      JSON.stringify({ valid: isValid }),
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
