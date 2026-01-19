'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Loader2 } from 'lucide-react';
import { resetOnboardingStatus } from '../actions/onboardingActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface TutorialSettingsProps {
    userId: string;
}

export function TutorialSettings({ userId }: TutorialSettingsProps) {
    const [isResetting, setIsResetting] = useState(false);
    const router = useRouter();

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const result = await resetOnboardingStatus(userId);
            if (result.success) {
                toast.success('Tutorial status reset. Please refresh or navigate to the dashboard.');
                // Navigate or refresh to trigger the tour in OnboardingWrapper
                router.push('/dashboard');
                router.refresh();
            } else {
                toast.error('Failed to reset tutorial status');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Onboarding Tutorial
                </CardTitle>
                <CardDescription>
                    Reset and re-watch the introductory walkthrough for your role.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={handleReset}
                    disabled={isResetting}
                    variant="outline"
                    className="w-full sm:w-auto"
                >
                    {isResetting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting...
                        </>
                    ) : (
                        <>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Watch Tutorial
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
