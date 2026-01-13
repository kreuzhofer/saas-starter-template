import * as emailService from '../../services/email';

// The email service is already mocked globally in setup.ts
// We just need to get references to the mocked functions

describe('Email Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Email Service Mocking', () => {
    it('should have mocked sendEmailConfirmation', () => {
      expect(jest.isMockFunction(emailService.sendEmailConfirmation)).toBe(true);
    });

    it('should have mocked sendPasswordReset', () => {
      expect(jest.isMockFunction(emailService.sendPasswordReset)).toBe(true);
    });

    it('should have mocked verifyEmailService', () => {
      expect(jest.isMockFunction(emailService.verifyEmailService)).toBe(true);
    });
  });

  describe('Email Confirmation Sending', () => {
    it('should call sendEmailConfirmation without throwing', async () => {
      const email = 'test@example.com';
      const token = 'test-token-123';

      await expect(
        emailService.sendEmailConfirmation(email, token)
      ).resolves.not.toThrow();

      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(email, token);
    });

    it('should be called with correct parameters', async () => {
      const email = 'test@example.com';
      const token = 'test-token-123';

      await emailService.sendEmailConfirmation(email, token);

      expect(emailService.sendEmailConfirmation).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(email, token);
    });
  });

  describe('Password Reset Email Sending', () => {
    it('should call sendPasswordReset without throwing', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';

      await expect(
        emailService.sendPasswordReset(email, token)
      ).resolves.not.toThrow();

      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(email, token);
    });

    it('should be called with correct parameters', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';

      await emailService.sendPasswordReset(email, token);

      expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(email, token);
    });
  });

  describe('Email Service Verification', () => {
    it('should call verifyEmailService and return true', async () => {
      const result = await emailService.verifyEmailService();

      expect(emailService.verifyEmailService).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should be mockable to return false', async () => {
      // Temporarily override the mock for this test
      (emailService.verifyEmailService as jest.Mock).mockResolvedValueOnce(false);

      const result = await emailService.verifyEmailService();

      expect(result).toBe(false);
    });
  });
});
