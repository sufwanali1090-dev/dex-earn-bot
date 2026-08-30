import { ethers } from 'ethers';

export class NonceManager {
  private nonceMap: Map<string, number> = new Map();
  private inFlightNonces: Map<string, Set<number>> = new Map();

  /**
   * Resets and gets latest pending transaction count from network
   */
  public async getNextNonce(provider: ethers.Provider, address: string): Promise<number> {
    const normAddress = address.toLowerCase();
    
    // Fetch latest pending count
    const onChainNonce = await provider.getTransactionCount(address, 'pending');
    
    let current = this.nonceMap.get(normAddress);
    if (current === undefined || current < onChainNonce) {
      current = onChainNonce;
    }

    const assigned = current;
    this.nonceMap.set(normAddress, current + 1);

    // Track in flight
    let inFlight = this.inFlightNonces.get(normAddress);
    if (!inFlight) {
      inFlight = new Set();
      this.inFlightNonces.set(normAddress, inFlight);
    }
    inFlight.add(assigned);

    return assigned;
  }

  public releaseNonce(address: string, nonce: number, success: boolean) {
    const normAddress = address.toLowerCase();
    const inFlight = this.inFlightNonces.get(normAddress);
    if (inFlight) {
      inFlight.delete(nonce);
    }

    if (!success) {
      // If failed, reset the local tracker so next attempt fetches fresh on-chain count
      this.nonceMap.delete(normAddress);
    }
  }

  public reset(address?: string) {
    if (address) {
      this.nonceMap.delete(address.toLowerCase());
      this.inFlightNonces.delete(address.toLowerCase());
    } else {
      this.nonceMap.clear();
      this.inFlightNonces.clear();
    }
  }
}

export const nonceManager = new NonceManager();
