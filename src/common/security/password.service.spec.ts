import { PasswordService } from './password.service';
import * as bcryptjs from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password using bcrypt with configured salt rounds', async () => {
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.hash('plain-password');

      expect(bcryptjs.hash).toHaveBeenCalledWith(
        'plain-password',
        expect.any(Number),
      );
      expect(result).toBe('hashed-password');
    });
  });

  describe('compare', () => {
    it('should return true when passwords match', async () => {
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.compare('plain', 'hashed');

      expect(bcryptjs.compare).toHaveBeenCalledWith('plain', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare('plain', 'hashed');

      expect(result).toBe(false);
    });
  });
});
