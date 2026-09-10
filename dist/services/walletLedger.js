export class WalletLedger {
    wallet = {
        balance: 1000.00,
        inPlayBalance: 0.00,
        history: [
            {
                id: 'tx_init_001',
                type: 'Credit',
                amount: 1000.00,
                balanceAfter: 1000.00,
                description: 'Initial Simulation Wallet Balance',
                createdAt: new Date().toISOString(),
            }
        ]
    };
    getWallet() {
        return { ...this.wallet };
    }
    getBalance() {
        return this.wallet.balance;
    }
    holdFunds(amount, description) {
        if (amount <= 0 || this.wallet.balance < amount) {
            return false;
        }
        this.wallet.balance = Math.round((this.wallet.balance - amount) * 100) / 100;
        this.wallet.inPlayBalance = Math.round((this.wallet.inPlayBalance + amount) * 100) / 100;
        this.recordTransaction('Hold', amount, description);
        return true;
    }
    releaseHold(amount, description) {
        const safeAmount = Math.min(amount, this.wallet.inPlayBalance);
        this.wallet.inPlayBalance = Math.round((this.wallet.inPlayBalance - safeAmount) * 100) / 100;
        this.wallet.balance = Math.round((this.wallet.balance + safeAmount) * 100) / 100;
        this.recordTransaction('Refund', safeAmount, description);
    }
    commitBet(amount, description) {
        const safeAmount = Math.min(amount, this.wallet.inPlayBalance);
        this.wallet.inPlayBalance = Math.round((this.wallet.inPlayBalance - safeAmount) * 100) / 100;
        this.recordTransaction('Debit', safeAmount, description);
    }
    creditWinnings(amount, description) {
        if (amount <= 0)
            return;
        this.wallet.balance = Math.round((this.wallet.balance + amount) * 100) / 100;
        this.recordTransaction('Credit', amount, description);
    }
    deposit(amount) {
        if (amount <= 0)
            throw new Error('Deposit amount must be greater than zero');
        this.wallet.balance = Math.round((this.wallet.balance + amount) * 100) / 100;
        this.recordTransaction('Credit', amount, `Direct Deposit +$${amount.toFixed(2)}`);
        return this.getWallet();
    }
    reset(amount = 1000.00) {
        this.wallet.balance = amount;
        this.wallet.inPlayBalance = 0.00;
        this.recordTransaction('Credit', amount, `Wallet Reset to $${amount.toFixed(2)}`);
        return this.getWallet();
    }
    recordTransaction(type, amount, description) {
        const tx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type,
            amount,
            balanceAfter: this.wallet.balance,
            description,
            createdAt: new Date().toISOString(),
        };
        this.wallet.history.unshift(tx);
        if (this.wallet.history.length > 50) {
            this.wallet.history.pop();
        }
    }
}
export const walletLedger = new WalletLedger();
