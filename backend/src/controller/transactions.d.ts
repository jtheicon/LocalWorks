import hitpay from "hitpay"

// Create a payment intent to start a purchase flow
let paymentIntent = await hitpay.paymentIntents.create({
  amount: 2000,
  currency: "usd",
  description: "My first payment",
});

// Complete the payment using a test card.
await hitpay.paymentIntents.confirm(paymentIntent.id, {
  payment_method: "gcash",
});


// Source: https://hitpayapp.com/ph/paymentapis