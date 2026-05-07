import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils/auth';

describe('认证工具函数', () => {
  describe('hashPassword', () => {
    it('应该正确加密密码', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('应该为相同密码生成不同的哈希', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('应该正确验证密码', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('应该生成有效的JWT令牌', () => {
      const payload = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };
      
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的JWT令牌', async () => {
      const payload = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };
      
      const token = generateToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('应该拒绝无效的令牌', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(verifyToken(invalidToken)).rejects.toThrow();
    });
  });
});