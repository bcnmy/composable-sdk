import type { Address, Chain, PublicClient, Transport } from 'viem';
import { erc20Abi } from 'viem';
import {
  runtimeERC20AllowanceOf,
  runtimeERC20BalanceOf,
  runtimeNativeBalanceOf,
  toConstraintFields,
} from '../encoding';
import type { ERC20TokenInstance, NativeTokenInstance } from './types';

export function ERC20Token<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>, address: Address): ERC20TokenInstance {
  return {
    address,
    abi: erc20Abi,
    read(functionName, args) {
      return publicClient.readContract({ abi: erc20Abi, address, functionName, args });
    },
    runtimeBalance(ownerAddress, constraints = []) {
      return runtimeERC20BalanceOf({
        targetAddress: ownerAddress,
        tokenAddress: address,
        constraints: toConstraintFields(constraints),
      });
    },
    runtimeAllowance(ownerAddress, spenderAddress, constraints = []) {
      return runtimeERC20AllowanceOf({
        owner: ownerAddress,
        spender: spenderAddress,
        tokenAddress: address,
        constraints: toConstraintFields(constraints),
      });
    },
  };
}

export function NativeToken<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>): NativeTokenInstance {
  return {
    balance(address) {
      return publicClient.getBalance({ address });
    },
    runtimeBalance(address, constraints = []) {
      return runtimeNativeBalanceOf({
        targetAddress: address,
        constraints: toConstraintFields(constraints),
      });
    },
  };
}
