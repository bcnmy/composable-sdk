import {
  type Address,
  type Chain,
  encodePacked,
  type Hex,
  keccak256,
  type PublicClient,
  type Transport,
} from 'viem';
import { createContract } from '../contract';
import { toBytes32 } from '../encoding/utils';
import { NAMESPACE_STORAGE_ABI } from './abi';
import { NAMESPACE_STORAGE_CONTRACT_ADDRESS } from './constants';
import type {
  CheckStorageParams,
  GetStorageKeyParams,
  ReadStorageParams,
  RuntimeValueStorageParams,
  StorageInstance,
  WriteStorageParams,
} from './types';

// ---------------------------------------------------------------------------
// Slot + namespace helpers
// ---------------------------------------------------------------------------

class NamespaceStorageKeyManager {
  private static instance: NamespaceStorageKeyManager;
  private isNameSpaceStorageSlotKeyBeingCalculated = new Map<string, boolean>();

  private constructor() {}

  public static getInstance(): NamespaceStorageKeyManager {
    if (!NamespaceStorageKeyManager.instance) {
      NamespaceStorageKeyManager.instance = new NamespaceStorageKeyManager();
    }
    return NamespaceStorageKeyManager.instance;
  }

  // This function always make sure to provide a unique storage key.
  // This is helpful to reduce storage slot collusion
  public async getDefaultStorageSlotKey(
    accountAddress: Address,
    callerAddress: Address,
  ): Promise<bigint> {
    const storeKey = `${accountAddress.toLowerCase()}::${callerAddress.toLowerCase()}`;

    while (this.isNameSpaceStorageSlotKeyBeingCalculated.get(storeKey)) {
      await new Promise((resolve) => setTimeout(resolve, 1)); // wait for 1 ms if another key is being calculated
    }

    this.isNameSpaceStorageSlotKeyBeingCalculated.set(storeKey, true);
    const key = BigInt(Date.now());

    await new Promise((resolve) => setTimeout(resolve, 1)); // ensure next call is in the next millisecond
    this.isNameSpaceStorageSlotKeyBeingCalculated.set(storeKey, false);

    return key;
  }
}

export const getStorageNamespace = (accountAddress: Address, callerAddress: Address): Hex =>
  keccak256(encodePacked(['address', 'address'], [accountAddress, callerAddress]));

export const getStorageSlot = async (
  accountAddress: Address,
  callerAddress: Address,
  storageKey?: bigint,
): Promise<Hex> => {
  const manager = NamespaceStorageKeyManager.getInstance();
  const defaultStorageKey = await manager.getDefaultStorageSlotKey(accountAddress, callerAddress);
  const defaultKey = storageKey ?? defaultStorageKey;

  return keccak256(
    encodePacked(
      ['address', 'address', 'uint256'],
      [
        accountAddress,
        callerAddress,
        // Unique timestamp for each slot so that slots are unique for every new request / flow
        defaultKey,
      ],
    ),
  );
};

// ---------------------------------------------------------------------------
// StorageInstance factory
// ---------------------------------------------------------------------------

export function createStorage<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>, accountAddress: Address): StorageInstance {
  const contractInstance = createContract(
    publicClient,
    NAMESPACE_STORAGE_CONTRACT_ADDRESS,
    NAMESPACE_STORAGE_ABI,
  );

  return {
    accountAddress,

    async getStorageKey({
      accountAddress: accountAddressOverride,
      callerAddress: callerAddressOverride,
    }: GetStorageKeyParams = {}) {
      const resolvedAccountAddress = accountAddressOverride ?? accountAddress;
      const resolvedCallerAddress = callerAddressOverride ?? resolvedAccountAddress;
      const manager = NamespaceStorageKeyManager.getInstance();
      return manager.getDefaultStorageSlotKey(resolvedAccountAddress, resolvedCallerAddress);
    },

    async read({
      storageKey,
      accountAddress: accountAddressOverride,
      callerAddress: callerAddressOverride,
    }: ReadStorageParams = {}) {
      const resolvedAccountAddress = accountAddressOverride ?? accountAddress;
      const resolvedCallerAddress = callerAddressOverride ?? resolvedAccountAddress;

      const slot = await getStorageSlot(resolvedAccountAddress, resolvedCallerAddress, storageKey);
      const namespace = getStorageNamespace(resolvedAccountAddress, resolvedCallerAddress);

      return contractInstance.read({
        functionName: 'readStorage',
        args: [namespace, slot],
      }) as Promise<`0x${string}`>;
    },

    async write({
      value,
      storageKey,
      accountAddress: accountAddressOverride,
      callerAddress: callerAddressOverride,
    }: WriteStorageParams) {
      const resolvedAccountAddress = accountAddressOverride ?? accountAddress;
      const resolvedCallerAddress = callerAddressOverride ?? resolvedAccountAddress;

      const slot = await getStorageSlot(resolvedAccountAddress, resolvedCallerAddress, storageKey);

      return contractInstance.write({
        functionName: 'writeStorage',
        args: [slot, toBytes32(value), resolvedAccountAddress],
      });
    },

    async runtimeValue({
      constraints,
      storageKey,
      accountAddress: accountAddressOverride,
      callerAddress: callerAddressOverride,
    }: RuntimeValueStorageParams = {}) {
      const resolvedAccountAddress = accountAddressOverride ?? accountAddress;
      const resolvedCallerAddress = callerAddressOverride ?? resolvedAccountAddress;

      const slot = await getStorageSlot(resolvedAccountAddress, resolvedCallerAddress, storageKey);
      const namespace = getStorageNamespace(resolvedAccountAddress, resolvedCallerAddress);

      return contractInstance.runtimeValue({
        functionName: 'readStorage',
        args: [namespace, slot],
        constraints,
      });
    },

    async check({
      constraints,
      storageKey,
      accountAddress: accountAddressOverride,
      callerAddress: callerAddressOverride,
    }: CheckStorageParams) {
      const resolvedAccountAddress = accountAddressOverride ?? accountAddress;
      const resolvedCallerAddress = callerAddressOverride ?? resolvedAccountAddress;

      const slot = await getStorageSlot(resolvedAccountAddress, resolvedCallerAddress, storageKey);
      const namespace = getStorageNamespace(resolvedAccountAddress, resolvedCallerAddress);

      return contractInstance.check({
        functionName: 'readStorage',
        args: [namespace, slot],
        constraints,
      });
    },
  };
}
