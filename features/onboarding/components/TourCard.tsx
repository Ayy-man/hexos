"use client";

import type { CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useOnborda } from "onborda";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="relative z-[9999]">
            <Card className="w-[380px] border border-border/50 shadow-2xl bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-ring/10">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 h-1 bg-muted w-full">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>

                <button
                    onClick={closeOnborda}
                    className="absolute top-3 right-3 text-muted-foreground/50 hover:text-foreground p-1 transition-colors rounded-full hover:bg-muted"
                    aria-label="Close tour"
                >
                    <X className="h-4 w-4" />
                </button>

                <CardHeader className="pt-6 pb-2 px-6 flex flex-row items-start gap-4 space-y-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl ring-1 ring-inset ring-primary/20">
                        {step.icon}
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold leading-none tracking-tight text-lg">
                            {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Step {currentStep + 1} of {totalSteps}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="px-6 py-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.content}
                    </p>
                    <div className="mt-2 flex justify-end">
                        {arrow}
                    </div>
                </CardContent>

                <CardFooter className="px-6 pb-6 pt-0 flex justify-between gap-4">
                    <Button
                        onClick={prevStep}
                        variant="ghost"
                        size="sm"
                        className={cn("text-muted-foreground hover:text-foreground pl-0", currentStep === 0 && "invisible")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    <div className="flex gap-2">
                        {currentStep + 1 === totalSteps ? (
                            <Button onClick={closeOnborda} size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
                                Finish Tour
                            </Button>
                        ) : (
                            <Button onClick={nextStep} size="sm" className="shadow-sm">
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};
