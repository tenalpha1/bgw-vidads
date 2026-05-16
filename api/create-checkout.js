// /api/create-checkout.js
// This runs securely on Vercel's server — users never see this code

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter: {
    name: 'BGW VidAds Starter',
    description: '500 credits/month — video ads, 1080p, no watermark, commercial licence',
    amount: 2499, // $24.99 CAD in cents
    credits: 500,
  },
  pro: {
    name: 'BGW VidAds Pro',
    description: '1000 credits/month — 4K, Indigenous Collection, priority queue, commercial licence',
    amount: 4499, // $44.99 CAD in cents
    credits: 1000,
  },
};

module.exports = async (req, res) => {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, userEmail } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const planDetails = PLANS[plan];
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://bgw-vidads.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      currency: 'cad',
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: planDetails.name,
              description: planDetails.description,
            },
            unit_amount: planDetails.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        userId,
        plan,
        credits: planDetails.credits,
      },
      success_url: `${baseUrl}?payment=success&plan=${plan}`,
      cancel_url: `${baseUrl}?payment=cancelled`,
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
};
