import { type Address, encodePacked, type Hex, keccak256 } from 'viem';

// ---------------------------------------------------------------------------
// Namespace storage key manager
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

  // Always provides a unique storage key to reduce storage slot collisions.
  public async getDefaultStorageSlotKey(
    accountAddress: Address,
    callerAddress: Address,
  ): Promise<bigint> {
    const storeKey = `${accountAddress.toLowerCase()}::${callerAddress.toLowerCase()}`;

    while (this.isNameSpaceStorageSlotKeyBeingCalculated.get(storeKey)) {
      await new Promise((resolve) => setTimeout(resolve, 1)); // wait for next ms if key is being calculated
    }

    this.isNameSpaceStorageSlotKeyBeingCalculated.set(storeKey, true);
    const key = BigInt(Date.now());

    await new Promise((resolve) => setTimeout(resolve, 1)); // ensure next call is in the next millisecond
    this.isNameSpaceStorageSlotKeyBeingCalculated.set(storeKey, false);

    return key;
  }
}

// ---------------------------------------------------------------------------
// Slot helpers
// ---------------------------------------------------------------------------

export const getStorageSlotKey = async (
  accountAddress: Address,
  callerAddress: Address,
): Promise<bigint> => {
  const manager = NamespaceStorageKeyManager.getInstance();
  return manager.getDefaultStorageSlotKey(accountAddress, callerAddress);
};

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
    encodePacked(['address', 'address', 'uint256'], [accountAddress, callerAddress, defaultKey]),
  );
};
