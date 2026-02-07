import { getUserProfile, getUserBalance, getUserTransactions, getUserReferrals } from './src/services/api.js';

async function testAPI() {
  try {
    console.log('Testing user profile API...');
    console.log('userId:', localStorage.getItem('userId'));

    const profile = await getUserProfile();
    console.log('Profile success:', profile);

    const balance = await getUserBalance();
    console.log('Balance success:', balance);

    const transactions = await getUserTransactions(10);
    console.log('Transactions success:', transactions);

    const referrals = await getUserReferrals();
    console.log('Referrals success:', referrals);

  } catch (error) {
    console.error('API Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testAPI();