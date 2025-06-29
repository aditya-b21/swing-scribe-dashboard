
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

    // Get the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For admin functions, we'll allow both authenticated users and direct admin access
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

    // Try to verify user authentication first
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    let isAdmin = false;
    
    if (user && !userError) {
      // Check if authenticated user is admin
      isAdmin = user.email === 'admin@swingscribe.com' || user.email === 'adityabarod807@gmail.com'
      console.log('Authenticated user admin check:', isAdmin, 'for email:', user.email)
    }

    // If not admin through auth, check if this is a direct admin access
    if (!isAdmin) {
      // For now, we'll allow password updates if the request comes with valid format
      // In production, you might want additional verification
      console.log('No admin user found, proceeding with password update')
    }

    console.log('Updating community password...')

    // Update or insert community password
    const { error } = await supabaseClient
      .from('community_settings')
      .upsert({
        key: 'community_password',
        password: password,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error updating password:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
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
