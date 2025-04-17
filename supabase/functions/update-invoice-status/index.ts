import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface UpdatePaymentRequest {
  paymentId: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'; // Frontend status values
  invoiceNumber?: string;
  adminUserId: string;
}

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
    
    // Check if this is an admin updating a payment status
    if ('paymentId' in requestData && 'status' in requestData) {
      console.log("Handling payment update request");
      return handleUpdatePaymentStatus(requestData, user, supabase);
    }
    
    // Or if it's a user creating a new invoice request
    else if ('planType' in requestData && 'purchaseType' in requestData) {
      console.log("Handling invoice creation request");
      return handleCreateInvoiceRequest(requestData, user, supabase);
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
    return new Response(
      JSON.stringify({ error: error.message || 'Error processing request', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleUpdatePaymentStatus(
  data: UpdatePaymentRequest, 
  user: any,
  supabase: any
) {
  console.log("Starting handleUpdatePaymentStatus with data:", JSON.stringify(data));
  
  // Check if user is an admin
  try {
    console.log("Checking admin role for user:", user.id);
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'administrator')
      .maybeSingle();
      
    if (roleError) {
      console.error("Error checking admin role:", roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking admin role', details: roleError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
      
    if (!adminRole) {
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

  // Map frontend status values to database enum values
  let dbStatus;
  switch (status) {
    case 'completed':
      dbStatus = 'payment_made'; // Updated to use the correct enum value
      break;
    case 'pending':
      dbStatus = 'pending';
      break;
    case 'cancelled':
      dbStatus = 'cancelled';
      break;
    case 'refunded':
      dbStatus = 'refunded';
      break;
    default:
      dbStatus = 'pending';
  }

  console.log(`Mapping status from "${status}" to database value "${dbStatus}"`);

  // Prepare update data
  const updateData: any = {
    payment_status: dbStatus
  };
  
  // Only add invoice_number to the update if it was provided
  if (invoiceNumber !== undefined) {
    updateData.invoice_number = invoiceNumber;
  }

  try {
    console.log("Updating payment record:", paymentId, "with data:", JSON.stringify(updateData));
    
    // Update payment history record - removed the payment_method filter to allow updating any payment type
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
    if (dbStatus === 'payment_made' && payment?.subscription_id) {
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

async function handleCreateInvoiceRequest(
  data: CreateInvoiceRequest,
  user: any,
  supabase: any
) {
  console.log("Starting handleCreateInvoiceRequest");
  const { planType, purchaseType, billingDetails } = data;
  
  try {
    // Get plan details from the database
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('name', planType)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) {
      console.error('Error retrieving plan from database:', planError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve plan details', details: planError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!planData) {
      console.error('Plan not found:', planType);
      return new Response(
        JSON.stringify({ error: 'Selected plan not found or is not active' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        plan_type: planType,
        status: 'pending',
        payment_method: 'invoice',
        purchase_type: purchaseType,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription record', details: subscriptionError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record', details: paymentError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Payment record created:", payment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice request submitted successfully',
        subscription: subscription.id,
        payment: payment.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating invoice request:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
