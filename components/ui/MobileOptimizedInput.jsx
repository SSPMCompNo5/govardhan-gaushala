import { Input } from './input';

export default function MobileOptimizedInput({ className = '', ...props }) {
  return (
    <Input
      className={`min-h-[44px] text-base ${className}`}
      {...props}
    />
  );
}
