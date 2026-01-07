"use client";

import type { CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnborda } from "onborda";
import { X } from "lucide-react";

export const TourCard = ({
    step,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    arrow,
}: CardComponentProps) => {
    const { closeOnborda } = useOnborda();

    return (
        <Card className="w-[350px] shadow-xl border-2 border-primary/20 bg-background relative z-[9999]">
            <div className="absolute -top-3 -left-3 bg-background border rounded-full p-2 shadow-sm text-2xl">
                {step.icon}
            </div>

            <button
                onClick={closeOnborda}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Close tour"
            >
                <X className="h-4 w-4" />
            </button>

            <CardHeader className="pt-8 pb-2">
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                    {currentStep + 1} of {totalSteps}
                </CardDescription>
            </CardHeader>

            <CardContent className="text-sm text-muted-foreground pb-4">
                {step.content}
                <div className="mt-4 flex justify-between items-center">
                    {arrow}
                </div>
            </CardContent>

            <CardFooter className="flex justify-between gap-2 pt-0">
                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <Button onClick={prevStep} variant="outline" size="sm">
                            Previous
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {currentStep + 1 === totalSteps ? (
                        <Button onClick={closeOnborda} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                            Finish
                        </Button>
                    ) : (
                        <Button onClick={nextStep} variant="default" size="sm">
                            Next
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};
