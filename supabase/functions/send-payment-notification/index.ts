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
      ? `<p><strong>Payment Proof:</strong> <a href="${paymentProofUrl}" target="_blank">View Screenshot</a></p>`
      : '<p><strong>Payment Proof:</strong> Not provided</p>';

    const emailResponse = await resend.emails.send({
      from: "SwingScribe <onboarding@resend.dev>",
      to: ["adityatradedition@gmail.com"],
      subject: `New Payment Submission - ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">
            New Payment Submission
          </h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #334155; margin-top: 0;">Customer Details</h2>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Submission Time:</strong> ${submissionTime}</p>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #334155; margin-top: 0;">Payment Details</h2>
            <p><strong>UTR/Transaction ID:</strong> ${utrReference}</p>
            <p><strong>Original Amount:</strong> ₹${paymentAmount}</p>
            ${discountText}
            <p><strong>Final Amount Paid:</strong> ₹${finalAmount}</p>
            ${proofText}
          </div>
          
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fb923c;">
            <h3 style="color: #c2410c; margin-top: 0;">Action Required</h3>
            <p>Please verify this payment in the admin panel and mark it as verified to grant community access.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px;">
              This is an automated notification from SwingScribe Payment System
            </p>
          </div>
        </div>
      `,
    });

    console.log("Payment notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
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
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);