const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const PaymentController = require('../../controllers/paymentController');
const User = require('../../models/User');
const PaymentTransaction = require('../../models/PaymentTransaction');
const mongoose = require('mongoose');

// Mock models
jest.mock('../../models/User');
jest.mock('../../models/PaymentTransaction');

// Mock mongoose sessions for atomic transactions
const mockSession = {
  withTransaction: jest.fn(async (fn) => await fn()),
  endSession: jest.fn()
};
jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Inject req.user for all routes (simulates isAuthenticated middleware)
const injectUser = (req, res, next) => {
  req.user = { _id: 'test-user-id' };
  next();
};

app.get('/wallet', injectUser, PaymentController.showWallet);
app.post('/wallet/add', injectUser, PaymentController.addMoney);
app.post('/wallet/demo-deposit', injectUser, PaymentController.addDemoFunds);
app.post('/wallet/withdraw', injectUser, PaymentController.withdrawMoney);

describe('Payment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.withTransaction.mockImplementation(async (fn) => await fn());
    mockSession.endSession.mockReset();
  });

  describe('showWallet', () => {
    it('should call User.findById and PaymentTransaction.find with the correct userId', async () => {
      const user = { _id: 'test-user-id', username: 'testuser', wallet: 100 };
      const transactions = [{ type: 'deposit', amount: 100, timestamp: new Date() }];

      User.findById.mockReturnValue({ lean: () => Promise.resolve(user) });
      PaymentTransaction.find.mockReturnValue({
        sort: () => ({ lean: () => Promise.resolve(transactions) })
      });

      await request(app).get('/wallet');

      expect(User.findById).toHaveBeenCalledWith('test-user-id');
      expect(PaymentTransaction.find).toHaveBeenCalledWith({ userId: 'test-user-id' });
    });
  });

  describe('addMoney', () => {
    it('should add money via card and return wallet + balanceAfter', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 150 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .send({
          amount: '50',
          paymentMethod: 'card',
          cardNumber: '1234567812345678',
          cardExpiry: '12/25',
          cardCvv: '123',
          cardHolder: 'Test User'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(150);
      expect(res.body.balanceAfter).toBe(150);
      expect(res.body.message).toContain('50');
    });

    it('should add money via UPI payment', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 200 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .send({
          amount: '100',
          paymentMethod: 'upi',
          upiId: 'test@upi'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(200);
      expect(res.body.balanceAfter).toBe(200);
    });

    it('should add money via bank transfer', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 500 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .send({
          amount: '500',
          paymentMethod: 'bank',
          bankAccount: '12345678901234',
          bankIfsc: 'ABCD0123456',
          bankHolder: 'Test User',
          bankName: 'HDFC Bank'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(500);
    });

    it('should reject missing amount', async () => {
      const res = await request(app)
        .post('/wallet/add')
        .send({ paymentMethod: 'upi', upiId: 'test@upi' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('MISSING_AMOUNT');
    });

    it('should reject amount exceeding limit', async () => {
      const res = await request(app)
        .post('/wallet/add')
        .send({ amount: '200000', paymentMethod: 'upi', upiId: 'test@upi' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('AMOUNT_EXCEEDS_LIMIT');
    });

    it('should reject invalid UPI ID', async () => {
      const res = await request(app)
        .post('/wallet/add')
        .send({ amount: '100', paymentMethod: 'upi', upiId: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_UPI');
    });

    it('should block duplicate payments via idempotency key', async () => {
      const existingTx = {
        _id: 'existing-tx-id',
        status: 'completed',
        amount: 100
      };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(existingTx) });
      User.findById.mockReturnValue({ lean: () => Promise.resolve({ wallet: 200 }) });

      const res = await request(app)
        .post('/wallet/add')
        .send({
          amount: '100',
          paymentMethod: 'upi',
          upiId: 'test@upi',
          idempotencyKey: 'duplicate-key-123'
        });

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);
      expect(res.body.transactionId).toBe('existing-tx-id');
    });
  });

  describe('addDemoFunds', () => {
    it('should credit $1,000 demo funds and return updated wallet with balanceAfter', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 1000 };

      User.findByIdAndUpdate.mockResolvedValue(updatedUser);
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);

      const res = await request(app).post('/wallet/demo-deposit');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(1000);
      expect(res.body.balanceAfter).toBe(1000);
      expect(res.body.message).toContain('1,000');
    });

    it('should allow repeated demo deposits (each adds $1,000)', async () => {
      // Second call — simulates a user clicking "Add Demo Funds" twice
      const updatedUser = { _id: 'test-user-id', wallet: 2000 };

      User.findByIdAndUpdate.mockResolvedValue(updatedUser);
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);

      const res = await request(app).post('/wallet/demo-deposit');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(2000);
    });

    it('should return 500 if the DB update fails', async () => {
      mockSession.withTransaction.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).post('/wallet/demo-deposit');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SERVER_ERROR');
    });
  });

  describe('withdrawMoney', () => {
    it('should withdraw money and return newBalance + balanceAfter', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 50 };

      // Atomic guard: findOneAndUpdate returns the updated user
      User.findOneAndUpdate.mockResolvedValue(updatedUser);
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);

      const res = await request(app)
        .post('/wallet/withdraw')
        .send({
          amount: '50',
          cardNumber: '1234567812345678',
          cardHolder: 'Test User',
          expiryDate: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.newBalance).toBe(50);
      expect(res.body.balanceAfter).toBe(50);
    });

    it('should return 400 for insufficient funds', async () => {
      // Atomic guard: findOneAndUpdate returns null → balance check failed
      User.findOneAndUpdate.mockResolvedValueOnce(null);
      // User.exists confirms the user exists (so it's an insufficient-funds case, not missing user)
      User.exists.mockReturnValueOnce({ session: () => Promise.resolve({ _id: 'test-user-id' }) });

      mockSession.withTransaction.mockImplementationOnce(async (fn) => {
        try { await fn(); } catch (e) { throw e; }
      });

      const res = await request(app)
        .post('/wallet/withdraw')
        .send({
          amount: '999999',
          cardNumber: '1234567812345678',
          cardHolder: 'Test User',
          expiryDate: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient');
    });

    it('should require all fields for withdrawal', async () => {
      const res = await request(app)
        .post('/wallet/withdraw')
        .send({ amount: '50' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('All fields are required');
    });
  });
});
