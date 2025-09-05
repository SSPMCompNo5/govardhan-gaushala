import { Card, CardContent, CardHeader, CardTitle } from './card';

export default function MobileOptimizedCard({ title, children, className = '' }) {
  return (
    <Card className={`${className}`}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
