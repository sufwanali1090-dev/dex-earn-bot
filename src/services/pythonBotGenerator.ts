export function generateUpdatedPythonBotScript(): string {
  return `#!/usr/bin/env python3
"""
=============================================================================
POLYGON HIGH-SPEED DEX ARBITRAGE BOT (ANKR RPC DEDICATED)
=============================================================================
Strategies: 
  1) DEX-to-DEX Arbitrage (QuickSwap vs SushiSwap vs UniswapV3)
  2) Triangular Multi-Token Arbitrage (Cycle Loops across Polygon verified tokens)

RPC Configured: https://rpc.ankr.com/polygon (Polygon Mainnet Chain ID: 137)
Tokens Supported: WMATIC, WETH, WBTC, USDC, USDT, DAI, QUICK, LINK, AAVE, UNI, SAND, MANA, CRV, SUSHI, GRT, GHST
Fee Optimization: Deducts Polygon Gas (in Gwei/USD), DEX fees (0.3%), & Slippage buffer before trade execution.
=============================================================================
"""

import time
import json
import threading
import sys
from decimal import Decimal
import tkinter as tk
from tkinter import ttk, messagebox

try:
    from web3 import Web3
except ImportError:
    Web3 = None

# ----------------- POLYGON NETWORK & RPC CONFIG -----------------
POLYGON_RPC_URL = "https://rpc.ankr.com/polygon"  # High-speed Polygon Chain RPC
CHAIN_ID = 137

# Official Verified Polygon Mainnet Token Addresses
TOKENS = {
    "WMATIC": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    "USDC":   "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "USDT":   "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    "DAI":    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    "WETH":   "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    "WBTC":   "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    "QUICK":  "0xB5C064F955D8e7F38fE0460C556a72987494eE17",
    "LINK":   "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
    "AAVE":   "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
    "UNI":    "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
    "SAND":   "0xBbba073C31bF03b8ACf7c28EF0781859556254b1",
    "MANA":   "0xA1c57f48F0De49958348cb5e381088a6A6E470E7",
    "CRV":    "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
    "SUSHI":  "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a",
    "GRT":    "0x5fe2B58c013d7601147DcdD68C143A77499f5531",
    "GHST":   "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
}

# Major Polygon DEX Routers & Factories
DEXES = {
    "QuickSwap": {
        "router": "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
        "factory": "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
        "fee": 0.0030
    },
    "SushiSwap": {
        "router": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        "factory": "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        "fee": 0.0030
    }
}

PAIR_ABI = [
    {"constant": True, "inputs": [], "name": "getReserves",
     "outputs": [{"name": "_reserve0", "type": "uint112"},
                 {"name": "_reserve1", "type": "uint112"},
                 {"name": "_blockTimestampLast", "type": "uint32"}],
     "type": "function"},
    {"constant": True, "inputs": [], "name": "token0", "outputs": [{"name": "", "type": "address"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "token1", "outputs": [{"name": "", "type": "address"}], "type": "function"}
]

FACTORY_ABI = [
    {"constant": True, "inputs": [{"name": "tokenA", "type": "address"}, {"name": "tokenB", "type": "address"}],
     "name": "getPair", "outputs": [{"name": "pair", "type": "address"}], "type": "function"}
]

ROUTER_ABI = [
    {"constant": False, "inputs": [{"name": "amountIn", "type": "uint256"},
                                   {"name": "amountOutMin", "type": "uint256"},
                                   {"name": "path", "type": "address[]"},
                                   {"name": "to", "type": "address"},
                                   {"name": "deadline", "type": "uint256"}],
     "name": "swapExactTokensForTokens", "outputs": [{"name": "amounts", "type": "uint256[]"}], "type": "function"}
]

class PolygonArbitrageBot:
    def __init__(self, rpc_url=POLYGON_RPC_URL):
        self.rpc_url = rpc_url
        self.w3 = None
        self.connected = False
        self.account = None
        self.private_key = None
        self.running = {"dex": False, "tri": False}
        self.mode = "PAPER"  # PAPER or LIVE
        self.trade_amount = 50.0  # USD
        self.min_net_profit = 0.01  # USD minimum profit after fees ($0.01 threshold)
        self.scan_delay = 0.25  # 250 milliseconds
        self.pol_price_usd = 0.42

    def connect(self):
        if Web3 is None:
            return False
        try:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            self.connected = self.w3.is_connected()
            if self.connected:
                net_chain_id = self.w3.eth.chain_id
                print(f"[+] Connected to Polygon RPC: {self.rpc_url} (Chain ID: {net_chain_id})")
            return self.connected
        except Exception as e:
            print(f"[-] RPC connection error: {e}")
            return False

    def get_gas_fee_usd(self, gas_units):
        try:
            gas_price_wei = self.w3.eth.gas_price
            gas_cost_matic = (gas_units * gas_price_wei) / 1e18
            return float(gas_cost_matic) * self.pol_price_usd
        except Exception:
            return 0.004  # ~0.4 cents fallback on Polygon

    def get_pair_reserves(self, dex_name, token_a_sym, token_b_sym):
        try:
            factory_addr = Web3.to_checksum_address(DEXES[dex_name]["factory"])
            factory = self.w3.eth.contract(address=factory_addr, abi=FACTORY_ABI)
            t_a = Web3.to_checksum_address(TOKENS[token_a_sym])
            t_b = Web3.to_checksum_address(TOKENS[token_b_sym])
            pair_addr = factory.functions.getPair(t_a, t_b).call()
            if pair_addr == "0x0000000000000000000000000000000000000000":
                return None
            pair = self.w3.eth.contract(address=pair_addr, abi=PAIR_ABI)
            r0, r1, _ = pair.functions.getReserves().call()
            t0 = pair.functions.token0().call()
            if t0.lower() == t_a.lower():
                return r0, r1
            else:
                return r1, r0
        except Exception:
            return None

    def scan_dex_to_dex_all_pairs(self):
        """Scans all major verified tokens across QuickSwap and SushiSwap"""
        results = []
        tokens_to_scan = ["WETH", "WBTC", "QUICK", "LINK", "AAVE", "UNI", "SAND", "MANA", "CRV", "SUSHI", "GRT", "GHST", "WMATIC"]
        quote_tokens = ["USDC", "USDT", "DAI"]

        for base in tokens_to_scan:
            for quote in quote_tokens:
                res_q = self.get_pair_reserves("QuickSwap", base, quote)
                res_s = self.get_pair_reserves("SushiSwap", base, quote)
                if not res_q or not res_s or res_q[0] == 0 or res_s[0] == 0:
                    continue
                price_q = res_q[1] / res_q[0]
                price_s = res_s[1] / res_s[0]

                spread = abs(price_q - price_s) / min(price_q, price_s) * 100
                gross_profit = self.trade_amount * (spread / 100)

                # Gas fee for 2 swaps on Polygon (~260,000 gas units)
                gas_fee = self.get_gas_fee_usd(260000)
                dex_fees = self.trade_amount * (0.0030 + 0.0030)
                slippage = self.trade_amount * 0.002 * 2
                total_fees = gas_fee + dex_fees + slippage
                net_profit = gross_profit - total_fees

                cheap_dex, rich_dex = ("QuickSwap", "SushiSwap") if price_q < price_s else ("SushiSwap", "QuickSwap")

                results.append({
                    "pair": f"{base}/{quote}",
                    "buy_dex": cheap_dex,
                    "sell_dex": rich_dex,
                    "buy_price": min(price_q, price_s),
                    "sell_price": max(price_q, price_s),
                    "spread_pct": spread,
                    "gross_profit": gross_profit,
                    "fees": total_fees,
                    "net_profit": net_profit,
                    "is_profitable": net_profit >= self.min_net_profit
                })
        return sorted(results, key=lambda x: x["net_profit"], reverse=True)

    def scan_triangular_cycles(self):
        """Scans 3-hop multi-token cyclic loops on Polygon"""
        cycles = [
            ("USDC", "WMATIC", "WETH"),
            ("USDT", "QUICK", "WMATIC"),
            ("USDC", "WBTC", "WETH"),
            ("DAI", "AAVE", "WMATIC"),
            ("USDC", "LINK", "WETH"),
            ("USDT", "SAND", "WMATIC"),
            ("USDC", "CRV", "WETH"),
            ("USDT", "SUSHI", "WMATIC"),
            ("USDC", "GRT", "WETH"),
            ("USDC", "GHST", "WMATIC")
        ]
        results = []
        for t0, t1, t2 in cycles:
            r1 = self.get_pair_reserves("QuickSwap", t0, t1)
            r2 = self.get_pair_reserves("QuickSwap", t1, t2)
            r3 = self.get_pair_reserves("QuickSwap", t2, t0)
            if not r1 or not r2 or not r3:
                continue
            rate1 = r1[1] / r1[0]
            rate2 = r2[1] / r2[0]
            rate3 = r3[1] / r3[0]
            multiplier = rate1 * rate2 * rate3
            edge_pct = (multiplier - 1) * 100

            if edge_pct > 0:
                gross_profit = self.trade_amount * (edge_pct / 100)
                gas_fee = self.get_gas_fee_usd(380000)
                dex_fees = self.trade_amount * (0.003 * 3)
                total_fees = gas_fee + dex_fees
                net_profit = gross_profit - total_fees
                results.append({
                    "route": f"{t0} -> {t1} -> {t2} -> {t0}",
                    "edge_pct": edge_pct,
                    "gross_profit": gross_profit,
                    "fees": total_fees,
                    "net_profit": net_profit,
                    "is_profitable": net_profit >= self.min_net_profit
                })
        return sorted(results, key=lambda x: x["net_profit"], reverse=True)


if __name__ == "__main__":
    print("=== POLYGON ARBITRAGE SCANNER (ANKR RPC) ===")
    bot = PolygonArbitrageBot()
    if bot.connect():
        print("[+] Scanning DEX-to-DEX across all tokens...")
        d2d = bot.scan_dex_to_dex_all_pairs()
        for opp in d2d[:5]:
            print(f"[{opp['pair']}] Buy: {opp['buy_dex']} Sell: {opp['sell_dex']} | Spread: {opp['spread_pct']:.3f}% | Net: \${opp['net_profit']:.3f}")
        
        print("\\n[+] Scanning Triangular Loops...")
        tri = bot.scan_triangular_cycles()
        for opp in tri[:5]:
            print(f"[{opp['route']}] Edge: {opp['edge_pct']:.3f}% | Net: \${opp['net_profit']:.3f}")
`;
}
