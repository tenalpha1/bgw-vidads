// /api/stripe-webhook.js
// Handles Stripe payment events and upgrades user plans in Supabase

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PLAN_CREDITS = {
  starter: 500,
  pro: 1000,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    if (userId && plan && PLAN_CREDITS[plan]) {
      const credits = PLAN_CREDITS[plan];

      const { error } = await supabase
        .from('profiles')
        .update({ plan, credits })
        .eq('id', userId);

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update user plan' });
      }

      console.log(`Upgraded user ${userId} to ${plan} with ${credits} credits`);
    }
  }

  return res.status(200).json({ received: true });
};
