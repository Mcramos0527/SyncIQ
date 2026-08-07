import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  pending_validation: 'Pending validation',
  validated: 'Validated',
  rejected: 'Rejected',
  executed: 'Executed',
};

export const ProposalStatusBadge = (props: { status: string }) => {
  const label = STATUS_LABELS[props.status] ?? props.status;

  if (props.status === 'validated') {
    return <Badge className="border-transparent bg-emerald-600 text-white">{label}</Badge>;
  }

  if (props.status === 'rejected') {
    return <Badge variant="destructive">{label}</Badge>;
  }

  if (props.status === 'executed') {
    return <Badge>{label}</Badge>;
  }

  return <Badge variant="outline">{label}</Badge>;
};
