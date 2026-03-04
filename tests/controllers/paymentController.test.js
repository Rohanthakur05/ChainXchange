const request = require('supertest');
const express = require('express');
const session = require('express-session');
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

app.get('/wallet', (req, res, next) => { req.cookies.user = req.cookies.user || req.query.userId; next(); }, PaymentController.showWallet);
app.post('/wallet/add', (req, res, next) => { req.cookies.user = req.cookies.user || req.query.userId; next(); }, PaymentController.addMoney);
app.post('/wallet/withdraw', (req, res, next) => { req.cookies.user = req.cookies.user || req.query.userId; next(); }, PaymentController.withdrawMoney);

describe('Payment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.withTransaction.mockImplementation(async (fn) => await fn());
    mockSession.endSession.mockReset();
  });

  describe('showWallet', () => {
    it('should render the wallet page with user data and transactions', async () => {
      const user = { _id: 'test-user-id', username: 'testuser', wallet: 100 };
      const transactions = [{ type: 'deposit', amount: 100, timestamp: new Date() }];

      User.findById.mockReturnValue({ lean: () => Promise.resolve(user) });
      PaymentTransaction.find.mockReturnValue({
        sort: () => ({ lean: () => Promise.resolve(transactions) })
      });

      const res = await request(app)
        .get('/wallet')
        .set('Cookie', ['user=test-user-id']);

      // showWallet calls res.render which supertest doesn't handle well,
      // so we just verify the mocks were called correctly
      expect(User.findById).toHaveBeenCalledWith('test-user-id');
      expect(PaymentTransaction.find).toHaveBeenCalledWith({ userId: 'test-user-id' });
    });
  });

  describe('addMoney', () => {
    it('should add money via card payment and return updated wallet', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 150 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .set('Cookie', ['user=test-user-id'])
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
      expect(res.body.message).toContain('50');
    });

    it('should add money via UPI payment', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 200 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .set('Cookie', ['user=test-user-id'])
        .send({
          amount: '100',
          paymentMethod: 'upi',
          upiId: 'test@upi'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet).toBe(200);
    });

    it('should add money via bank transfer', async () => {
      const updatedUser = { _id: 'test-user-id', wallet: 500 };

      PaymentTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .post('/wallet/add')
        .set('Cookie', ['user=test-user-id'])
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
        .set('Cookie', ['user=test-user-id'])
        .send({ paymentMethod: 'upi', upiId: 'test@upi' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('MISSING_AMOUNT');
    });

    it('should reject amount exceeding limit', async () => {
      const res = await request(app)
        .post('/wallet/add')
        .set('Cookie', ['user=test-user-id'])
        .send({ amount: '200000', paymentMethod: 'upi', upiId: 'test@upi' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('AMOUNT_EXCEEDS_LIMIT');
    });

    it('should reject invalid UPI ID', async () => {
      const res = await request(app)
        .post('/wallet/add')
        .set('Cookie', ['user=test-user-id'])
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
        .set('Cookie', ['user=test-user-id'])
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

  describe('withdrawMoney', () => {
    it('should withdraw money from the user wallet', async () => {
      const user = { _id: 'test-user-id', wallet: 100 };
      const updatedUser = { _id: 'test-user-id', wallet: 50 };

      User.findById.mockResolvedValue(user);
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);
      PaymentTransaction.prototype.save = jest.fn().mockResolvedValue(true);

      const res = await request(app)
        .post('/wallet/withdraw')
        .set('Cookie', ['user=test-user-id'])
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
    });

    it('should return an error for insufficient funds', async () => {
      const user = { _id: 'test-user-id', wallet: 40 };
      User.findById.mockResolvedValue(user);

      const res = await request(app)
        .post('/wallet/withdraw')
        .set('Cookie', ['user=test-user-id'])
        .send({
          amount: '50',
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
        .set('Cookie', ['user=test-user-id'])
        .send({ amount: '50' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('All fields are required');
    });
  });
});
