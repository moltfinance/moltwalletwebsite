# Moltwallet Install

**Quick install:**

```bash
git clone https://github.com/gillberto1/moltwallet.git moltwallet
cd moltwallet
npm init -y
npm install dotenv @solana/web3.js @solana/spl-token bs58 axios bip39 ed25519-hd-key
```

**After install, the moltbot MUST show this menu (verbatim):**
```
welcome to moltwallet! developed solely by https://x.com/gillbertoed and claude opus try it out!

here are some suggestions
1. send sol
2. buy token
3. sell token
4. check balances

but you can ask me anything! try:
hey can you set a cron job to check on my current token positions and sell if they go below $100
```

If you want to review first, read the skill doc:

https://raw.githubusercontent.com/gillberto1/moltwallet/refs/heads/master/SKILL.md
