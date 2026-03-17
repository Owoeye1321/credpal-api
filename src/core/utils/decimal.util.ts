import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const toDecimal = (value: string | number): Decimal => {
  return new Decimal(value);
};

export const add = (a: string | number, b: string | number): string => {
  return new Decimal(a).plus(new Decimal(b)).toFixed(4);
};

export const subtract = (a: string | number, b: string | number): string => {
  return new Decimal(a).minus(new Decimal(b)).toFixed(4);
};

export const multiply = (a: string | number, b: string | number): string => {
  return new Decimal(a).times(new Decimal(b)).toFixed(4);
};

export const divide = (a: string | number, b: string | number): string => {
  return new Decimal(a).dividedBy(new Decimal(b)).toFixed(4);
};

export const isGreaterThanOrEqual = (
  a: string | number,
  b: string | number,
): boolean => {
  return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
};

export const isPositive = (value: string | number): boolean => {
  return new Decimal(value).greaterThan(0);
};
