import { type Address, type Hex, isAddress, isHex, padHex, toHex } from 'viem';
import type { AnyData } from '../types';
import type { FunctionContext } from './types';

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

// Detects whether the call is composable call or not
export const isComposableCall = (functionContext: FunctionContext, args: AnyData[]): boolean => {
  if (!functionContext.inputs || functionContext.inputs.length <= 0) return false;

  const isComposableCall = functionContext.inputs.some((input, inputIndex) => {
    // Only struct and arrays has child elements and require iterating them internally.
    // String and bytes are also dynamic but they are mostly treated as one single value for detection
    if (input.type === 'tuple') {
      // Struct arguments are handled here

      // Composable call detection
      const isComposableCallDetected = Object.values(args[inputIndex]).some(
        (internalArg: AnyData) => isRuntimeComposableValue(internalArg),
      );

      return isComposableCallDetected;
    }

    if (input.type.match(/^(.*)\[(\d+)?\]$/)) {
      // matches against both static and dynamic arrays.
      // Array arguments are handled here

      // Composable call detection
      const isComposableCallDetected = args[inputIndex].some((internalArg: AnyData) =>
        isRuntimeComposableValue(internalArg),
      );

      return isComposableCallDetected;
    }

    // Below mentioned common values are handled here.
    // intX, uintX, bytesX, bytes, string, bool, address are direct values and doesn't need iteration on child elements.

    // Composable call detection
    return isRuntimeComposableValue(args[inputIndex]);
  });

  return isComposableCall;
};
