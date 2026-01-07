import type { Tour } from 'onborda/dist/types';

export const onboardingTours: Tour[] = [
    {
        tour: 'admin-welcome',
        steps: [
            {
                icon: '👋',
                title: 'Welcome to hexOS Admin!',
                content: 'Let\'s take a quick look at your high-speed operating system for service delivery.',
                selector: '#sidebar-trigger',
                side: 'right',
            },
            {
                icon: '📊',
                title: 'Business Analytics',
                content: 'Monitor your entire pipeline, financial health, and team performance here.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '🚀',
                title: 'The Pipeline',
                content: 'Manage inquiries from "New" to "Negotiating" and "Committed".',
                selector: '#nav-pipeline',
                side: 'right',
            },
            {
                icon: '💰',
                title: 'Financials',
                content: 'Track revenue, pending payments, and manage invoices and expenses.',
                selector: '#nav-financials',
                side: 'right',
            },
        ],
    },
    {
        tour: 'client-welcome',
        steps: [
            {
                icon: '👋',
                title: 'Welcome to your Dashboard!',
                content: 'We\'ll use this portal to track progress and collaborate on your project.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '📋',
                title: 'Requirements',
                content: 'Fill out these items to help us get started on your project faster.',
                selector: '#nav-requirements',
                side: 'right',
            },
            {
                icon: '💳',
                title: 'Payments',
                content: 'View and pay your invoices securely through our integrated portal.',
                selector: '#nav-payments',
                side: 'right',
            },
        ],
    },
    {
        tour: 'dev-welcome',
        steps: [
            {
                icon: '⚡',
                title: 'Developer Portal',
                content: 'This is where you manage your workload and track progress.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '🔥',
                title: 'Pulse',
                content: 'Keep your streak alive by completing your daily focus tasks.',
                selector: '#nav-pulse',
                side: 'right',
            },
            {
                icon: '⏱️',
                title: 'Time Tracking',
                content: 'Log your hours directly on deliverables to ensure accurate reporting.',
                selector: '#nav-time-reports',
                side: 'right',
            },
        ],
    },
    {
        tour: 'dfy-welcome',
        steps: [
            {
                icon: '🤝',
                title: 'Partner Dashboard',
                content: 'Welcome back! Let\'s check on your client pipeline and earnings.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '💎',
                title: 'Opportunities',
                content: 'Browse our service catalog and find the perfect blueprint for your clients.',
                selector: '#nav-opportunities',
                side: 'right',
            },
            {
                icon: '📈',
                title: 'Commissions',
                content: 'Track your earnings and payout history here.',
                selector: '#nav-commissions',
                side: 'right',
            },
        ],
    },
];
