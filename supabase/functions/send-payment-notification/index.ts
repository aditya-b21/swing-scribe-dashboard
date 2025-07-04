
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  userName: string;
  userEmail: string;
  utrReference: string;
  paymentAmount: number;
  finalAmount: number;
  couponCode?: string;
  discountAmount?: number;
  paymentProofUrl?: string;
  submissionTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing payment notification...");
    
    const {
      userName,
      userEmail,
      utrReference,
      paymentAmount,
      finalAmount,
      couponCode,
      discountAmount,
      paymentProofUrl,
      submissionTime,
    }: PaymentNotificationRequest = await req.json();

    const discountText = couponCode 
      ? `<p><strong>Coupon Applied:</strong> ${couponCode} (₹${discountAmount} discount)</p>`
      : '';

    const proofText = paymentProofUrl 
      ? `<p><strong>Payment Proof:</strong> <a href="${paymentProofUrl}" target="_blank" style="color: #1e40af;">View Screenshot</a></p>`
      : '<p><strong>Payment Proof:</strong> Not provided</p>';

    // Send to your Gmail immediately
    const emailResponse = await resend.emails.send({
      from: "SwingScribe Payment <onboarding@resend.dev>",
      to: ["adityatradedition@gmail.com"],
      subject: `🚨 URGENT: New Payment Received - ₹${finalAmount} from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">💰 New Payment Received!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">₹${finalAmount} - Immediate Action Required</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #334155; margin-top: 0; color: #10b981;">Customer Details</h2>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Submission Time:</strong> ${submissionTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h2 style="color: #334155; margin-top: 0; color: #3b82f6;">Payment Information</h2>
            <p><strong>UTR/Transaction ID:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${utrReference}</code></p>
            <p><strong>Original Amount:</strong> ₹${paymentAmount}</p>
            ${discountText}
            <p><strong>Final Amount Paid:</strong> <span style="color: #10b981; font-weight: bold; font-size: 18px;">₹${finalAmount}</span></p>
            ${proofText}
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">⚡ Immediate Action Required</h3>
            <p style="color: #92400e; margin-bottom: 15px;">Please verify this payment in the admin panel and grant community access to the user.</p>
            <div style="text-align: center;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin" 
                 style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Open Admin Panel
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              This is an automated notification from SwingScribe Payment System<br>
              Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
    });

    console.log("Payment notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-payment-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send notification",
        details: error.toString(),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
