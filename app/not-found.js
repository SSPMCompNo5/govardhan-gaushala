import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Page Not Found - Govardhan Goshala',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">404</CardTitle>
          <CardDescription className="text-gray-600">
            Page Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            The page you are looking for could not be found.
          </p>
          <Button asChild>
            <Link href="/">
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
