import { Router, Request, Response } from 'express';

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MASTER' | 'AGENT' | 'MEMBER';
  uplineId: string | null;
  creditLimit: number;
  balance: number;
  status: 'ACTIVE' | 'SUSPENDED';
  activePlayersCount?: number;
  phone?: string;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  timestamp: string;
  sourceAccount: string;
  targetAccount: string;
  amount: number;
  type: 'ALLOCATE' | 'RECALL';
  note: string;
  executedBy: string;
}

// Initial Hierarchy State
let accounts: AdminAccount[] = [
  {
    id: 'ACC_ROOT_001',
    username: 'superadmin',
    name: 'Super Admin Master Core',
    role: 'SUPER_ADMIN',
    uplineId: null,
    creditLimit: 50000000,
    balance: 9425000,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'ACC_MST_001',
    username: 'master_hcm_01',
    name: 'Master Agent — Southern Vietnam',
    role: 'MASTER',
    uplineId: 'ACC_ROOT_001',
    creditLimit: 2000000,
    balance: 485000,
    status: 'ACTIVE',
    activePlayersCount: 42,
    phone: '+84 908 112 334',
    createdAt: '2026-09-02T10:30:00Z'
  },
  {
    id: 'ACC_MST_002',
    username: 'master_danang_02',
    name: 'Master Agent — Central Region',
    role: 'MASTER',
    uplineId: 'ACC_ROOT_001',
    creditLimit: 1000000,
    balance: 210000,
    status: 'ACTIVE',
    activePlayersCount: 19,
    phone: '+84 913 554 789',
    createdAt: '2026-09-03T11:15:00Z'
  },
  {
    id: 'ACC_AGT_001',
    username: 'agent_quan1',
    name: 'Agent District 1 (Ben Nghe)',
    role: 'AGENT',
    uplineId: 'ACC_MST_001',
    creditLimit: 250000,
    balance: 76500,
    status: 'ACTIVE',
    activePlayersCount: 24,
    phone: '+84 938 776 221',
    createdAt: '2026-09-04T09:00:00Z'
  },
  {
    id: 'ACC_AGT_002',
    username: 'agent_binhthanh',
    name: 'Agent Binh Thanh (D2 Hub)',
    role: 'AGENT',
    uplineId: 'ACC_MST_001',
    creditLimit: 180000,
    balance: 34200,
    status: 'ACTIVE',
    activePlayersCount: 18,
    phone: '+84 947 889 001',
    createdAt: '2026-09-04T14:20:00Z'
  },
  {
    id: 'ACC_AGT_003',
    username: 'agent_haichau',
    name: 'Agent Da Nang Hai Chau',
    role: 'AGENT',
    uplineId: 'ACC_MST_002',
    creditLimit: 150000,
    balance: 88000,
    status: 'ACTIVE',
    activePlayersCount: 19,
    phone: '+84 905 443 210',
    createdAt: '2026-09-05T08:45:00Z'
  },
  {
    id: 'ACC_USR_001',
    username: 'player88',
    name: 'Tran Van H.',
    role: 'MEMBER',
    uplineId: 'ACC_AGT_001',
    creditLimit: 20000,
    balance: 2450,
    status: 'ACTIVE',
    createdAt: '2026-09-06T12:00:00Z'
  },
  {
    id: 'ACC_USR_002',
    username: 'bettor_vip',
    name: 'Nguyen Minh T.',
    role: 'MEMBER',
    uplineId: 'ACC_AGT_001',
    creditLimit: 50000,
    balance: 8900,
    status: 'ACTIVE',
    createdAt: '2026-09-06T15:30:00Z'
  },
  {
    id: 'ACC_USR_003',
    username: 'lucky_strike',
    name: 'Le Hoang K.',
    role: 'MEMBER',
    uplineId: 'ACC_AGT_002',
    creditLimit: 10000,
    balance: 350,
    status: 'SUSPENDED',
    createdAt: '2026-09-07T16:10:00Z'
  }
];

let creditAuditLogs: CreditTransaction[] = [
  {
    id: 'TX_CRD_178904001',
    timestamp: '2026-09-08T09:12:00Z',
    sourceAccount: 'superadmin',
    targetAccount: 'master_hcm_01',
    amount: 100000,
    type: 'ALLOCATE',
    note: 'Initial Weekly Staging Allocation',
    executedBy: 'Super Admin'
  },
  {
    id: 'TX_CRD_178904002',
    timestamp: '2026-09-08T10:45:00Z',
    sourceAccount: 'master_hcm_01',
    targetAccount: 'agent_quan1',
    amount: 30000,
    type: 'ALLOCATE',
    note: 'Sub-tier credit distribution',
    executedBy: 'master_hcm_01'
  },
  {
    id: 'TX_CRD_178904003',
    timestamp: '2026-09-09T14:20:00Z',
    sourceAccount: 'agent_quan1',
    targetAccount: 'bettor_vip',
    amount: 5000,
    type: 'ALLOCATE',
    note: 'Member deposit grant',
    executedBy: 'agent_quan1'
  }
];

const router = Router();

