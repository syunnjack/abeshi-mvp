import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDecision } from '../scripts/decision-engine.mjs';

test('decision engine selects a low-cost route for occasional budget-first use', () => {
  const result = evaluateDecision({ priority: 'cost', frequency: 1, flexibility: 'high', monthlyBudget: 10000 });
  assert.equal(result.winner.id, 'cost');
  assert.equal(result.targetMonthlyBudget, 6500);
  assert.equal(result.annualBudget, 78000);
  assert.equal(result.costPerUse, 6500);
});

test('decision engine selects assurance for frequent safety-sensitive use', () => {
  const result = evaluateDecision({ priority: 'quality', frequency: 20, flexibility: 'low', risk: 'ymyl', monthlyBudget: 20000 });
  assert.equal(result.winner.id, 'assurance');
  assert.equal(result.targetMonthlyBudget, 20000);
  assert.match(result.riskNote, /専門的な判断の代わりにはなりません/);
});

test('decision engine returns a transparent balanced simulation', () => {
  const result = evaluateDecision({ priority: 'balance', frequency: 10, flexibility: 'normal', monthlyBudget: 20000 });
  assert.equal(result.winner.id, 'balance');
  assert.equal(result.targetMonthlyBudget, 17000);
  assert.equal(result.annualBudget, 204000);
  assert.equal(result.costPerUse, 1700);
  assert.equal(result.ranked.length, 3);
  assert.equal(result.reasons.length, 3);
});

