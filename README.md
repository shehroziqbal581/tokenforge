# On-chain trading / bonding-curve layer

The included web app creates fixed-supply SPL tokens and routes the configured launch fee directly to the public fee wallet. It intentionally does **not** pretend that a token is tradeable when no liquidity exists.

For a Pump.fun-style launchpad, add a real on-chain bonding-curve or AMM layer. Current Solana ecosystem options include Meteora Dynamic Bonding Curve and Raydium pools. The production integration should use their current SDK/docs, configure the platform/partner fee receiver, create the pool, and expose real buy/sell transactions.

Do not deploy unreviewed financial smart-contract code to mainnet. Audit and test the final trading program/configuration first.
