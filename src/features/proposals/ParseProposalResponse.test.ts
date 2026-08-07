import { describe, expect, it } from 'vitest';
import { parseProposalResponse } from './ParseProposalResponse';

const validProposal = {
  problem: 'Campaign c1 is spending heavily with a low ROAS',
  root_cause: 'CPM has doubled week over week while conversion rate held flat',
  proposal: {
    action: 'pause_campaign',
    target: 'c1',
    change: { field: 'status', from: 'active', to: 'paused' },
    expected_impact: 'Stops ~$400/week of low-return spend',
  },
  confidence: 0.82,
  supporting_metrics: ['cpm', 'roas'],
};

describe('parseProposalResponse', () => {
  it('accepts a well-formed proposal', () => {
    const result = parseProposalResponse(JSON.stringify(validProposal));

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.problem).toBe(validProposal.problem);
      expect(result.data.proposal.action).toBe('pause_campaign');
    }
  });

  it('rejects malformed JSON', () => {
    const result = parseProposalResponse('{not valid json');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/JSON/i);
    }
  });

  it('rejects a payload with an unknown action', () => {
    const invalid = { ...validProposal, proposal: { ...validProposal.proposal, action: 'delete_everything' } };
    const result = parseProposalResponse(JSON.stringify(invalid));

    expect(result.success).toBe(false);
  });

  it('rejects confidence outside 0-1', () => {
    const invalid = { ...validProposal, confidence: 1.5 };
    const result = parseProposalResponse(JSON.stringify(invalid));

    expect(result.success).toBe(false);
  });

  it('rejects a payload missing required fields', () => {
    const { problem, ...rest } = validProposal;
    const result = parseProposalResponse(JSON.stringify(rest));

    expect(result.success).toBe(false);
  });
});