// GET /api/admin/hierarchy
// Returns complete multi-tier Asian betting hierarchy with upline/downline relationships
router.get('/hierarchy', (_req: Request, res: Response) => {
  res.json({
    success: true,
    platform: 'SBOBET / Fanclub68 Staging Master Hierarchy',
    totalAccounts: accounts.length,
    summary: {
      masters: accounts.filter(a => a.role === 'MASTER').length,
      agents: accounts.filter(a => a.role === 'AGENT').length,
      members: accounts.filter(a => a.role === 'MEMBER').length,
      activeAccounts: accounts.filter(a => a.status === 'ACTIVE').length,
      suspendedAccounts: accounts.filter(a => a.status === 'SUSPENDED').length
    },
    accounts
  });
});

// POST /api/admin/credit/distribute
// Manual Virtual Credit Distribution framework (Allocate or Recall credits between tiers)
router.post('/credit/distribute', (req: Request, res: Response) => {
  const { targetAccountId, amount, type = 'ALLOCATE', note = 'Admin manual virtual credit distribution' } = req.body;

  const parsedAmount = parseFloat(amount);
  if (!targetAccountId || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid target account or amount.' });
  }

  const target = accounts.find(a => a.id === targetAccountId || a.username === targetAccountId);
  if (!target) {
    return res.status(404).json({ success: false, error: `Account "${targetAccountId}" not found.` });
  }

  if (target.status === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      error: `Cannot distribute credit: Account "${target.username}" is currently SUSPENDED.`
    });
  }

  if (type === 'RECALL' && target.balance < parsedAmount) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance to recall. Account has $${target.balance.toFixed(2)}, requested recall of $${parsedAmount.toFixed(2)}.`
    });
  }

  // Update target balance
  if (type === 'ALLOCATE') {
    target.balance += parsedAmount;
  } else {
    target.balance -= parsedAmount;
  }

  // Record into audit ledger
  const tx: CreditTransaction = {
    id: `TX_CRD_${Date.now()}`,
    timestamp: new Date().toISOString(),
    sourceAccount: 'superadmin',
    targetAccount: target.username,
    amount: parsedAmount,
    type: type as 'ALLOCATE' | 'RECALL',
    note,
    executedBy: 'Super Admin'
  };
  creditAuditLogs.unshift(tx);

  res.json({
    success: true,
    message: `Successfully ${type === 'ALLOCATE' ? 'allocated' : 'recalled'} $${parsedAmount.toLocaleString()} to ${target.name} (${target.username}).`,
    targetAccount: target,
    transaction: tx
  });
});

// POST /api/admin/accounts/create
// Create a simulated account (Master, Agent, or Member) in the hierarchy
router.post('/accounts/create', (req: Request, res: Response) => {
  const { username, name, role, uplineId, creditLimit = 50000, initialBalance = 10000 } = req.body;

  if (!username || !name || !role) {
    return res.status(400).json({ success: false, error: 'Username, name, and role are required.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  if (accounts.some(a => a.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ success: false, error: `Account username "@${cleanUsername}" already exists.` });
  }

  const prefix = role === 'MASTER' ? 'ACC_MST' : role === 'AGENT' ? 'ACC_AGT' : 'ACC_USR';
  const newAccount: AdminAccount = {
    id: `${prefix}_${Math.floor(100 + Math.random() * 900)}`,
    username: cleanUsername,
    name: name.trim(),
    role: role as 'MASTER' | 'AGENT' | 'MEMBER',
    uplineId: uplineId || 'ACC_ROOT_001',
    creditLimit: parseFloat(creditLimit) || 50000,
    balance: parseFloat(initialBalance) || 0,
    status: 'ACTIVE',
    activePlayersCount: role === 'MEMBER' ? undefined : 0,
    createdAt: new Date().toISOString()
  };

  accounts.push(newAccount);

  if (newAccount.balance > 0) {
    const tx: CreditTransaction = {
      id: `TX_CRD_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceAccount: uplineId || 'superadmin',
      targetAccount: newAccount.username,
      amount: newAccount.balance,
      type: 'ALLOCATE',
      note: 'Initial simulated account creation grant',
      executedBy: 'Super Admin'
    };
    creditAuditLogs.unshift(tx);
  }

  res.json({
    success: true,
    message: `Simulated account "${newAccount.name}" (@${newAccount.username}) created successfully as ${newAccount.role}.`,
    account: newAccount
  });
});

// POST /api/admin/users/toggle-suspend
// User Suspension Toggle inside Admin panel
router.post('/users/toggle-suspend', (req: Request, res: Response) => {
  const { accountId, reason = 'Administrative safety review' } = req.body;

  const target = accounts.find(a => a.id === accountId || a.username === accountId);
  if (!target) {
    return res.status(404).json({ success: false, error: `Account "${accountId}" not found.` });
  }

  if (target.role === 'SUPER_ADMIN') {
    return res.status(400).json({ success: false, error: 'Cannot suspend root Super Admin account.' });
  }

  // Toggle status
  const oldStatus = target.status;
  target.status = oldStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

  res.json({
    success: true,
    message: `Account "${target.username}" status changed from ${oldStatus} to ${target.status}.`,
    account: target,
    reason
  });
});

// GET /api/admin/audit-logs
// Audit trail of virtual credit distributions
router.get('/audit-logs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: creditAuditLogs.length,
    logs: creditAuditLogs
  });
});

export const adminManagementRouter = router;
