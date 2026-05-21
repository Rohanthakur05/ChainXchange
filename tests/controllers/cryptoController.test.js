const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cryptoController = require('../../controllers/cryptoController');
const tradeController = require('../../controllers/tradeController');
const User = require('../../models/User');
const Portfolio = require('../../models/Portfolio');
const Transaction = require('../../models/Transaction');
const geckoApi = require('../../utils/geckoApi');

// Mock models and external services
jest.mock('../../models/User');
jest.mock('../../models/Portfolio');
jest.mock('../../models/Transaction');
jest.mock('../../utils/geckoApi');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: true,
}));

// Mock res.render and other response methods
app.use((req, res, next) => {
  res.render = jest.fn();
  res.redirect = jest.fn();
  res.json = jest.fn();
  res.status = jest.fn(() => res);
  res.locals.user = { _id: 'test-user-id', username: 'testuser' };
  next();
});

describe('Crypto & Trade Controllers', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      cookies: {},
      session: {},
      user: { _id: 'test-user-id' }
    };
    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
    jest.clearAllMocks();
  });

  describe('getMarkets', () => {
    it('should return crypto markets data in JSON', async () => {
      const mockCoins = [{ id: 'bitcoin', name: 'Bitcoin' }];
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValue(mockCoins);

      await cryptoController.getMarkets(req, res);

      expect(geckoApi.fetchCoinGeckoDataWithCache).toHaveBeenCalledWith(expect.any(String), null, 'crypto-markets', 300000);
      expect(res.json).toHaveBeenCalledWith(mockCoins);
    });
  });

  describe('getCryptoDetail', () => {
    it('should return crypto detail and holdings in JSON', async () => {
      const mockCoinData = { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', market_data: { current_price: { usd: 50000 } } };
      const mockChartData = { prices: [[1, 2], [3, 4]] };
      req.params.coinId = 'bitcoin';
      res.locals.user = { _id: 'test-user-id' };
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValueOnce(mockCoinData);
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValueOnce(mockChartData);
      Portfolio.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      await cryptoController.getCryptoDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        coin: expect.any(Object),
        userHolding: null
      }));
    });
  });

  describe('buyCrypto', () => {
    it('should allow a user to buy crypto atomically', async () => {
      const user = { _id: 'test-user-id', wallet: 1000 };
      User.findOneAndUpdate.mockResolvedValue(user);
      User.exists.mockResolvedValue(true);
      
      geckoApi.fetchCoinGeckoDataWithCache.mockImplementation((url) => {
        if (url.includes('simple/price')) {
          return Promise.resolve({ bitcoin: { usd: 500 } });
        }
        if (url.includes('coins/bitcoin')) {
          return Promise.resolve({ name: 'Bitcoin', symbol: 'btc', image: { large: 'url' } });
        }
        return Promise.resolve(null);
      });
      
      Portfolio.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      Portfolio.findOneAndUpdate.mockResolvedValue(true);
      Transaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      Transaction.create.mockResolvedValue([{ _id: 'tx-id' }]);

      req.body = { coinId: 'bitcoin', quantity: '1', price: '500' };

      await tradeController.buyCrypto(req, res);

      expect(User.findOneAndUpdate).toHaveBeenCalled();
      expect(Portfolio.findOneAndUpdate).toHaveBeenCalled();
      expect(Transaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Purchase successful'
      }));
    });
  });

  describe('sellCrypto', () => {
    it('should allow a user to sell crypto atomically', async () => {
      const user = { _id: 'test-user-id', wallet: 1500 };
      const portfolio = { userId: 'test-user-id', coinId: 'bitcoin', quantity: 2 };
      
      User.findByIdAndUpdate.mockResolvedValue(user);
      Portfolio.findOne.mockReturnValue({ lean: () => Promise.resolve(portfolio) });
      Portfolio.findOneAndUpdate.mockResolvedValue({ userId: 'test-user-id', coinId: 'bitcoin', quantity: 1 });
      
      const coinData = { market_data: { current_price: { usd: 500 } } };
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValue(coinData);
      Transaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      Transaction.create.mockResolvedValue([{ _id: 'tx-id' }]);

      req.body = { coinId: 'bitcoin', quantity: '1', price: '500' };

      await tradeController.sellCrypto(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalled();
      expect(Portfolio.findOneAndUpdate).toHaveBeenCalled();
      expect(Transaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Successfully sold')
      }));
    });
  });
});


