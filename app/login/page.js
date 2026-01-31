"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Wrap the component that uses useSearchParams in a separate component
function LoginForm() {
    const params = useSearchParams();
    const nextUrl = params.get("next");

    return (
        <LoginPageContent nextUrl={nextUrl} />
    );
}

function LoginPageContent({ nextUrl }) {
    const router = useRouter();
    const { data: session, status } = useSession();

    // Form state
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authError, setAuthError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Handle authentication state
    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(nextUrl || '/dashboard');
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [status, router, nextUrl]);

    const validateForm = () => {
        const newErrors = {};
        if (!userId.trim()) newErrors.userId = "User ID is required";
        if (!password) newErrors.password = "Password is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const res = await signIn("credentials", {
                userId: userId.trim(),
                password,
                remember,
                redirect: false,
            });

            if (res?.error) {
                setAuthError("Invalid credentials. Please try again.");
            } else {
                // Successful login - will be redirected by the session check
                router.push(nextUrl || "/dashboard");
            }
        } catch (error) {
            console.error("Login error:", error);
            setAuthError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-4">
                    <div className="h-12 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mx-auto"></div>
                    <div className="h-96 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen w-full grid place-items-center p-4 bg-gradient-to-br from-background to-muted/20">
            {/* Back to Home Link */}
            <Link
                href="/"
                className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Home</span>
            </Link>

            <Card className="w-full max-w-md shadow-xl border-border/50">
                <CardHeader className="space-y-1">
                    <div className="text-center">
                        {/* Logo */}
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <span className="text-3xl">🐄</span>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="mt-1">
                            Sign in to Govardhan Goshala Management
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {authError && (
                        <Alert variant="destructive" className="animate-in fade-in">
                            <AlertTitle>Sign in failed</AlertTitle>
                            <AlertDescription>{authError}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="userId" className="block text-sm font-medium">
                                User ID
                            </label>
                            <Input
                                id="userId"
                                type="text"
                                value={userId}
                                onChange={(e) => {
                                    setUserId(e.target.value);
                                    if (errors.userId) setErrors({ ...errors, userId: null });
                                }}
                                placeholder="e.g. admin"
                                autoComplete="username"
                                className={errors.userId ? "border-destructive" : ""}
                                disabled={isSubmitting}
                            />
                            {errors.userId && (
                                <p className="text-sm text-destructive mt-1">{errors.userId}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-destructive mt-1">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm mt-6">
                            <label htmlFor="remember" className="inline-flex items-center gap-2 select-none text-muted-foreground">
                                <Checkbox
                                    id="remember"
                                    checked={remember}
                                    onCheckedChange={(v) => setRemember(Boolean(v))}
                                    disabled={isSubmitting}
                                />
                                Remember me
                            </label>
                            <button
                                type="button"
                                className="text-sm font-medium text-primary hover:underline underline-offset-4"
                                disabled={isSubmitting}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col items-center gap-4 pt-2">
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
