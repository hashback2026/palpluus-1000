const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const delay = ms => new Promise(res => setTimeout(res, ms));

function formatPhone(phone) {
  phone = phone.trim();
  if (phone.startsWith('0')) {
    return '254' + phone.slice(1);
  }
  return phone;
}

function getAuth() {
  const creds = `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`;
  return Buffer.from(creds).toString('base64');
}

app.post('/send-bulk', async (req, res) => {
  const { numbers, amount, reference, description } = req.body;

  if (!numbers || numbers.length === 0) {
    return res.status(400).json({ error: 'No numbers provided' });
  }

  const results = [];

  for (let i = 0; i < numbers.length; i++) {
    const phone = formatPhone(numbers[i]);

    try {
      const response = await fetch('https://api.palpluss.com/v1/payments/stk', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${getAuth()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          phone,
          accountReference: reference,
          transactionDesc: description,
          callbackUrl: process.env.CALLBACK_URL
        })
      });

      const data = await response.json();

      results.push({
        phone,
        status: 'sent',
        response: data
      });

    } catch (err) {
      results.push({
        phone,
        status: 'failed',
        error: err.message
      });
    }

    await delay(3000);
  }

  res.json(results);
});

app.post('/callback', (req, res) => {
  console.log('M-PESA CALLBACK:', req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});