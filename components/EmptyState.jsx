'use client';

export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
      <div className="text-lg font-medium mb-1">{title}</div>
      {description && <div className="text-sm mb-3">{description}</div>}
      {action}
    </div>
  );
}


