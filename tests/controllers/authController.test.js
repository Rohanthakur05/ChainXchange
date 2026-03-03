const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mock bcrypt and User model before requiring controller
jest.mock('bcrypt');
jest.mock('../../models/User');
jest.mock('../../models/Transaction');

const bcrypt = require('bcrypt');
const User = require('../../models/User');
const authController = require('../../controllers/authController');

// Build minimal express app matching the real app setup
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('test-secret'));

app.post('/auth/signup', authController.signup);
app.post('/auth/login', authController.login);
app.get('/auth/logout', authController.logout);

// ─────────────────────────────────────────
// signup
// ─────────────────────────────────────────
describe('POST /auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 if fields are missing', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ username: 'testuser', email: 'test@test.com' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('All fields are required.');
  });

  it('should return 409 if username or email already exists', async () => {
    User.findOne.mockResolvedValue({ username: 'testuser' });

    const res = await request(app)
      .post('/auth/signup')
      .send({ username: 'testuser', email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username or email already exists.');
  });

  it('should return 201 and user data on successful signup', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedpassword');

    const savedUser = {
      _id: 'user-id-123',
      username: 'newuser',
      email: 'new@test.com',
      wallet: 0,
    };
    // Mock the User constructor and save()
    User.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(savedUser),
      ...savedUser,
    }));

    const res = await request(app)
      .post('/auth/signup')
      .send({ username: 'newuser', email: 'new@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Signup successful');
  });
});

// ─────────────────────────────────────────
// login
// ─────────────────────────────────────────
describe('POST /auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 if fields are missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password are required.');
  });

  it('should return 401 if user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'ghost', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password.');
  });

  it('should return 401 if password is incorrect', async () => {
    User.findOne.mockResolvedValue({
      _id: 'user-id-123',
      username: 'testuser',
      password: 'hashedpassword',
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password.');
  });

  it('should return 200 and user data on successful login', async () => {
    const mockUser = {
      _id: 'user-id-123',
      username: 'testuser',
      email: 'test@test.com',
      wallet: 500,
      password: 'hashedpassword',
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.user.username).toBe('testuser');
  });
});

// ─────────────────────────────────────────
// logout
// ─────────────────────────────────────────
describe('GET /auth/logout', () => {
  it('should clear the cookie and return success', async () => {
    const res = await request(app).get('/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});
