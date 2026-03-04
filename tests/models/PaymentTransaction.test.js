const mongoose = require('mongoose');
const PaymentTransaction = require('../../models/PaymentTransaction');
const User = require('../../models/User');

describe('PaymentTransaction Model', () => {
  let user;

  beforeAll(async () => {
    user = new User({
      username: 'paymentuser',
      email: 'payment@test.com',
      password: 'password',
    });
    await user.save();
  });

  it('should create a card payment transaction', async () => {
    const paymentData = {
      userId: user._id,
      type: 'deposit',
      amount: 100,
      paymentMethod: 'card',
      cardNumber: '**** **** **** 1234',
      cardHolder: 'Test User',
      status: 'completed'
    };
    const paymentTx = new PaymentTransaction(paymentData);
    await paymentTx.save();

    const foundTx = await PaymentTransaction.findOne({ userId: user._id, paymentMethod: 'card' });
    expect(foundTx).toBeDefined();
    expect(foundTx.amount).toBe(100);
    expect(foundTx.paymentMethod).toBe('card');
    expect(foundTx.status).toBe('completed');
  });

  it('should create a UPI payment transaction without card fields', async () => {
    const paymentData = {
      userId: user._id,
      type: 'deposit',
      amount: 200,
      paymentMethod: 'upi',
      upiId: 'testuser@upi',
      status: 'completed'
    };
    const paymentTx = new PaymentTransaction(paymentData);
    await paymentTx.save();

    const foundTx = await PaymentTransaction.findOne({ userId: user._id, paymentMethod: 'upi' });
    expect(foundTx).toBeDefined();
    expect(foundTx.amount).toBe(200);
    expect(foundTx.upiId).toBe('testuser@upi');
    // cardNumber and cardHolder should be undefined (not required)
    expect(foundTx.cardNumber).toBeUndefined();
    expect(foundTx.cardHolder).toBeUndefined();
  });

  it('should create a bank transfer transaction without card fields', async () => {
    const paymentData = {
      userId: user._id,
      type: 'deposit',
      amount: 500,
      paymentMethod: 'bank',
      bankAccount: '****5678',
      bankIfsc: 'HDFC0001234',
      bankHolder: 'Test User',
      bankName: 'HDFC Bank',
      status: 'completed'
    };
    const paymentTx = new PaymentTransaction(paymentData);
    await paymentTx.save();

    const foundTx = await PaymentTransaction.findOne({ userId: user._id, paymentMethod: 'bank' });
    expect(foundTx).toBeDefined();
    expect(foundTx.amount).toBe(500);
    expect(foundTx.bankIfsc).toBe('HDFC0001234');
  });

  it('should require paymentMethod field', async () => {
    const paymentTx = new PaymentTransaction({
      userId: user._id,
      type: 'deposit',
      amount: 100
      // paymentMethod is missing
    });
    let err;
    try {
      await paymentTx.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.paymentMethod).toBeDefined();
  });

  it('should only allow valid types and statuses', async () => {
    let paymentTx = new PaymentTransaction({
      userId: user._id,
      type: 'invalidtype',
      amount: 100,
      paymentMethod: 'card'
    });
    let err;
    try {
      await paymentTx.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();

    paymentTx = new PaymentTransaction({
      userId: user._id,
      type: 'deposit',
      amount: 100,
      paymentMethod: 'card',
      status: 'invalidstatus',
    });
    err = undefined;
    try {
      await paymentTx.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.status).toBeDefined();
  });

  it('should enforce idempotencyKey uniqueness', async () => {
    const baseData = {
      userId: user._id,
      type: 'deposit',
      amount: 100,
      paymentMethod: 'upi',
      upiId: 'test@upi',
      status: 'completed',
    };

    const tx1 = new PaymentTransaction({ ...baseData, idempotencyKey: 'unique-key-1' });
    await tx1.save();

    const tx2 = new PaymentTransaction({ ...baseData, idempotencyKey: 'unique-key-1' });
    let err;
    try {
      await tx2.save();
    } catch (error) {
      err = error;
    }
    // Should fail with duplicate key error (code 11000)
    expect(err).toBeDefined();
    expect(err.code).toBe(11000);
  });
});
