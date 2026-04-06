import type { Address, Chain, PublicClient, Transport } from 'viem';
import { erc20Abi } from 'viem';
import {
  runtimeERC20AllowanceOf,
  runtimeERC20BalanceOf,
  runtimeNativeBalanceOf,
  toConstraintFields,
} from '../encoding';
import type { ERC20TokenInstance, NativeTokenInstance } from './types';

function resolveAddress(
  provided: Address | undefined,
  fallback: Address | undefined,
  label: string,
): Address {
  const resolved = provided ?? fallback;
  if (!resolved) throw new Error(`${label} is required`);
  return resolved;
}

export function ERC20Token<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  publicClient: PublicClient<TTransport, TChain>,
  address: Address,
  accountAddress?: Address,
): ERC20TokenInstance {
  return {
    address,
    abi: erc20Abi,
    read({ functionName, args }) {
      return publicClient.readContract({ abi: erc20Abi, address, functionName, args });
    },
    runtimeBalance({ owner, constraints } = {}) {
      return runtimeERC20BalanceOf({
        targetAddress: resolveAddress(owner, accountAddress, 'owner'),
        tokenAddress: address,
        constraints: toConstraintFields(constraints ?? []),
      });
    },
    runtimeAllowance({ spender, owner, constraints }) {
      return runtimeERC20AllowanceOf({
        owner: resolveAddress(owner, accountAddress, 'owner'),
        spender,
        tokenAddress: address,
        constraints: toConstraintFields(constraints ?? []),
      });
    },
  };
}

export function NativeToken<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>, accountAddress?: Address): NativeTokenInstance {
  return {
    balance({ address } = {}) {
      return publicClient.getBalance({
        address: resolveAddress(address, accountAddress, 'address'),
      });
    },
    runtimeBalance({ address, constraints } = {}) {
      return runtimeNativeBalanceOf({
        targetAddress: resolveAddress(address, accountAddress, 'address'),
        constraints: toConstraintFields(constraints ?? []),
      });
    },
  };
}
