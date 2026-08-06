import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ConnectionRow = (props: {
  name: string;
  description: string;
  connected: boolean;
  accountId?: string;
  connectHref: string;
}) => (
  <div className="
    flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3
    shadow-sm
  "
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{props.name}</span>
        <Badge variant={props.connected ? 'secondary' : 'outline'}>
          {props.connected ? 'Connected' : 'Not connected'}
        </Badge>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {props.connected && props.accountId
          ? `Account ${props.accountId}`
          : props.description}
      </p>
    </div>

    <Button asChild size="sm" variant={props.connected ? 'outline' : 'default'}>
      <a href={props.connectHref}>{props.connected ? 'Reconnect' : 'Connect'}</a>
    </Button>
  </div>
);
