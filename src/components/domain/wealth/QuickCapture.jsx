import React from 'react';
import { TrendingDown, TrendingUp, Calendar } from 'lucide-react';

const W = {
  surface: '#15181B',
  border:  '#1C1D21',
  border2: '#26272C',
  text:    '#F5F5F5',
  dim:     '#2A3038',
  accent:  '#1FA36F',
  danger:  '#EF4444',
  warning: '#F59E0B',
};

export default function QuickCapture({ onAddExpense, onAddIncome, onAddBill }) {
  const btns = [
    {
      label: '+ Expense',
      icon: <TrendingDown size={15} />,
      color: W.danger,
      onClick: onAddExpense,
      id: 'qc-expense',
    },
    {
      label: '+ Income',
      icon: <TrendingUp size={15} />,
      color: W.accent,
      onClick: onAddIncome,
      id: 'qc-income',
    },
    {
      label: '+ Bill',
      icon: <Calendar size={15} />,
      color: W.warning,
      onClick: onAddBill,
      id: 'qc-bill',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
      {btns.map(b => (
        <button
          key={b.id}
          id={b.id}
          onClick={b.onClick}
          style={{
            background: W.surface,
            border: `1px solid ${b.color}30`,
            borderRadius: '14px',
            padding: '14px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            color: b.color,
            fontWeight: 800,
            fontSize: '11px',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${b.color}10`;
            e.currentTarget.style.borderColor = `${b.color}60`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = W.surface;
            e.currentTarget.style.borderColor = `${b.color}30`;
          }}
        >
          {b.icon}
          {b.label}
        </button>
      ))}
    </div>
  );
}
