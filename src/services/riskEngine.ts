import { DexToDexOpportunity, BotConfig, DailyRiskState, LossCategory } from '../types';

export class RiskEngine {
  private dailyRiskState: DailyRiskState;
  private routeCooldowns: Map<string, number> = new Map(); // routeKey -> cooldownExpiryMs
  private concurrencyLocks: Set<string> = new Set(); // oppId lock
  private static readonly STORAGE_KEY = 'polygon_bot_daily_risk';

  constructor() {
    this.dailyRiskState = this.loadDailyRiskState();
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private loadDailyRiskState(): DailyRiskState {
    const today = this.getTodayString();
    try {
      const saved = localStorage.getItem(RiskEngine.STORAGE_KEY);
      if (saved) {
        const parsed: DailyRiskState = JSON.parse(saved);
        if (parsed.dateString === today) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    const fresh: DailyRiskState = {
      dateString: today,
      dailyRealizedLossUsd: 0,
      dailyRealizedProfitUsd: 0,
      consecutiveFailures: 0,
      emergencyStopTriggered: false,
    };
    this.saveDailyRiskState(fresh);
    return fresh;
  }

  private saveDailyRiskState(state: DailyRiskState) {
    this.dailyRiskState = state;
    try {
      localStorage.setItem(RiskEngine.STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  public getDailyRiskState(): DailyRiskState {
    const today = this.getTodayString();
    if (this.dailyRiskState.dateString !== today) {
      this.dailyRiskState = this.loadDailyRiskState();
    }
    return { ...this.dailyRiskState };
  }

  public recordTradeResult(netProfitUsd: number, isSuccess: boolean) {
    const state = this.getDailyRiskState();
    if (isSuccess && netProfitUsd > 0) {
      state.dailyRealizedProfitUsd += netProfitUsd;
      state.consecutiveFailures = 0;
    } else {
      const loss = Math.abs(netProfitUsd);
      state.dailyRealizedLossUsd += loss;
      state.consecutiveFailures += 1;
    }

    this.saveDailyRiskState(state);
  }

  public setEmergencyStop(triggered: boolean) {
    const state = this.getDailyRiskState();
    state.emergencyStopTriggered = triggered;
    this.saveDailyRiskState(state);
  }

  public setRouteCooldown(routeKey: string, cooldownDurationMs: number = 60000) {
    const expiry = Date.now() + cooldownDurationMs;
    this.routeCooldowns.set(routeKey, expiry);
  }

  public isRouteInCooldown(routeKey: string): boolean {
    const expiry = this.routeCooldowns.get(routeKey);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.routeCooldowns.delete(routeKey);
      return false;
    }
    return true;
  }

  public acquireLock(oppId: string): boolean {
    if (this.concurrencyLocks.has(oppId)) {
      return false;
    }
    this.concurrencyLocks.add(oppId);
    return true;
  }

  public releaseLock(oppId: string) {
    this.concurrencyLocks.delete(oppId);
  }

  /**
   * Comprehensive Pre-Execution Safety Validation
   */
  public validateTradeSafety(
    opp: DexToDexOpportunity,
    config: BotConfig
  ): { safe: boolean; reason?: string; lossCategory?: LossCategory } {
    // 1. Global Emergency Stop check
    if (config.emergencyStop || this.dailyRiskState.emergencyStopTriggered) {
      return {
        safe: false,
        reason: 'Emergency Stop is active. All trading halted.',
        lossCategory: 'NONE',
      };
    }

    // 2. Daily Loss Limit check
    const state = this.getDailyRiskState();
    const maxDailyLoss = config.maxDailyLossUsd || 50;
    if (state.dailyRealizedLossUsd >= maxDailyLoss) {
      this.setEmergencyStop(true);
      return {
        safe: false,
        reason: `Daily loss limit reached ($${state.dailyRealizedLossUsd.toFixed(2)} / $${maxDailyLoss.toFixed(2)}). Trading halted for the day.`,
        lossCategory: 'NONE',
      };
    }

    // 3. Consecutive Failures Circuit Breaker
    if (state.consecutiveFailures >= 5) {
      return {
        safe: false,
        reason: `Circuit breaker: 5 consecutive failed transactions detected. Paused for safety.`,
        lossCategory: 'ROUTE_FAILURE',
      };
    }

    // 4. Route Cooldown check
    const routeKey = `${opp.baseToken.address}-${opp.buyDex.id}-${opp.sellDex.id}`;
    if (this.isRouteInCooldown(routeKey)) {
      return {
        safe: false,
        reason: `Route is in cooldown due to previous execution failure.`,
        lossCategory: 'ROUTE_FAILURE',
      };
    }

    // 5. Quote Age Freshness check (Prevents Stale Quotes)
    const maxQuoteAge = config.maxQuoteAgeMs || 10000;
    const quoteAge = Date.now() - (opp.timestamp || Date.now());
    if (quoteAge > maxQuoteAge) {
      return {
        safe: false,
        reason: `Quote is stale (${quoteAge}ms old > max ${maxQuoteAge}ms). Refreshing price.`,
        lossCategory: 'STALE_QUOTE',
      };
    }

    // 6. Net Profitability Requirement
    const minProfit = config.minProfitMarginUsd !== undefined ? config.minProfitMarginUsd : 0.01;
    if (opp.netProfitUsd < minProfit) {
      return {
        safe: false,
        reason: `Net profit ($${opp.netProfitUsd.toFixed(3)}) is below required minimum ($${minProfit.toFixed(2)}).`,
        lossCategory: 'PRICE_MOVEMENT',
      };
    }

    // 7. Price Impact Bound check
    const maxImpact = Math.max(opp.buyQuote?.priceImpactPercent || 0, opp.sellQuote?.priceImpactPercent || 0);
    const maxAllowedImpact = config.maxPriceImpactPercent || 2.5;
    if (maxImpact > maxAllowedImpact) {
      return {
        safe: false,
        reason: `Price impact (${maxImpact.toFixed(2)}%) exceeds safety ceiling (${maxAllowedImpact}%).`,
        lossCategory: 'PRICE_IMPACT',
      };
    }

    // 8. Strict Gas Shield check
    if (config.strictGasShield && opp.grossProfitUsd <= opp.gasFeeUsd + opp.dexFeesUsd) {
      return {
        safe: false,
        reason: `Gas Shield Active: Gross profit ($${opp.grossProfitUsd.toFixed(3)}) does not cover Gas ($${opp.gasFeeUsd.toFixed(3)}) + DEX Fees ($${opp.dexFeesUsd.toFixed(3)}).`,
        lossCategory: 'GAS',
      };
    }

    // 9. Selling Price Pre-Verification Guard
    if (opp.sellPrice <= opp.buyPrice) {
      return {
        safe: false,
        reason: `Selling Price Verification Failed: Selling price ($${opp.sellPrice.toFixed(4)}) is not higher than buying price ($${opp.buyPrice.toFixed(4)}).`,
        lossCategory: 'WRONG_QUOTE',
      };
    }

    if (opp.grossProfitUsd <= 0 || (opp.sellQuote && opp.sellQuote.outputAmount <= opp.tradeAmountUsd)) {
      return {
        safe: false,
        reason: `Selling Price Verification Failed: Sell return is lower than trade capital ($${opp.tradeAmountUsd.toFixed(2)}).`,
        lossCategory: 'WRONG_QUOTE',
      };
    }

    return { safe: true };
  }
}

export const riskEngine = new RiskEngine();
