import { Button } from './button';

export default function MobileOptimizedButton({ className = '', ...props }) {
  return (
    <Button
      className={`min-h-[44px] text-base ${className}`}
      {...props}
    />
  );
}
