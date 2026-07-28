const optionProfiles = [
  {
    id: 'cost',
    label: '必要十分・低コスト案',
    summary: '必要条件を満たしながら、追加機能や長期的な負担を抑える選び方です。',
    targetBudgetRate: 0.65,
    attributes: { cost: 94, ease: 68, quality: 58, flexibility: 86 },
    checks: ['総額に含まれない追加費用', '無料期間後の料金', '解約・返品の条件']
  },
  {
    id: 'balance',
    label: '費用と使いやすさのバランス案',
    summary: '価格だけで決めず、使いやすさ、品質、変更のしやすさもそろえて比べる選び方です。',
    targetBudgetRate: 0.85,
    attributes: { cost: 78, ease: 88, quality: 82, flexibility: 78 },
    checks: ['同じ条件で比べた総額', '日常で使う機能の充足', '保証・サポート・解約窓口']
  },
  {
    id: 'assurance',
    label: '品質・安心優先案',
    summary: '費用より、根拠、耐久性、安全性、サポートを優先して候補を絞る選び方です。',
    targetBudgetRate: 1,
    attributes: { cost: 56, ease: 76, quality: 96, flexibility: 66 },
    checks: ['公的資料・公式仕様・第三者検証', '保証範囲と相談先', '安全面・個人差・利用できない条件']
  }
];

const priorityWeights = {
  cost: { cost: 0.55, ease: 0.15, quality: 0.20, flexibility: 0.10 },
  balance: { cost: 0.25, ease: 0.30, quality: 0.30, flexibility: 0.15 },
  quality: { cost: 0.12, ease: 0.16, quality: 0.57, flexibility: 0.15 }
};

const riskNotes = {
  standard: '結果は候補を絞るための目安です。料金・仕様・契約条件は、申込み前に公式情報で確認してください。',
  review: '高額な購入や長期契約は、見積総額、保証、解約条件を公式窓口で確認してから判断してください。',
  ymyl: 'これは情報整理の補助であり、診断・治療・投資・安全性に関する専門的な判断の代わりにはなりません。必要に応じて有資格者や公的窓口に相談してください。',
  sensitive: '金銭の要求や外部サービスへの誘導がある場合は進めず、本人確認、通報方法、個人情報の扱いを確認してください。',
  adult: '年齢、同意、請求名義、解約方法、個人情報の削除手順を確認し、不審な請求には応じないでください。'
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function evaluateDecision(input = {}) {
  const priority = Object.hasOwn(priorityWeights, input.priority) ? input.priority : 'balance';
  const risk = Object.hasOwn(riskNotes, input.risk) ? input.risk : 'standard';
  const frequency = clamp(Number.parseInt(input.frequency, 10) || 4, 1, 60);
  const rawBudget = Number(input.monthlyBudget);
  const monthlyBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? clamp(Math.round(rawBudget), 1, 100000000) : null;
  const flexibility = ['high', 'normal', 'low'].includes(input.flexibility) ? input.flexibility : 'normal';
  const weights = { ...priorityWeights[priority] };

  if (flexibility === 'high') {
    const key = priority === 'quality' ? 'quality' : priority === 'cost' ? 'cost' : 'ease';
    weights[key] -= 0.12;
    weights.flexibility += 0.12;
  } else if (flexibility === 'low') {
    const key = priority === 'quality' ? 'quality' : priority === 'cost' ? 'cost' : 'ease';
    weights[key] += 0.06;
    weights.flexibility -= 0.06;
  }

  const results = optionProfiles.map(option => {
    let score = Object.entries(weights).reduce((total, [key, weight]) => total + option.attributes[key] * weight, 0);
    if (frequency >= 12) score += option.id === 'assurance' ? 5 : option.id === 'balance' ? 2 : -3;
    if (frequency <= 2) score += option.id === 'cost' ? 4 : option.id === 'balance' ? 1 : -2;
    if (risk === 'ymyl' || risk === 'sensitive' || risk === 'adult') score += option.id === 'assurance' ? 6 : option.id === 'balance' ? 2 : -2;
    return { ...option, score: clamp(Math.round(score), 0, 100) };
  }).sort((left, right) => right.score - left.score);

  const winner = results[0];
  const gap = winner.score - results[1].score;
  const targetMonthlyBudget = monthlyBudget ? Math.round(monthlyBudget * winner.targetBudgetRate) : null;
  const annualBudget = targetMonthlyBudget ? targetMonthlyBudget * 12 : null;
  const costPerUse = targetMonthlyBudget ? Math.round(targetMonthlyBudget / frequency) : null;
  const frequencyReason = frequency >= 12
    ? '利用頻度が高いため、耐久性・品質・サポートを強めに評価しました。'
    : frequency <= 2
      ? '利用頻度が低いため、固定費や過剰機能を抑える方向を強めに評価しました。'
      : '利用頻度が中程度のため、費用と使いやすさを両方評価しました。';

  return {
    winner,
    ranked: results.map(({ id, label, score }) => ({ id, label, score })),
    confidence: gap >= 8 ? '差がはっきり' : gap >= 4 ? 'やや優位' : '候補が近い',
    targetMonthlyBudget,
    annualBudget,
    costPerUse,
    reasons: [
      `「${priority === 'cost' ? '料金' : priority === 'quality' ? '品質・安心' : 'バランス'}」を最優先として採点しました。`,
      frequencyReason,
      flexibility === 'high' ? '変更・解約のしやすさを強く評価しました。' : flexibility === 'low' ? '長期利用を前提に評価しました。' : '変更のしやすさも標準的に評価しました。'
    ],
    riskNote: riskNotes[risk]
  };
}

export const decisionOptionLabels = optionProfiles.map(({ id, label }) => ({ id, label }));

