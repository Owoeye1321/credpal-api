import {
  toDecimal,
  add,
  subtract,
  multiply,
  divide,
  isGreaterThanOrEqual,
  isPositive,
} from '../../../src/core/utils/decimal.util';

describe('decimal.util', () => {
  describe('toDecimal', () => {
    it('should convert a string to Decimal', () => {
      const result = toDecimal('100.5');
      expect(result.toString()).toBe('100.5');
    });

    it('should convert a number to Decimal', () => {
      const result = toDecimal(42);
      expect(result.toString()).toBe('42');
    });
  });

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add('10.5', '20.3')).toBe('30.8000');
    });

    it('should handle string and number inputs', () => {
      expect(add(10, '20')).toBe('30.0000');
    });

    it('should return result with 4 decimal places', () => {
      expect(add('1', '2')).toBe('3.0000');
    });

    it('should handle very small numbers', () => {
      expect(add('0.0001', '0.0001')).toBe('0.0002');
    });

    it('should handle adding zero', () => {
      expect(add('100.5000', '0')).toBe('100.5000');
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(subtract('30', '10')).toBe('20.0000');
    });

    it('should handle result going negative', () => {
      expect(subtract('5', '10')).toBe('-5.0000');
    });

    it('should return result with 4 decimal places', () => {
      expect(subtract('100.5000', '0.5000')).toBe('100.0000');
    });

    it('should handle subtracting zero', () => {
      expect(subtract('50', '0')).toBe('50.0000');
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply('100', '1.5')).toBe('150.0000');
    });

    it('should handle exchange rate multiplication', () => {
      expect(multiply('1000', '0.00065')).toBe('0.6500');
    });

    it('should return result with 4 decimal places', () => {
      expect(multiply('3', '3')).toBe('9.0000');
    });

    it('should handle multiplication by zero', () => {
      expect(multiply('100', '0')).toBe('0.0000');
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide('100', '4')).toBe('25.0000');
    });

    it('should handle division for inverse rate calculation', () => {
      const result = divide('1', '1550');
      expect(result).toBe('0.0006');
    });

    it('should return result with 4 decimal places', () => {
      expect(divide('10', '3')).toBe('3.3333');
    });

    it('should handle rounding with ROUND_HALF_UP', () => {
      expect(divide('1', '6')).toBe('0.1667');
    });
  });

  describe('isGreaterThanOrEqual', () => {
    it('should return true when a > b', () => {
      expect(isGreaterThanOrEqual('100', '50')).toBe(true);
    });

    it('should return true when a === b', () => {
      expect(isGreaterThanOrEqual('100', '100')).toBe(true);
    });

    it('should return false when a < b', () => {
      expect(isGreaterThanOrEqual('50', '100')).toBe(false);
    });

    it('should handle string decimal comparison', () => {
      expect(isGreaterThanOrEqual('100.0001', '100.0000')).toBe(true);
    });

    it('should handle equal decimals', () => {
      expect(isGreaterThanOrEqual('50.0000', '50.0000')).toBe(true);
    });
  });

  describe('isPositive', () => {
    it('should return true for positive numbers', () => {
      expect(isPositive('10')).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositive('0')).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isPositive('-5')).toBe(false);
    });

    it('should handle small positive decimals', () => {
      expect(isPositive('0.0001')).toBe(true);
    });

    it('should handle number type input', () => {
      expect(isPositive(42)).toBe(true);
    });
  });
});
