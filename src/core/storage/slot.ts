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

/**
 * Computes the base storage slot: keccak256(encodePacked(accountAddress, callerAddress, storageKey)).
 * The capture flow will pass the base slot to the composability module in
 * outputParam paramData so the module can derive its own indexed slots on-chain as
 * keccak256(encodePacked(baseSlot, uint256(i))).
 */
export const getBaseStorageSlot = async (
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

/**
 * Computes the indexed storage slot for a given key and slot index.
 * slot = keccak256(encodePacked(baseSlot, uint256(slotIndex)))
 * Mirrors the on-chain derivation: SLOT_i = keccak256(abi.encodePacked(SLOT, uint256(i))).
 * slotIndex defaults to 0
 */
export const getStorageSlot = async (
  accountAddress: Address,
  callerAddress: Address,
  storageKey?: bigint,
  slotIndex?: number,
): Promise<Hex> => {
  const baseSlot = await getBaseStorageSlot(accountAddress, callerAddress, storageKey);
  if (slotIndex === undefined) return baseSlot;
  return keccak256(encodePacked(['bytes32', 'uint256'], [baseSlot, BigInt(slotIndex)]));
};
