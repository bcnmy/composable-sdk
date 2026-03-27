import { isAddress, isHex, padHex, toHex, type Address, type Hex } from 'viem';
import type { AnyData } from '../types';

export const toBytes32 = (value: bigint | boolean | Address | Hex | number): Hex => {
  if (typeof value === 'boolean') {
    return padHex(toHex(value ? 1n : 0n), { size: 32 });
  }

  if (typeof value === 'bigint') {
    return padHex(toHex(value), { size: 32 });
  }

  if (typeof value === 'number') {
    return padHex(toHex(BigInt(value)), { size: 32 });
  }

  if (isAddress(value)) {
    return padHex(value, { size: 32 });
  }

  if (isHex(value)) {
    return padHex(value, { size: 32 });
  }

  throw new Error('Invalid value: must be boolean, bigint, address, or hex string');
};

// Detects whether the value is runtime injected value or not
export const isRuntimeComposableValue = (value: AnyData) => {
  if (value && typeof value === 'object' && !Array.isArray(value) && value.isRuntime) {
    return true;
  }

  return false;
};
