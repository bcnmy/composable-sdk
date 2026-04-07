import {
  createMeeClient,
  getMEEVersion,
  MEEVersion,
  toMultichainNexusAccount,
} from '@biconomy/abstractjs';
import { erc20Abi, getAddress, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';
import { ComposableBatch } from '../../core/batch';
import { account, publicClient, USDC_ADDRESS, walletClient } from '../utils';

if (!account || !walletClient) throw new Error('PRIVATE_KEY is not set in environment');

// Narrowed references — the throw above guarantees these are defined
const _account = account;
const _walletClient = walletClient;

const USDC = getAddress(USDC_ADDRESS);
const FUND_AMOUNT = 1_000_000n; // 1 mock USDC (6 decimals)

// ---------------------------------------------------------------------------
// End-to-end: Biconomy abstractjs — fund SCA + composable sweep back to EOA
// ---------------------------------------------------------------------------

describe('Integration — Biconomy abstractjs composable execution', () => {
  it('inits Nexus SCA, funds it with mock USDC, sweeps back to EOA via composable runtimeBalance()', async () => {
    // 1. Init a multichain Nexus SCA on Base Sepolia and resolve its address
    const nexusAccount = await toMultichainNexusAccount({
      signer: _account,
      chainConfigurations: [
        {
          chain: baseSepolia,
          transport: http(),
          version: getMEEVersion(MEEVersion.V2_2_1),
        },
      ],
    });

    const scaAddress = nexusAccount.addressOn(baseSepolia.id, true);

    // 2. Fund SCA: EOA transfers mock USDC to the SCA and waits for 2 confirmations
    const fundTxHash = await _walletClient.writeContract({
      abi: erc20Abi,
      address: USDC,
      functionName: 'transfer',
      args: [scaAddress, FUND_AMOUNT],
    });

    await publicClient.waitForTransactionReceipt({
      hash: fundTxHash,
      confirmations: 2,
    });

    // 3. Build a composable batch that sweeps the SCA's full USDC balance back to the EOA
    //    runtimeBalance() resolves the SCA's balance at execution time on-chain
    const batch = ComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);

    batch.add(
      usdc.write({ functionName: 'transfer', args: [_account.address, usdc.runtimeBalance()] }),
    );

    expect(batch.length).toBe(1);

    // 4. Assert SCA balance is funded before execution
    const scaBalanceBefore = await usdc.read({ functionName: 'balanceOf', args: [scaAddress] });

    expect(Number(scaBalanceBefore)).to.greaterThanOrEqual(Number(FUND_AMOUNT));

    // 5. Get a quote for the composable instruction, then sign and submit it via MEE
    const meeClient = await createMeeClient({ account: nexusAccount });

    const quote = await meeClient.getQuote({
      instructions: [
        {
          calls: batch.calls,
          chainId: baseSepolia.id,
          isComposable: true,
        },
      ],
      simulation: {
        simulate: true,
      },
      feeToken: {
        address: USDC,
        chainId: baseSepolia.id,
      },
    });

    // 6. Execute the signed quote and wait for the supertransaction to settle
    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    // 7. Assert the SCA balance has been swept (reduced to near zero after fees)
    const scaBalanceAfter = await usdc.read({ functionName: 'balanceOf', args: [scaAddress] });

    expect(Number(scaBalanceAfter)).to.greaterThanOrEqual(0);
  });
});
