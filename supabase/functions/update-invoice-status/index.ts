import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-INVOICE-STATUS] ${step}${detailsStr}`);
};

interface CreateInvoiceRequest {
  planType: 'foundation' | 'progress' | 'premium';
  purchaseType: 'subscription' | 'one-time';
  billingDetails: {
    schoolName: string;
    address: string;
    contactName: string;
    contactEmail: string;
    purchaseOrderNumber?: string;
    additionalInformation?: string;
  };
}

async function handleCreateInvoiceRequest(
  data: CreateInvoiceRequest,
  user: any,
  supabase: any
) {
  console.log("Starting handleCreateInvoiceRequest");
  const { planType, purchaseType, billingDetails } = data;
  
  try {
    // Get plan details from the database using case-insensitive comparison
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .ilike('name', planType)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) {
      console.error('Error retrieving plan from database:', planError);
      throw new Error('Failed to retrieve plan details');
    }

    if (!planData) {
      console.error('Plan not found:', planType);
      throw new Error(`Selected plan "${planType}" not found or is not active`);
    }
    
    console.log("Retrieved plan data:", {
      id: planData.id,
      name: planData.name,
      price: planData.price
    });
    
    console.log("Creating subscription record for user:", user.id);
    
    // Create a subscription record with payment_method 'invoice'
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: planType.toLowerCase(),
        status: 'pending',
        payment_method: 'invoice',
        purchase_type: purchaseType,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      throw new Error('Failed to create subscription record');
    }

    console.log("Subscription created:", subscription.id);

    // Add billing details to payment_history
    const { data: payment, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        subscription_id: subscription.id,
        payment_method: 'invoice',
        amount: planData.price,
        currency: planData.currency || 'GBP',
        payment_status: 'pending',
        billing_school_name: billingDetails.schoolName,
        billing_address: billingDetails.address,
        billing_contact_name: billingDetails.contactName,
        billing_contact_email: billingDetails.contactEmail,
        billing_postcode: '', // Add if needed in the future
        invoice_number: '', // Will be assigned by admin later
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log("Payment record created:", payment.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invoice request submitted successfully',
      subscription: subscription.id,
      payment: payment.id
    }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error in handleCreateInvoiceRequest:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to process invoice request'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

interface UpdatePaymentRequest {
  paymentId: string;
  status: 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';
  invoiceNumber?: string;
  adminUserId: string;
}

async function handleUpdatePaymentStatus(
  data: UpdatePaymentRequest, 
  user: any,
  supabase: any
) {
  console.log("Starting handleUpdatePaymentStatus with data:", JSON.stringify(data));
  
  // Check if user is an admin - using the profiles table instead of user_roles
  try {
    console.log("Checking admin role for user:", user.id);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error checking admin status:", profileError);
      return new Response(
        JSON.stringify({ error: 'Error checking admin status', details: profileError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
      
    if (!profileData || !profileData.is_admin) {
      console.error("Unauthorized: User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("User is confirmed as admin");
  } catch (error) {
    console.error("Error in admin check:", error);
    return new Response(
      JSON.stringify({ error: 'Error checking admin permissions', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { paymentId, status, invoiceNumber, adminUserId } = data;

  if (!paymentId || !status) {
    console.error("Missing required fields:", JSON.stringify(data));
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // No need to map status values - use the database values directly
  console.log(`Using payment status value: "${status}" directly from request`);

  // Prepare update data
  const updateData: any = {
    payment_status: status // Use the status directly from the request
  };
  
  // Only add invoice_number to the update if it was provided
  if (invoiceNumber !== undefined) {
    updateData.invoice_number = invoiceNumber;
  }

  try {
    console.log("Updating payment record:", paymentId, "with data:", JSON.stringify(updateData));
    
    // Update payment history record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_history')
      .update(updateData)
      .eq('id', paymentId)
      .select('subscription_id')
      .single();

    if (paymentError) {
      console.error("Error updating payment:", paymentError);
      return new Response(
        JSON.stringify({ error: 'Error updating payment', details: paymentError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Payment updated successfully:", JSON.stringify(payment));

    // If payment is marked as completed, update the subscription status
    if (status === 'payment_made' && payment?.subscription_id) {
      console.log("Payment completed, updating subscription:", payment.subscription_id);
      
      try {
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('plan_type, purchase_type, user_id')
          .eq('id', payment.subscription_id)
          .single();

        if (subscriptionError) {
          console.error("Error fetching subscription:", subscriptionError);
          return new Response(
            JSON.stringify({ error: 'Error fetching subscription', details: subscriptionError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log("Found subscription:", JSON.stringify(subscription));

        // Update subscription to active
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            start_date: new Date().toISOString(),
            // Set end_date to 3 years from now for both one-time and subscription plans
            // since this is manually managed
            end_date: subscription.purchase_type === 'one-time' 
              ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', payment.subscription_id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          return new Response(
            JSON.stringify({ error: 'Error updating subscription', details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log("Subscription updated successfully");

        // Also update any other pending subscriptions for this user with the same plan type to inactive
        // This ensures only one subscription per plan type is active at a time
        if (subscription && subscription.user_id) {
          const { error: deactivateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'inactive'
            })
            .eq('user_id', subscription.user_id)
            .eq('plan_type', subscription.plan_type)
            .neq('id', payment.subscription_id)
            .eq('status', 'pending');
            
          if (deactivateError) {
            console.error("Error deactivating other pending subscriptions:", deactivateError);
            // Don't return an error, as the main operation succeeded
          }
        }
      } catch (error) {
        console.error("Error in subscription update process:", error);
        return new Response(
          JSON.stringify({ error: 'Error in subscription update process', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Payment status updated to ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing payment update:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

serve(async (req: Request) => {
  console.log("Function called with request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Create a Supabase client with admin permissions
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client created");
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from the JWT
    const token = authHeader.replace('Bearer ', '');
    console.log("Verifying token");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid token or user not found:", userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("User authenticated:", user.id);

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data parsed:", JSON.stringify(requestData));
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is an invoice creation request
    if ('planType' in requestData && 'purchaseType' in requestData) {
      console.log("Handling invoice creation request");
      return handleCreateInvoiceRequest(requestData, user, supabase);
    }
    
    // Or if it's a user creating a new invoice request
    else if ('paymentId' in requestData && 'status' in requestData) {
      console.log("Handling payment update request");
      return handleUpdatePaymentStatus(requestData, user, supabase);
    }
    
    else {
      console.error("Invalid request format:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in update-invoice-status function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
