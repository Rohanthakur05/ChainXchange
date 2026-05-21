const request = require('supertest');
const express = require('express');
const homeController = require('../../controllers/homeController');
const geckoApi = require('../../utils/geckoApi');

// Mock the geckoApi
jest.mock('../../utils/geckoApi');

const app = express();

app.get('/api/home', homeController.getHomeData);

describe('Home Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHomeData', () => {
    it('should return top cryptos in JSON format', async () => {
      const mockCryptos = [{ id: 'bitcoin', name: 'Bitcoin' }];
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValue(mockCryptos);

      const res = await request(app).get('/api/home');

      expect(res.status).toBe(200);
      expect(res.body.topCryptos).toEqual(mockCryptos);
    });

    it('should return fallback data if API fails', async () => {
      geckoApi.fetchCoinGeckoDataWithCache.mockResolvedValue(null);

      const res = await request(app).get('/api/home');

      expect(res.status).toBe(200);
      expect(res.body.topCryptos).toBeDefined();
      expect(res.body.isFallback).toBe(true);
    });
  });
});


